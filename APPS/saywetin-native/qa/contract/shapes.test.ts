/**
 * Contract layer
 *
 * Locks the API response shape using zod. Any drift breaks here before
 * the mobile app sees it.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { config } from '../config.mjs';

const HealthSchema = z.object({
  status: z.literal('ok'),
});

const StatusSchema = z.object({
  database: z.object({
    connected: z.boolean(),
    schemaReady: z.boolean(),
  }),
  acrcloud: z.object({ configured: z.boolean() }),
  openai: z.object({ configured: z.boolean() }),
});

const RecognizedTrackSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  artist: z.string(),
  album: z.string().nullable().optional(),
  confidenceScore: z.number().nullable().optional(),
  coverArtUrl: z.string().nullable().optional(),
});

const IdentifyByTextOk = z.object({
  success: z.literal(true),
  recognizedTrack: RecognizedTrackSchema,
});

const IdentifyByTextErr = z.object({
  success: z.literal(false).optional(),
  error: z.string().optional(),
  code: z.string().optional(),
});

describe('Contract: response shapes', () => {
  it('/api/health matches schema', async () => {
    const r = await fetch(`${config.apiBase}/api/health`);
    HealthSchema.parse(await r.json());
  });

  it('/api/status matches schema', async () => {
    const r = await fetch(`${config.apiBase}/api/status`);
    StatusSchema.parse(await r.json());
  });

  it('/api/identify-by-text matches success-or-error union', async () => {
    const r = await fetch(`${config.apiBase}/api/identify-by-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'i go love you forever burna boy' }),
    });
    const body = await r.json();
    if (r.status === 200) IdentifyByTextOk.parse(body);
    else IdentifyByTextErr.parse(body);
    expect(true).toBe(true);
  });
});
