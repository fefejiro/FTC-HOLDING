export interface Score {
  id: string;
  device_id: string;
  player_name: string;
  score: number;
  naira: number;
  character: string;
  duration_ms: number;
  created_at: string;
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function fetchTopScores(limit = 100): Promise<Score[]> {
  if (!URL || !KEY) return [];
  try {
    const res = await fetch(
      `${URL}/rest/v1/scores?select=*&order=score.desc&limit=${limit}`,
      {
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          'Accept-Profile': 'gidi_dashers',
        },
        // Static export: revalidate at build time only
        cache: 'no-store',
      }
    );
    if (!res.ok) return [];
    return (await res.json()) as Score[];
  } catch {
    return [];
  }
}
