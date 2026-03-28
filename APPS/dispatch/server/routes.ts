import type { Express } from 'express';
import type { Server } from 'http';
import bcrypt from 'bcryptjs';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { canAccessAdminSurface } from './adminAccess';
import { db } from './db';
import {
  buildRequestNotes,
  matchesRequestMode,
  normalizeDemoSessionId,
  serializeRequest,
} from './demo';
import { getIncidentMonitorInfo } from './monitor';
import { getVapidPublicKey, sendToAllActiveOperators } from './push';
import { incidents, operators, requests } from './schema';
import { sseAdd, sseBroadcast, sseClientCount, sseRemove } from './sse';

export async function registerRoutes(_server: Server, app: Express): Promise<void> {
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

  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    sseAdd(res);
    res.write(': connected\n\n');

    const ping = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(ping);
      }
    }, 25_000);

    req.on('close', () => {
      sseRemove(res);
      clearInterval(ping);
    });
  });

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

  app.post('/api/requests', async (req, res) => {
    const schema = z.object({
      customerName: z.string().min(1),
      customerPhone: z.string().min(1),
      locationLat: z.number().optional(),
      locationLng: z.number().optional(),
      locationAddress: z.string().optional(),
      serviceType: z.enum(['gas', 'lockout', 'jump', 'tire', 'other']),
      notes: z.string().optional(),
      mode: z.enum(['live', 'demo']).optional(),
      demoSessionId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
      return;
    }

    const demoMode = parsed.data.mode === 'demo';
    const demoSessionId = normalizeDemoSessionId(parsed.data.demoSessionId);
    const [request] = await db
      .insert(requests)
      .values({
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        locationLat: parsed.data.locationLat,
        locationLng: parsed.data.locationLng,
        locationAddress: parsed.data.locationAddress,
        serviceType: parsed.data.serviceType,
        notes: buildRequestNotes(parsed.data.notes, { demoMode, demoSessionId }),
      })
      .returning();

    const serializedRequest = serializeRequest(request);
    sseBroadcast('request:new', serializedRequest);

    if (!demoMode) {
      sendToAllActiveOperators({
        title: 'New Roadside Request',
        body: `${parsed.data.serviceType.toUpperCase()} - ${parsed.data.customerName} at ${parsed.data.locationAddress || 'unknown location'}`,
        data: { requestId: request.id, type: parsed.data.serviceType },
      }).catch((err) => console.error('[push] Failed to notify operators:', err));
    }

    res.status(201).json({ ok: true, request: serializedRequest });
  });

  app.get('/api/requests', async (req, res) => {
    const requestedStatus = typeof req.query.status === 'string' ? req.query.status : null;
    const requestedMode =
      req.query.mode === 'demo' ? 'demo' : req.query.mode === 'live' ? 'live' : 'all';
    const demoSessionId =
      typeof req.query.demoSessionId === 'string' ? normalizeDemoSessionId(req.query.demoSessionId) : null;

    const results = await db.select().from(requests).orderBy(desc(requests.createdAt));
    const filtered = results
      .filter((request) => !requestedStatus || request.status === requestedStatus)
      .filter((request) => matchesRequestMode(request, requestedMode, demoSessionId))
      .map((request) => serializeRequest(request));

    res.json(filtered);
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
    if (status === 'en_route' && operatorId) {
      updateValues.operatorId = operatorId;
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

    const serializedRequest = serializeRequest(updated);
    sseBroadcast('request:updated', serializedRequest);
    res.json({ ok: true, request: serializedRequest });
  });

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

    const pinHash = await bcrypt.hash(parsed.data.pin, 10);
    const [operator] = await db
      .insert(operators)
      .values({ name: parsed.data.name, phone: parsed.data.phone, pinHash })
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

    const [operator] = await db.select().from(operators).where(eq(operators.id, parsed.data.operatorId));
    if (!operator || !operator.pinHash) {
      res.status(401).json({ ok: false, error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(parsed.data.pin, operator.pinHash);
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

  app.post('/api/admin/auth', async (req, res) => {
    const schema = z.object({ pin: z.string().min(1) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'PIN required' });
      return;
    }

    const adminPin = process.env.DISPATCH_ADMIN_PIN;
    const proxyKey = process.env.DISPATCH_ADMIN_PROXY_KEY;

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

  app.post('/api/demo-feedback', async (req, res) => {
    const schema = z.object({
      name: z.string().optional(),
      email: z.string().email(),
      overallImpression: z.string().min(4),
      confusing: z.string().min(4),
      trustworthy: z.string().min(4),
      missing: z.string().min(4),
      startedAt: z.number(),
      demoSessionId: z.string().optional(),
      context: z.string().optional(),
      operatorName: z.string().optional(),
      requestId: z.string().optional(),
      completedRequestId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'Invalid feedback payload' });
      return;
    }

    const feedbackOrigin = String(process.env.UNALABS_FEEDBACK_ORIGIN || 'https://unalabs.cloud').replace(/\/+$/, '');
    const demoSessionId = normalizeDemoSessionId(parsed.data.demoSessionId);
    const summary = [
      'Dispatch demo feedback',
      `Overall impression: ${parsed.data.overallImpression}`,
      `What felt confusing: ${parsed.data.confusing}`,
      `What felt trustworthy: ${parsed.data.trustworthy}`,
      `What is missing: ${parsed.data.missing}`,
    ].join('\n');
    const notes = [
      'Source: dispatch-demo',
      parsed.data.context ? `Context: ${parsed.data.context}` : '',
      parsed.data.operatorName ? `Operator: ${parsed.data.operatorName}` : '',
      demoSessionId ? `Demo session: ${demoSessionId}` : '',
      parsed.data.requestId ? `Request: ${parsed.data.requestId}` : '',
      parsed.data.completedRequestId ? `Completed request: ${parsed.data.completedRequestId}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const response = await fetch(`${feedbackOrigin}/api/intake`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          name: parsed.data.name || 'Dispatch demo reviewer',
          email: parsed.data.email,
          projectName: 'Dispatch demo feedback',
          projectType: 'Dispatch demo feedback',
          projectIdea: summary,
          budgetRange: 'not-sure-yet',
          timeline: '',
          notes,
          companyWebsite: '',
          startedAt: parsed.data.startedAt,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        requestId?: string;
      };

      if (!response.ok || !payload.ok) {
        res.status(502).json({
          ok: false,
          error: payload.message || 'Unable to forward demo feedback right now.',
        });
        return;
      }

      res.json({
        ok: true,
        message: payload.message || 'Feedback received.',
        requestId: payload.requestId,
      });
    } catch (error) {
      res.status(502).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Unable to send demo feedback right now.',
      });
    }
  });

  app.patch('/api/requests/:id/assign', async (req, res) => {
    if (!canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const schema = z.object({
      operatorId: z.string().uuid().nullable(),
      accept: z.boolean().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    const updateValues: Record<string, unknown> = { operatorId: parsed.data.operatorId };
    if (parsed.data.accept) {
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

    const serializedRequest = serializeRequest(updated);
    sseBroadcast('request:updated', serializedRequest);
    res.json({ ok: true, request: serializedRequest });
  });

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

    const now = new Date();
    const updateValues: Record<string, unknown> = { status: parsed.data.status };
    if (parsed.data.status === 'accepted') updateValues.acceptedAt = now;
    if (parsed.data.status === 'completed') updateValues.completedAt = now;

    const [updated] = await db
      .update(requests)
      .set(updateValues)
      .where(eq(requests.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    const serializedRequest = serializeRequest(updated);
    sseBroadcast('request:updated', serializedRequest);
    res.json({ ok: true, request: serializedRequest });
  });

  app.get('/api/incidents', async (req, res) => {
    const lim = Math.min(Number(req.query.limit ?? 30), 50);
    const results = await db
      .select()
      .from(incidents)
      .orderBy(desc(incidents.lastUpdated), desc(incidents.createdAt))
      .limit(lim * 3);

    const deduped = results
      .filter((incident, index, all) => {
        const signature = [
          incident.eventType || '',
          incident.roadway || '',
          incident.description || '',
          incident.startDate ? new Date(incident.startDate).toISOString() : '',
        ].join('::');

        return (
          all.findIndex((candidate) => {
            const candidateSignature = [
              candidate.eventType || '',
              candidate.roadway || '',
              candidate.description || '',
              candidate.startDate ? new Date(candidate.startDate).toISOString() : '',
            ].join('::');
            return candidateSignature === signature;
          }) === index
        );
      })
      .slice(0, lim);

    res.json(deduped);
  });

  app.get('/api/geocode/reverse', async (req, res) => {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      res.status(400).json({ error: 'lat and lng are required' });
      return;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        {
          headers: { 'User-Agent': 'dispatch-app/1.0 (mike@unalabs.cloud)' },
        },
      );

      if (!response.ok) {
        res.status(502).json({ error: 'Geocoding service unavailable' });
        return;
      }

      const data = (await response.json()) as {
        display_name?: string;
        address?: {
          city?: string;
          town?: string;
          village?: string;
          state?: string;
          country?: string;
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
    } catch (error) {
      console.error('[geocode] Reverse geocode error:', error);
      res.status(502).json({ error: 'Failed to reverse geocode' });
    }
  });
}
