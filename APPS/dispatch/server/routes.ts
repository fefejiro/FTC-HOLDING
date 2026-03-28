import type { Express } from 'express';
import type { Server } from 'http';
import { db } from './db';
import { operators, requests, incidents } from './schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getVapidPublicKey, sendToAllActiveOperators } from './push';
import { sseAdd, sseRemove, sseBroadcast, sseClientCount } from './sse';
import { getIncidentMonitorInfo } from './monitor';
import { canAccessAdminSurface } from './adminAccess';

export async function registerRoutes(server: Server, app: Express): Promise<void> {
  // Status
  app.get('/api/status', (_req, res) => {
    res.json({
      ok: true,
      service: 'dispatch',
      sseClients: sseClientCount(),
      incidentMonitor: getIncidentMonitorInfo(),
      notifications: {
        webPushConfigured: Boolean(getVapidPublicKey()),
      },
    });
  });

  // ── Server-Sent Events ────────────────────────────────────────────────────
  // Operators connect here on load; all writes broadcast instantly.
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders();

    sseAdd(res);
    res.write(': connected\n\n'); // initial handshake

    // Keepalive ping every 25 s to prevent proxy timeouts
    const ping = setInterval(() => {
      try { res.write(': ping\n\n'); } catch { clearInterval(ping); }
    }, 25_000);

    req.on('close', () => {
      sseRemove(res);
      clearInterval(ping);
    });
  });

  // Push / VAPID
  app.get('/api/push/vapid-key', (_req, res) => {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      res.status(503).json({ error: 'Push not configured' });
      return;
    }
    res.json({ publicKey });
  });

  app.post('/api/push/subscribe', async (req, res) => {
    const schema = z.object({
      operatorId: z.string().uuid(),
      subscription: z.object({
        endpoint: z.string(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid subscription payload' });
      return;
    }

    const { operatorId, subscription } = parsed.data;
    await db.update(operators).set({ vapidSub: subscription }).where(eq(operators.id, operatorId));
    res.json({ ok: true });
  });

  // ── Requests ──────────────────────────────────────────────────────────────

  app.post('/api/requests', async (req, res) => {
    const schema = z.object({
      customerName: z.string().min(1),
      customerPhone: z.string().min(1),
      locationLat: z.number().optional(),
      locationLng: z.number().optional(),
      locationAddress: z.string().optional(),
      serviceType: z.enum(['gas', 'lockout', 'jump', 'tire', 'other']),
      notes: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
      return;
    }

    const [request] = await db.insert(requests).values(parsed.data).returning();

    // SSE — instant update to all connected operator browsers
    sseBroadcast('request:new', request);

    // Push notification (non-blocking)
    sendToAllActiveOperators({
      title: '🚨 New Roadside Request',
      body: `${parsed.data.serviceType.toUpperCase()} — ${parsed.data.customerName} at ${parsed.data.locationAddress || 'unknown location'}`,
      data: { requestId: request.id, type: parsed.data.serviceType },
    }).catch((err) => console.error('[push] Failed to notify operators:', err));

    res.status(201).json({ ok: true, request });
  });

  app.get('/api/requests', async (req, res) => {
    const { status } = req.query;

    if (status && typeof status === 'string') {
      const results = await db
        .select()
        .from(requests)
        .where(eq(requests.status, status as any))
        .orderBy(desc(requests.createdAt));
      res.json(results);
      return;
    }

    const results = await db.select().from(requests).orderBy(desc(requests.createdAt));
    res.json(results);
  });

  app.patch('/api/requests/:id/status', async (req, res) => {
    const { id } = req.params;

    const schema = z.object({
      status: z.enum(['pending', 'accepted', 'en_route', 'completed', 'cancelled']),
      operatorId: z.string().uuid().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid status payload' });
      return;
    }

    const { status, operatorId } = parsed.data;
    const now = new Date();
    const updateValues: Record<string, unknown> = { status };

    if (status === 'accepted') {
      updateValues.acceptedAt = now;
      if (operatorId) updateValues.operatorId = operatorId;
    }
    if (status === 'en_route') {
      if (operatorId) updateValues.operatorId = operatorId;
    }
    if (status === 'completed') {
      updateValues.completedAt = now;
    }

    const [updated] = await db
      .update(requests)
      .set(updateValues)
      .where(eq(requests.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // SSE — push updated job to all connected operators
    sseBroadcast('request:updated', updated);

    res.json({ ok: true, request: updated });
  });

  // ── Operators ─────────────────────────────────────────────────────────────

  app.get('/api/operators', async (_req, res) => {
    const result = await db
      .select({
        id: operators.id,
        name: operators.name,
        phone: operators.phone,
        serviceRadiusKm: operators.serviceRadiusKm,
        active: operators.active,
        createdAt: operators.createdAt,
      })
      .from(operators)
      .where(eq(operators.active, true));
    res.json(result);
  });

  app.post('/api/operators', async (req, res) => {
    if (!canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const schema = z.object({
      name: z.string().min(1),
      phone: z.string().optional(),
      pin: z.string().min(4),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid operator payload' });
      return;
    }

    const { name, phone, pin } = parsed.data;
    const pinHash = await bcrypt.hash(pin, 10);

    const [operator] = await db
      .insert(operators)
      .values({ name, phone, pinHash })
      .returning({
        id: operators.id,
        name: operators.name,
        phone: operators.phone,
        active: operators.active,
        createdAt: operators.createdAt,
      });

    res.status(201).json({ ok: true, operator });
  });

  app.post('/api/operators/auth', async (req, res) => {
    const schema = z.object({
      operatorId: z.string().uuid(),
      pin: z.string(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid auth payload' });
      return;
    }

    const { operatorId, pin } = parsed.data;

    const [operator] = await db.select().from(operators).where(eq(operators.id, operatorId));

    if (!operator || !operator.pinHash) {
      res.status(401).json({ ok: false, error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(pin, operator.pinHash);
    if (!valid) {
      res.status(401).json({ ok: false, error: 'Invalid PIN' });
      return;
    }

    res.json({
      ok: true,
      operator: {
        id: operator.id,
        name: operator.name,
        phone: operator.phone,
        active: operator.active,
      },
    });
  });

  // ── Admin auth ────────────────────────────────────────────────────────────
  // Returns the proxy key on successful PIN validation.
  // Client stores it and sends as x-dispatch-admin-proxy-key on admin requests.
  app.post('/api/admin/auth', async (req, res) => {
    const schema = z.object({ pin: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'PIN required' });
      return;
    }

    const adminPin = process.env.DISPATCH_ADMIN_PIN;
    const proxyKey = process.env.DISPATCH_ADMIN_PROXY_KEY;

    // Local dev: no env vars needed
    if (!adminPin || !proxyKey) {
      const host = String(req.hostname).toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1') {
        res.json({ ok: true, token: null });
        return;
      }
      res.status(503).json({ error: 'Admin auth not configured' });
      return;
    }

    if (parsed.data.pin !== adminPin) {
      res.status(401).json({ ok: false, error: 'Incorrect PIN' });
      return;
    }

    res.json({ ok: true, token: proxyKey });
  });

  // ── Admin: assign operator to a request ───────────────────────────────────
  app.patch('/api/requests/:id/assign', async (req, res) => {
    if (!canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const schema = z.object({
      operatorId: z.string().uuid().nullable(),
      // optionally bump status to accepted when assigning
      accept: z.boolean().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const { operatorId, accept } = parsed.data;
    const updateValues: Record<string, unknown> = { operatorId };
    if (accept) {
      updateValues.status = 'accepted';
      updateValues.acceptedAt = new Date();
    }

    const [updated] = await db
      .update(requests)
      .set(updateValues)
      .where(eq(requests.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    sseBroadcast('request:updated', updated);
    res.json({ ok: true, request: updated });
  });

  // ── Admin: change request status ──────────────────────────────────────────
  app.patch('/api/requests/:id/admin-status', async (req, res) => {
    if (!canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const schema = z.object({
      status: z.enum(['pending', 'accepted', 'en_route', 'completed', 'cancelled']),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    const { status } = parsed.data;
    const now = new Date();
    const updateValues: Record<string, unknown> = { status };
    if (status === 'accepted') updateValues.acceptedAt = now;
    if (status === 'completed') updateValues.completedAt = now;

    const [updated] = await db
      .update(requests)
      .set(updateValues)
      .where(eq(requests.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    sseBroadcast('request:updated', updated);
    res.json({ ok: true, request: updated });
  });

  // ── Ontario 511 incidents ─────────────────────────────────────────────────

  app.get('/api/incidents', async (req, res) => {
    const lim = Math.min(Number(req.query.limit ?? 30), 50);
    const results = await db
      .select()
      .from(incidents)
      .orderBy(desc(incidents.createdAt))
      .limit(lim);
    res.json(results);
  });

  // ── Reverse geocode proxy (Nominatim) ─────────────────────────────────────

  app.get('/api/geocode/reverse', async (req, res) => {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      res.status(400).json({ error: 'lat and lng are required' });
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'dispatch-app/1.0 (mike@unalabs.cloud)' },
      });

      if (!response.ok) {
        res.status(502).json({ error: 'Geocoding service unavailable' });
        return;
      }

      const data = await response.json() as {
        display_name?: string;
        address?: {
          city?: string; town?: string; village?: string;
          state?: string; country?: string;
          road?: string; house_number?: string;
        };
        lat?: string;
        lon?: string;
      };

      const address = data.address || {};
      const city = address.city || address.town || address.village || '';

      res.json({
        displayName: data.display_name || '',
        address: data.display_name || '',
        city,
        state: address.state || '',
        country: address.country || '',
        lat: data.lat || String(lat),
        lng: data.lon || String(lng),
      });
    } catch (err) {
      console.error('[geocode] Reverse geocode error:', err);
      res.status(502).json({ error: 'Failed to reverse geocode' });
    }
  });
}
