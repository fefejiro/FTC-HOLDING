// Lightweight leaderboard client. Optional; fails silently if unconfigured.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export interface ScoreSubmit {
  device_id: string;
  player_name: string;
  score: number;
  naira: number;
  character: string;
  duration_ms: number;
}

export async function submitScore(payload: ScoreSubmit): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Profile': 'gidi_dashers',
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
