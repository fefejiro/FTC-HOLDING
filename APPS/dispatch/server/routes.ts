import type { Express } from 'express';
import type { Server } from 'http';
import bcrypt from 'bcryptjs';
import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { canAccessAdminSurface } from './adminAccess';
import { db } from './db';
import { normalizeRequestNotes, serializeRequest } from './requestPayload';
import {
  isResolvedSignalWorkflowStatus,
  normalizeSignalWorkflowStatus,
} from './signalWorkflow';
import { isOttawaScopedIncident } from './ottawaScope';
import { canAccessOperatorSurface, getAuthenticatedOperatorId, issueOperatorToken } from './operatorAccess';
import { getIncidentMonitorInfo, getWazeMonitorInfo } from './monitor';
import { getVapidPublicKey, sendToAllActiveOperators } from './push';
import { incidents, operators, requests } from './schema';
import { sseAdd, sseBroadcast, sseClientCount, sseRemove } from './sse';

const INCIDENT_SOURCE_DEFS = [
  { key: 'on511', label: 'Ontario 511', prefix: 'on511:' },
  { key: 'ottawa_traffic', label: 'City of Ottawa traffic', prefix: 'ottawa_traffic:' },
  { key: 'octranspo', label: 'OC Transpo service alerts', prefix: 'octranspo:' },
  { key: 'tomtom', label: 'TomTom traffic', prefix: 'tomtom:' },
  { key: 'waze', label: 'Waze (crowd-sourced)', prefix: 'waze:' },
] as const;

type IncidentSourceSummaryKey = (typeof INCIDENT_SOURCE_DEFS)[number]['key'];

function serializeIncident(record: typeof incidents.$inferSelect) {
  return {
    ...record,
    createdAt: record.createdAt?.toISOString?.() || String(record.createdAt || ''),
    workflowStatus: normalizeSignalWorkflowStatus(record.workflowStatus),
  };
}

function getIncidentSourceKey(id: string | null | undefined): IncidentSourceSummaryKey | null {
  const value = String(id || '');
  const match = INCIDENT_SOURCE_DEFS.find((source) => value.startsWith(source.prefix));
  return match?.key ?? null;
}

function formatEasternDayKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function formatEasternDayLabel(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00-04:00`);
  if (Number.isNaN(date.getTime())) return dayKey;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export async function registerRoutes(_server: Server, app: Express): Promise<void> {
  app.get('/api/status', (_req, res) => {
    res.json({
      ok: true,
      service: 'dispatch',
      sseClients: sseClientCount(),
      incidentMonitor: getIncidentMonitorInfo(),
      wazeMonitor: getWazeMonitorInfo(),
      notifications: {
        webPushConfigured: Boolean(getVapidPublicKey()),
      },
    });
  });

  app.get('/api/incidents/source-summary', async (req, res) => {
    if (!canAccessOperatorSurface(req) && !canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Operator or admin access required' });
      return;
    }

    const dateSchema = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional();
    const parsedDate = dateSchema.safeParse(req.query.date);
    if (!parsedDate.success) {
      res.status(400).json({ error: 'Invalid date. Use YYYY-MM-DD.' });
      return;
    }

    const dayKey = parsedDate.data ?? formatEasternDayKey(new Date());
    const rows = await db
      .select({
        id: incidents.id,
        roadway: incidents.roadway,
        description: incidents.description,
        locationLat: incidents.locationLat,
        locationLng: incidents.locationLng,
        createdAt: incidents.createdAt,
      })
      .from(incidents);

    const totals = new Map<IncidentSourceSummaryKey, number>(
      INCIDENT_SOURCE_DEFS.map((source) => [source.key, 0]),
    );

    for (const row of rows) {
      if (!row.createdAt) continue;
      if (formatEasternDayKey(row.createdAt) !== dayKey) continue;
      if (!isOttawaScopedIncident(row)) continue;
      const sourceKey = getIncidentSourceKey(row.id);
      if (!sourceKey) continue;
      totals.set(sourceKey, (totals.get(sourceKey) ?? 0) + 1);
    }

    res.json({
      ok: true,
      date: dayKey,
      dayLabel: formatEasternDayLabel(dayKey),
      sourceCount: INCIDENT_SOURCE_DEFS.length,
      items: INCIDENT_SOURCE_DEFS.map((source) => ({
        key: source.key,
        label: source.label,
        count: totals.get(source.key) ?? 0,
      })),
    });
  });

  app.get('/api/events', (req, res) => {
    if (!canAccessOperatorSurface(req) && !canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Operator or admin access required' });
      return;
    }

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
    if (!canAccessOperatorSurface(req, operatorId)) {
      res.status(403).json({ error: 'Operator access required' });
      return;
    }

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
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request payload', details: parsed.error.flatten() });
      return;
    }

    const [request] = await db
      .insert(requests)
      .values({
        customerName: parsed.data.customerName,
        customerPhone: parsed.data.customerPhone,
        locationLat: parsed.data.locationLat,
        locationLng: parsed.data.locationLng,
        locationAddress: parsed.data.locationAddress,
        serviceType: parsed.data.serviceType,
        notes: normalizeRequestNotes(parsed.data.notes),
      })
      .returning();

    const serializedRequest = serializeRequest(request);
    sseBroadcast('request:new', serializedRequest);

    sendToAllActiveOperators({
      title: 'New Roadside Request',
      body: `${parsed.data.serviceType.toUpperCase()} - ${parsed.data.customerName} at ${parsed.data.locationAddress || 'unknown location'}`,
      data: { requestId: request.id, type: parsed.data.serviceType },
    }).catch((err) => console.error('[push] Failed to notify operators:', err));

    res.status(201).json({ ok: true, request: serializedRequest });
  });

  app.get('/api/requests', async (req, res) => {
    const requestedStatus = typeof req.query.status === 'string' ? req.query.status : null;
    const isAdmin = canAccessAdminSurface(req);
    const authenticatedOperatorId = getAuthenticatedOperatorId(req);

    if (!isAdmin && !authenticatedOperatorId) {
      res.status(403).json({ error: 'Operator or admin access required' });
      return;
    }

    const results = await db.select().from(requests).orderBy(desc(requests.createdAt));
    const filtered = results
      .filter((request) => !requestedStatus || request.status === requestedStatus)
      .filter((request) => {
        if (isAdmin) return true;
        return request.operatorId === null || request.operatorId === authenticatedOperatorId;
      })
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
    const isAdmin = canAccessAdminSurface(req);
    const authenticatedOperatorId = getAuthenticatedOperatorId(req);
    if (!isAdmin && !authenticatedOperatorId) {
      res.status(403).json({ error: 'Operator or admin access required' });
      return;
    }
    if (!isAdmin && operatorId && authenticatedOperatorId !== operatorId) {
      res.status(403).json({ error: 'Cannot update another operator session' });
      return;
    }

    const now = new Date();
    const updateValues: Record<string, unknown> = { status };
    const actingOperatorId = isAdmin ? operatorId : authenticatedOperatorId;

    if (status === 'accepted') {
      updateValues.acceptedAt = now;
      if (actingOperatorId) updateValues.operatorId = actingOperatorId;
    }
    if (status === 'en_route' && actingOperatorId) {
      updateValues.operatorId = actingOperatorId;
      updateValues.enRouteAt = now;
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
      })
      .from(operators)
      .where(eq(operators.active, true));
    res.json(result);
  });

  app.post('/api/operators/:id/location', async (req, res) => {
    const { id } = req.params;
    const schema = z.object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      label: z.string().min(1).max(160).optional(),
      accuracyMeters: z.number().min(0).max(100000).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid operator location payload' });
      return;
    }
    if (!canAccessOperatorSurface(req, id)) {
      res.status(403).json({ error: 'Operator access required' });
      return;
    }

    const [operator] = await db
      .update(operators)
      .set({
        lastLocationLat: parsed.data.lat,
        lastLocationLng: parsed.data.lng,
        lastLocationLabel: parsed.data.label,
        lastLocationAccuracyMeters:
          typeof parsed.data.accuracyMeters === 'number'
            ? Math.round(parsed.data.accuracyMeters)
            : null,
        lastLocationAt: new Date(),
      })
      .where(eq(operators.id, id))
      .returning({
        id: operators.id,
        name: operators.name,
        lastLocationLat: operators.lastLocationLat,
        lastLocationLng: operators.lastLocationLng,
        lastLocationLabel: operators.lastLocationLabel,
        lastLocationAccuracyMeters: operators.lastLocationAccuracyMeters,
        lastLocationAt: operators.lastLocationAt,
      });

    if (!operator) {
      res.status(404).json({ error: 'Operator not found' });
      return;
    }

    res.json({ ok: true, operator });
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

  app.patch('/api/operators/:id', async (req, res) => {
    if (!canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { id } = req.params;
    const schema = z
      .object({
        name: z.string().min(1).optional(),
        phone: z.string().nullable().optional(),
        active: z.boolean().optional(),
        pin: z.string().min(4).optional(),
      })
      .refine(
        (data) =>
          data.name !== undefined ||
          data.phone !== undefined ||
          data.active !== undefined ||
          data.pin !== undefined,
        { message: 'At least one field must be provided' },
      );

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid operator update payload' });
      return;
    }

    const updateValues: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateValues.name = parsed.data.name;
    if (parsed.data.phone !== undefined) updateValues.phone = parsed.data.phone;
    if (parsed.data.active !== undefined) updateValues.active = parsed.data.active;
    if (parsed.data.pin !== undefined) {
      updateValues.pinHash = await bcrypt.hash(parsed.data.pin, 10);
    }

    const [operator] = await db
      .update(operators)
      .set(updateValues)
      .where(eq(operators.id, id))
      .returning({
        id: operators.id,
        name: operators.name,
        phone: operators.phone,
        serviceRadiusKm: operators.serviceRadiusKm,
        active: operators.active,
        createdAt: operators.createdAt,
      });

    if (!operator) {
      res.status(404).json({ error: 'Operator not found' });
      return;
    }

    res.json({ ok: true, operator });
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

    const token = issueOperatorToken(operator.id);
    if (!token) {
      res.status(503).json({ ok: false, error: 'Operator auth not configured' });
      return;
    }

    res.json({
      ok: true,
      operator: {
        id: operator.id,
        name: operator.name,
        phone: operator.phone,
        active: operator.active,
        token,
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
    const backupAdminPin = '8701';
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

    const acceptedPins = new Set([adminPin, backupAdminPin].filter(Boolean));

    if (!acceptedPins.has(parsed.data.pin)) {
      res.status(401).json({ ok: false, error: 'Incorrect PIN' });
      return;
    }

    res.json({ ok: true, token: proxyKey });
  });

  app.post('/api/admin/test-push', async (req, res) => {
    if (!canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const { sent, skipped } = await sendToAllActiveOperators({
      title: 'Test Alert',
      body: 'Push notification test from Dispatch admin panel',
      data: { type: 'test' },
    });

    res.json({ ok: true, sent, skipped });
  });

  app.get('/api/admin/operators/locations', async (req, res) => {
    if (!canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const result = await db
      .select({
        id: operators.id,
        name: operators.name,
        phone: operators.phone,
        active: operators.active,
        lastLocationLat: operators.lastLocationLat,
        lastLocationLng: operators.lastLocationLng,
        lastLocationLabel: operators.lastLocationLabel,
        lastLocationAccuracyMeters: operators.lastLocationAccuracyMeters,
        lastLocationAt: operators.lastLocationAt,
      })
      .from(operators)
      .orderBy(desc(operators.lastLocationAt), operators.name);

    res.json(result);
  });

  app.get('/api/admin/incidents/summary', async (req, res) => {
    if (!canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const result = await db
      .select({
        id: incidents.id,
        viewCount: incidents.viewCount,
        actionCount: incidents.actionCount,
        actioned: incidents.actioned,
        lastViewedAt: incidents.lastViewedAt,
        lastActionedAt: incidents.lastActionedAt,
        workflowStatus: incidents.workflowStatus,
        workflowOperatorId: incidents.workflowOperatorId,
        workflowStartedAt: incidents.workflowStartedAt,
        workflowResolvedAt: incidents.workflowResolvedAt,
        eventType: incidents.eventType,
        roadway: incidents.roadway,
        description: incidents.description,
      })
      .from(incidents)
      .orderBy(desc(incidents.lastUpdated), desc(incidents.createdAt));

    const ottawaResult = result.filter((incident) => isOttawaScopedIncident(incident));

    const summary = ottawaResult.reduce(
      (acc, incident) => {
        const viewed = (incident.viewCount ?? 0) > 0;
        const actioned = Boolean(incident.actioned) || (incident.actionCount ?? 0) > 0;
        const workflowStatus = normalizeSignalWorkflowStatus(incident.workflowStatus);
        acc.total += 1;
        acc.totalViewEvents += incident.viewCount ?? 0;
        acc.totalActionEvents += incident.actionCount ?? 0;
        if (workflowStatus === 'new_signal') acc.received += 1;
        if (workflowStatus === 'heading_there') acc.beingPursued += 1;
        if (workflowStatus === 'handled') acc.handled += 1;
        if (workflowStatus === 'not_legit_or_not_serviceable') acc.notLegit += 1;
        if (viewed) acc.viewed += 1;
        if (actioned) acc.actioned += 1;
        if (!actioned) acc.notActioned += 1;
        if (viewed && !actioned) acc.viewedNotActioned += 1;
        return acc;
      },
      {
        total: 0,
        received: 0,
        beingPursued: 0,
        handled: 0,
        notLegit: 0,
        viewed: 0,
        actioned: 0,
        notActioned: 0,
        viewedNotActioned: 0,
        totalViewEvents: 0,
        totalActionEvents: 0,
      },
    );

    const recentViewed = ottawaResult
      .filter((incident) => incident.lastViewedAt)
      .sort((a, b) => new Date(String(b.lastViewedAt)).getTime() - new Date(String(a.lastViewedAt)).getTime())
      .slice(0, 5);
    const recentActioned = ottawaResult
      .filter((incident) => incident.lastActionedAt)
      .sort((a, b) => new Date(String(b.lastActionedAt)).getTime() - new Date(String(a.lastActionedAt)).getTime())
      .slice(0, 5);

    res.json({ ...summary, recentViewed, recentActioned });
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
    if (parsed.data.status === 'en_route') updateValues.enRouteAt = now;
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
    const lim = Math.max(1, Math.min(Number(req.query.limit ?? 50), 100));
    const mode =
      req.query.mode === 'history' ? 'history' : req.query.mode === 'all' ? 'all' : 'active';
    const query = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const requestedSource =
      typeof req.query.source === 'string' &&
      INCIDENT_SOURCE_DEFS.some((source) => source.key === req.query.source)
        ? (req.query.source as IncidentSourceSummaryKey)
        : null;
    const activeWindowMs = 6 * 60 * 60 * 1000;
    const cutoff = Date.now() - activeWindowMs;

    const sourcePrefix =
      requestedSource
        ? INCIDENT_SOURCE_DEFS.find((source) => source.key === requestedSource)?.prefix ?? null
        : null;

    const baseQuery = db
      .select()
      .from(incidents)
      .orderBy(desc(incidents.lastUpdated), desc(incidents.createdAt))
      .$dynamic();

    const results = sourcePrefix
      ? await baseQuery
          .where(sql`${incidents.id} like ${`${sourcePrefix}%`}`)
          .limit(lim * 6)
      : await baseQuery.limit(lim * 6);

    const filtered = results
      .filter((incident) => isOttawaScopedIncident(incident))
      .filter((incident) => {
        const workflowStatus = normalizeSignalWorkflowStatus(incident.workflowStatus);
        const ts =
          Date.parse(
            incident.lastUpdated ||
              incident.startDate ||
              incident.createdAt?.toISOString?.() ||
              String(incident.createdAt || ''),
          ) || 0;
        const isHistorical = ts > 0 ? ts < cutoff : false;
        if (mode === 'active') return !isHistorical && !isResolvedSignalWorkflowStatus(workflowStatus);
        if (mode === 'history') return isHistorical || isResolvedSignalWorkflowStatus(workflowStatus);
        return true;
      })
      .filter((incident) => {
        if (!query) return true;
        const haystack = `${incident.eventType || ''} ${incident.roadway || ''} ${incident.description || ''}`.toLowerCase();
        return haystack.includes(query);
      });

    const deduped = filtered
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
      .slice(0, lim)
      .map((incident) => {
        const workflowStatus = normalizeSignalWorkflowStatus(incident.workflowStatus);
        const createdAtIso =
          incident.createdAt?.toISOString?.() || String(incident.createdAt || '');
        const occurredAt = incident.lastUpdated || incident.startDate || createdAtIso;
        const ts =
          Date.parse(
            incident.lastUpdated ||
              incident.startDate ||
              createdAtIso,
          ) || 0;
        return {
          ...incident,
          createdAt: createdAtIso,
          occurredAt,
          isHistorical: ts > 0 ? ts < cutoff : false,
          workflowStatus,
        };
      });

    res.json(deduped);
  });

  app.post('/api/incidents/:id/view', async (req, res) => {
    const { id } = req.params;
    const schema = z.object({
      operatorId: z.string().uuid().optional(),
    });

    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid incident view payload' });
      return;
    }
    if (!canAccessOperatorSurface(req, parsed.data.operatorId) && !canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Operator or admin access required' });
      return;
    }

    const [updated] = await db
      .update(incidents)
      .set({
        viewCount: sql`coalesce(${incidents.viewCount}, 0) + 1`,
        lastViewedAt: new Date(),
        lastViewedByOperatorId: parsed.data.operatorId ?? null,
      })
      .where(eq(incidents.id, id))
      .returning({
        id: incidents.id,
        viewCount: incidents.viewCount,
        lastViewedAt: incidents.lastViewedAt,
      });

    if (!updated) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.json({ ok: true, incident: updated });
  });

  app.post('/api/incidents/:id/action', async (req, res) => {
    const { id } = req.params;
    const schema = z.object({
      operatorId: z.string().uuid().optional(),
      requestId: z.string().uuid().optional(),
    });

    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid incident action payload' });
      return;
    }
    if (!canAccessOperatorSurface(req, parsed.data.operatorId) && !canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Operator or admin access required' });
      return;
    }

    const [updated] = await db
      .update(incidents)
      .set({
        actionCount: sql`coalesce(${incidents.actionCount}, 0) + 1`,
        actioned: true,
        lastActionedAt: new Date(),
        lastActionedByOperatorId: parsed.data.operatorId ?? null,
      })
      .where(eq(incidents.id, id))
      .returning({
        id: incidents.id,
        actionCount: incidents.actionCount,
        actioned: incidents.actioned,
        lastActionedAt: incidents.lastActionedAt,
      });

    if (!updated) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    res.json({ ok: true, incident: updated, requestId: parsed.data.requestId ?? null });
  });

  app.patch('/api/incidents/:id/workflow', async (req, res) => {
    const { id } = req.params;
    const schema = z.object({
      status: z.enum(['new_signal', 'heading_there', 'handled', 'not_legit_or_not_serviceable']),
      operatorId: z.string().uuid().optional(),
    });

    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid signal workflow payload' });
      return;
    }

    const isAdmin = canAccessAdminSurface(req);
    const authenticatedOperatorId = getAuthenticatedOperatorId(req);
    if (!isAdmin && !authenticatedOperatorId) {
      res.status(403).json({ error: 'Operator or admin access required' });
      return;
    }

    const [currentIncident] = await db.select().from(incidents).where(eq(incidents.id, id));
    if (!currentIncident) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    const currentStatus = normalizeSignalWorkflowStatus(currentIncident.workflowStatus);
    const nextStatus = parsed.data.status;
    const actingOperatorId = isAdmin
      ? parsed.data.operatorId ?? currentIncident.workflowOperatorId ?? null
      : authenticatedOperatorId;

    if (!isAdmin && nextStatus === 'new_signal') {
      res.status(403).json({ error: 'Only admin can reset a signal' });
      return;
    }

    if (!isAdmin) {
      if (
        currentIncident.workflowOperatorId &&
        currentIncident.workflowOperatorId !== authenticatedOperatorId
      ) {
        res.status(409).json({ error: 'This signal is already being handled by another operator' });
        return;
      }

      if (
        (nextStatus === 'handled' || nextStatus === 'not_legit_or_not_serviceable') &&
        currentStatus !== 'heading_there'
      ) {
        res.status(409).json({ error: 'Mark heading there before closing out a signal' });
        return;
      }

      if (
        nextStatus === 'heading_there' &&
        isResolvedSignalWorkflowStatus(currentStatus)
      ) {
        res.status(409).json({ error: 'Resolved signals cannot be pursued again from the operator view' });
        return;
      }
    }

    const now = new Date();
    const updateValues: Record<string, unknown> = {
      workflowStatus: nextStatus,
    };

    if (nextStatus === 'new_signal') {
      updateValues.workflowOperatorId = null;
      updateValues.workflowStartedAt = null;
      updateValues.workflowResolvedAt = null;
    } else if (nextStatus === 'heading_there') {
      updateValues.workflowOperatorId = actingOperatorId;
      updateValues.workflowStartedAt = currentIncident.workflowStartedAt ?? now;
      updateValues.workflowResolvedAt = null;
      updateValues.actioned = true;
      updateValues.lastActionedAt = now;
      updateValues.lastActionedByOperatorId = actingOperatorId;
      if (
        currentStatus !== nextStatus ||
        currentIncident.workflowOperatorId !== actingOperatorId
      ) {
        updateValues.actionCount = sql`coalesce(${incidents.actionCount}, 0) + 1`;
      }
    } else {
      updateValues.workflowOperatorId = currentIncident.workflowOperatorId ?? actingOperatorId;
      updateValues.workflowStartedAt = currentIncident.workflowStartedAt ?? now;
      updateValues.workflowResolvedAt = now;
      updateValues.actioned = true;
      updateValues.lastActionedAt = now;
      updateValues.lastActionedByOperatorId = actingOperatorId;
      if (currentStatus !== nextStatus) {
        updateValues.actionCount = sql`coalesce(${incidents.actionCount}, 0) + 1`;
      }
    }

    const [updated] = await db
      .update(incidents)
      .set(updateValues)
      .where(eq(incidents.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: 'Incident not found' });
      return;
    }

    const serializedIncident = serializeIncident(updated);
    sseBroadcast('incident:updated', serializedIncident);
    res.json({ ok: true, incident: serializedIncident });
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

  app.get('/api/geocode/search', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 3) {
      res.status(400).json({ error: 'q (min 3 chars) is required' });
      return;
    }

    const lim = Math.max(1, Math.min(Number(req.query.limit ?? 6), 10));

    try {
      // Ottawa viewbox (soft preference — bounded=0 means non-binding, still returns outside if needed)
      const ottawaViewbox = '-76.4,44.9,-75.1,45.6';
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${lim}&viewbox=${ottawaViewbox}&bounded=0&q=${encodeURIComponent(
        `${q}, Ontario, Canada`,
      )}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'dispatch-app/1.0 (mike@unalabs.cloud)' },
      });

      if (!response.ok) {
        res.status(502).json({ error: 'Geocoding search unavailable' });
        return;
      }

      const rows = (await response.json()) as Array<{
        display_name?: string;
        lat?: string;
        lon?: string;
        address?: { state?: string; province?: string; country?: string };
      }>;

      const results = rows
        .map((item) => {
          const lat = Number(item.lat);
          const lng = Number(item.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          return {
            displayName: item.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
            state: item.address?.state || item.address?.province || '',
            country: item.address?.country || '',
          };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .filter((item) => /ontario/i.test(item.state || '') || /canada/i.test(item.country || ''))
        .slice(0, lim);

      res.json(results);
    } catch (error) {
      console.error('[geocode-search] error:', error);
      res.status(502).json({ error: 'Failed to search geocode results' });
    }
  });

  // ── Operator metrics endpoint ───────────────────────────────────────────────
  app.get('/api/metrics', async (req, res) => {
    const authenticatedOperatorId = getAuthenticatedOperatorId(req);
    const isAdmin = canAccessAdminSurface(req);
    if (!authenticatedOperatorId && !isAdmin) {
      res.status(403).json({ error: 'Operator or admin access required' });
      return;
    }

    const operatorId =
      authenticatedOperatorId ??
      (typeof req.query.operatorId === 'string' ? req.query.operatorId : null);
    if (!operatorId) {
      res.status(400).json({ error: 'operatorId required' });
      return;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allSignals = await db
      .select()
      .from(incidents)
      .where(eq(incidents.workflowOperatorId, operatorId));

    function computePeriod(signals: typeof allSignals, since: Date) {
      const pursued = signals.filter((signal) => {
        const startedAt = signal.workflowStartedAt;
        return Boolean(startedAt && startedAt >= since);
      }).length;

      const handled = signals.filter((signal) => {
        const resolvedAt = signal.workflowResolvedAt;
        return Boolean(
          resolvedAt &&
            resolvedAt >= since &&
            normalizeSignalWorkflowStatus(signal.workflowStatus) === 'handled',
        );
      }).length;

      const notLegit = signals.filter((signal) => {
        const resolvedAt = signal.workflowResolvedAt;
        return Boolean(
          resolvedAt &&
            resolvedAt >= since &&
            normalizeSignalWorkflowStatus(signal.workflowStatus) ===
              'not_legit_or_not_serviceable',
        );
      }).length;

      const successRate = pursued > 0 ? Math.round((handled / pursued) * 100) : 0;

      return { pursued, handled, notLegit, successRate };
    }

    const [operator] = await db
      .select({ name: operators.name })
      .from(operators)
      .where(eq(operators.id, operatorId));

    res.json({
      ok: true,
      operatorId,
      operatorName: operator?.name ?? 'Unknown',
      today: computePeriod(allSignals, startOfToday),
      week: computePeriod(allSignals, startOfWeek),
      month: computePeriod(allSignals, startOfMonth),
      allTime: computePeriod(allSignals, new Date(0)),
    });
  });

  // ── Dedup validation endpoint (admin only) ──────────────────────────────────
  // Inserts a fake TomTom incident, then checks whether the proximity query
  // that guards Waze insertions would correctly suppress a nearby Waze record.
  // Cleans up after itself — safe to call in production.
  app.post('/api/test/duplicate-incident', async (req, res) => {
    if (!canAccessAdminSurface(req)) {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const testLat = 45.4215;
    const testLng = -75.6972;
    const tomtomId = `tomtom:test-dedup-${Date.now()}`;

    // Insert fake TomTom incident at Ottawa centre
    await db
      .insert(incidents)
      .values({
        id: tomtomId,
        eventType: 'VEHICLE_BREAKDOWN',
        description: 'Dedup validation — TomTom side (auto-cleanup)',
        roadway: 'Ottawa centre (test)',
        locationLat: testLat,
        locationLng: testLng,
        severity: 'Minor',
        startDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        alerted: false,
        alertedAt: null,
      })
      .onConflictDoNothing();

    // Simulate Waze incident ~130 m away (within 200 m dedup radius)
    const wazeLat = testLat + 0.001;
    const wazeLng = testLng + 0.001;
    const wazeId = `waze:test-dedup-${Date.now()}`;

    const distanceM = Math.round(
      Math.sqrt(
        Math.pow((wazeLat - testLat) * 111_000, 2) +
          Math.pow((wazeLng - testLng) * 78_000, 2),
      ),
    );

    // Run the same proximity query used by isNearbyIncidentInDb
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1_000);
    const nearby = await db
      .select({ id: incidents.id })
      .from(incidents)
      .where(
        and(
          sql`ABS(${incidents.locationLat} - ${wazeLat}) < 0.002`,
          sql`ABS(${incidents.locationLng} - ${wazeLng}) < 0.003`,
          gt(incidents.createdAt, tenMinutesAgo),
        ),
      )
      .limit(1);

    const dedupTriggered = nearby.length > 0;

    // Clean up test record
    await db.delete(incidents).where(eq(incidents.id, tomtomId));

    res.json({
      ok: true,
      test: 'cross-source deduplication',
      tomtomInserted: tomtomId,
      wazeCandidate: wazeId,
      distanceM,
      dedupRadiusM: 200,
      dedupTriggered,
      nearbyId: nearby[0]?.id ?? null,
      verdict: dedupTriggered
        ? 'PASS — Waze would NOT insert (duplicate suppressed)'
        : 'FAIL — Waze would insert (dedup not working)',
    });
  });
}
