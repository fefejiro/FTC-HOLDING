import axios from 'axios';
import { getAiClient, getAiProviderConfig, isAiConfigured } from './lib/ai-config';

const LYRICS_OVH_BASE_URL = 'https://api.lyrics.ovh/v1';

function getGeniusApiKey(): string | undefined {
  return process.env.GENIUS_API_KEY;
}

export interface MusixmatchLyricsResult {
  success: boolean;
  errorMessage?: string;
  lyrics?: {
    fullText: string;
    language: string;
    copyright?: string;
    trackId?: number;
    syncedLyrics?: string | null;
  };
  rawResponse?: any;
}

function cleanSongData(title: string, artist: string) {
  const cleanTitle = title
    .replace(/\s*\([^)]*(?:remix|danz|edit|version|mix|odo|odoyewu)\)/gi, '')
    .replace(/\s*\[[^\]]*(?:remix|danz|edit|version|mix)\]/gi, '')
    .trim();
  
  const cleanArtist = artist
    .replace(/\s*fka\s+.*/i, '')
    .replace(/[\/&,]/g, ' ')
    .trim();
  
  return { cleanTitle, cleanArtist };
}

function detectLanguage(lyricsText: string): string {
  if (/\b(na|sef|dey|go|wan|make|wetin|wahala)\b/i.test(lyricsText)) {
    return 'pcm';
  } else if (/\b(nwa|chi|obi|ife|udo)\b/i.test(lyricsText)) {
    return 'ig';
  } else if (/\b(omo|ati|ni|se|wa|e be)\b/i.test(lyricsText)) {
    return 'yo';
  } else if (/\b(wena|yebo|sawubona|mina)\b/i.test(lyricsText)) {
    return 'zu';
  }
  return 'en';
}

async function searchGeniusWithClient(title: string, artist: string): Promise<string | null> {
  const geniusKey = getGeniusApiKey();
  if (!geniusKey) return null;
  
  try {
    const { cleanTitle, cleanArtist } = cleanSongData(title, artist);
    const mainArtist = artist.split(',')[0].trim();
    const baseTitleNoFeat = title.replace(/\s*\(feat\.[^)]*\)/gi, '').trim();
    
    const searchQueries = [
      `${baseTitleNoFeat} ${mainArtist}`,
      `${cleanTitle} ${cleanArtist}`,
      baseTitleNoFeat,
    ];
    
    for (const query of searchQueries) {
      console.log(`🎤 [Genius] Searching: "${query}"`);
      try {
        const searchResponse = await axios.get('https://api.genius.com/search', {
          params: { q: query },
          headers: { 'Authorization': `Bearer ${geniusKey}` },
          timeout: 5000,
        });
        
        if (searchResponse.data?.error === 'invalid_token') {
          console.error(`❌ [Genius] API key is invalid/expired! Skipping Genius entirely.`);
          return null;
        }
        
        const hits = searchResponse.data?.response?.hits;
        if (!hits || hits.length === 0) continue;
        
        const song = hits[0].result;
        console.log(`🎤 [Genius] Found: "${song.title}" by ${song.primary_artist?.name || 'Unknown'}`);
        
        const lyricsUrl = song.url;
        if (!lyricsUrl) continue;
        
        await new Promise(r => setTimeout(r, 300));
        
        const pageResponse = await axios.get(lyricsUrl, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        
        const html = pageResponse.data as string;
        
        const lyricsMatches: string[] = [];
        const containerRegex = /data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/g;
        let match;
        while ((match = containerRegex.exec(html)) !== null) {
          lyricsMatches.push(match[1]);
        }
        
        if (lyricsMatches.length > 0) {
          const lyrics = lyricsMatches.join('\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#x27;/g, "'")
            .replace(/&#39;/g, "'")
            .trim();
          
          if (lyrics.length > 50) {
            console.log(`✅ [Genius] Got lyrics (${lyrics.length} chars)`);
            return lyrics;
          }
        }
        
        console.log(`[Genius] Could not extract lyrics from page for "${song.title}"`);
      } catch (searchErr: any) {
        const status = searchErr.response?.status;
        console.log(`[Genius] Search "${query}" failed: ${status || searchErr.message}`);
        if (status === 403 || status === 429) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }
    return null;
  } catch (err: any) {
    console.error('[Genius] Client error:', err.message);
    return null;
  }
}

async function searchLRCLIB(title: string, artist: string): Promise<{ plain: string; synced: string | null } | null> {
  const mainArtist = artist.split(',')[0].trim();
  const baseTitleNoFeat = title.replace(/\s*\(feat\.[^)]*\)/gi, '').trim();
  
  const attempts = [
    { track_name: baseTitleNoFeat, artist_name: mainArtist },
    { track_name: title, artist_name: artist },
    { track_name: baseTitleNoFeat, artist_name: artist },
  ];
  
  for (const params of attempts) {
    try {
      console.log(`📀 [LRCLIB] Trying: "${params.track_name}" by ${params.artist_name}`);
      const response = await axios.get('https://lrclib.net/api/get', {
        params,
        headers: { 'User-Agent': 'Saywetin/1.0 (https://saywetin.app)' },
        timeout: 3000,
      });
      
      const data = response.data;
      if (data?.plainLyrics && data.plainLyrics.length > 50) {
        console.log(`✅ [LRCLIB] Found lyrics (${data.plainLyrics.length} chars, synced: ${!!data.syncedLyrics})`);
        return { plain: data.plainLyrics, synced: data.syncedLyrics || null };
      }
    } catch (err: any) {
      if (err.response?.status === 404) continue;
      console.log(`[LRCLIB] Error: ${err.message}`);
    }
  }

  try {
    console.log(`📀 [LRCLIB] Trying search fallback for: "${baseTitleNoFeat}" by ${mainArtist}`);
    const searchResponse = await axios.get('https://lrclib.net/api/search', {
      params: { q: `${baseTitleNoFeat} ${mainArtist}` },
      headers: { 'User-Agent': 'Saywetin/1.0 (https://saywetin.app)' },
      timeout: 3000,
    });
    
    const results = searchResponse.data;
    if (Array.isArray(results) && results.length > 0) {
      const best = results.find((r: any) => r.plainLyrics && r.plainLyrics.length > 50);
      if (best) {
        console.log(`✅ [LRCLIB] Found via search (${best.plainLyrics.length} chars, synced: ${!!best.syncedLyrics})`);
        return { plain: best.plainLyrics, synced: best.syncedLyrics || null };
      }
    }
  } catch (err: any) {
    console.log(`[LRCLIB] Search error: ${err.message}`);
  }
  
  return null;
}

async function searchLyricsOvh(title: string, artist: string): Promise<string | null> {
  try {
    const { cleanTitle, cleanArtist } = cleanSongData(title, artist);
    const mainArtist = artist.split(',')[0].trim();
    const baseTitleNoFeat = title.replace(/\s*\(feat\.[^)]*\)/gi, '').trim();
    
    const searchPairs = [
      { t: baseTitleNoFeat, a: mainArtist },
      { t: title, a: artist },
      { t: cleanTitle, a: cleanArtist },
    ];
    
    for (const pair of searchPairs) {
      const url = `${LYRICS_OVH_BASE_URL}/${encodeURIComponent(pair.a)}/${encodeURIComponent(pair.t)}`;
      console.log(`🎵 [Lyrics.ovh] Trying: "${pair.t}" by ${pair.a}`);
      
      try {
        const response = await axios.get(url, { timeout: 5000 });
        if (response.data?.lyrics) {
          console.log(`✅ [Lyrics.ovh] Found lyrics (${response.data.lyrics.length} chars)`);
          return response.data.lyrics.trim();
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.log(`[Lyrics.ovh] Error: ${err.message}`);
        }
      }
    }
    return null;
  } catch (err: any) {
    console.error('[Lyrics.ovh] Error:', err.message);
    return null;
  }
}

async function searchAZLyrics(title: string, artist: string): Promise<string | null> {
  try {
    const { cleanTitle, cleanArtist } = cleanSongData(title, artist);
    const mainArtist = artist.split(',')[0].trim();
    const baseTitleNoFeat = title.replace(/\s*\(feat\.[^)]*\)/gi, '').trim();
    
    const formatForAZ = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    // Try multiple artist/title combinations
    const attempts = [
      { artist: formatForAZ(mainArtist), title: formatForAZ(baseTitleNoFeat) },
      { artist: formatForAZ(cleanArtist.split(' ')[0]), title: formatForAZ(cleanTitle) },
      { artist: formatForAZ(mainArtist.split(' ')[0]), title: formatForAZ(baseTitleNoFeat) },
    ];
    
    for (const attempt of attempts) {
      if (!attempt.artist || !attempt.title) continue;
      
      const url = `https://www.azlyrics.com/lyrics/${attempt.artist}/${attempt.title}.html`;
      console.log(`🔍 [AZLyrics] Trying: ${url}`);
      
      try {
        const response = await axios.get(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        const match = response.data.match(/<!-- Usage of azlyrics\.com.*?-->([\s\S]*?)<\/div>/);
        if (match && match[1]) {
          const lyrics = match[1]
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .trim();
          
          if (lyrics.length > 50) {
            console.log(`✅ [AZLyrics] Found lyrics (${lyrics.length} chars)`);
            return lyrics;
          }
        }
      } catch (err: any) {
        if (err.response?.status !== 404) {
          console.log(`[AZLyrics] Error for ${url}: ${err.message}`);
        }
      }
    }
    return null;
  } catch (err: any) {
    console.error('[AZLyrics] Error:', err.message);
    return null;
  }
}

async function recallLyricsWithAI(title: string, artist: string): Promise<string | null> {
  if (!isAiConfigured()) {
    console.log(`🧠 [AI Recall] Skipped - no AI provider configured`);
    return null;
  }
  
  try {
    const mainArtist = artist.split(',')[0].trim();
    const baseTitleNoFeat = title.replace(/\s*\(feat\.[^)]*\)/gi, '').trim();
    
    console.log(`🧠 [AI Recall] Attempting lyrics recall for: "${baseTitleNoFeat}" by ${mainArtist}`);
    const startTime = Date.now();
    
    const response = await getAiClient().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a music lyrics database. Your job is to recall song lyrics from your training data. You specialize in African music - Afrobeats, Amapiano, Highlife, Afropop, and Nigerian/Ghanaian/South African artists.

You have extensive knowledge of lyrics by artists like Burna Boy, Wizkid, Davido, Rema, Asake, Ayra Starr, Tems, CKay, Fireboy DML, Joeboy, Omah Lay, Tiwa Savage, Yemi Alade, Mr Eazi, Olamide, Naira Marley, Zinoleesky, Seyi Vibez, Portable, BNXN, Pheelz, Ruger, Kizz Daniel, and many more.

When you know a song, provide the lyrics. When you genuinely don't know, say so. But for well-known commercially released songs, you almost certainly have the lyrics in your training data.`
        },
        {
          role: 'user',
          content: `Write the complete lyrics for "${baseTitleNoFeat}" by ${mainArtist}.

Rules:
- Write lyrics in their ORIGINAL language (Pidgin, Yoruba, Igbo, Hausa, etc.)
- Keep code-switching intact (e.g. English mixed with Pidgin or Yoruba)
- Include structure labels: [Intro], [Verse 1], [Chorus], [Bridge], etc.
- Provide as complete lyrics as possible
- If you truly don't know this song at all, respond: {"noLyrics": true, "reason": "why"}

Return JSON format:
{"lyrics": "full lyrics here", "confidence": "high" or "medium" or "low"}`
        }
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    
    const parsed = JSON.parse(content);
    if (parsed.noLyrics) {
      console.log(`🧠 [AI Recall] AI doesn't know lyrics for "${baseTitleNoFeat}" - reason: ${parsed.reason || 'unknown'}`);
      return null;
    }
    
    if (parsed.lyrics && parsed.lyrics.length > 50) {
      const elapsed = Date.now() - startTime;
      console.log(`✅ [AI Recall] Got lyrics in ${elapsed}ms (${parsed.lyrics.length} chars, confidence: ${parsed.confidence || 'unknown'})`);
      return parsed.lyrics;
    }
    
    console.log(`🧠 [AI Recall] Lyrics too short or missing for "${baseTitleNoFeat}"`);
    return null;
  } catch (err: any) {
    console.error('[AI Recall] Error:', err.message);
    return null;
  }
}

const lyricsCache = new Map<string, { lyrics: string; source: string; syncedLyrics?: string | null; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour cache

function getCacheKey(title: string, artist: string): string {
  return `${title.toLowerCase().trim()}|${artist.toLowerCase().trim()}`;
}

export async function fetchLyrics(
  title: string,
  artist: string
): Promise<MusixmatchLyricsResult> {
  console.log(`🎵 [Lyrics] Starting search for "${title}" by ${artist}`);
  const startTime = Date.now();
  
  const cacheKey = getCacheKey(title, artist);
  const cached = lyricsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`⚡ [Lyrics] Cache hit! (${cached.source})`);
    return {
      success: true,
      lyrics: {
        fullText: cached.lyrics,
        language: detectLanguage(cached.lyrics),
        copyright: `Lyrics provided by ${cached.source} (cached)`,
        syncedLyrics: cached.syncedLyrics,
      },
    };
  }
  
  let bestResult: { lyrics: string; source: string; syncedLyrics?: string | null } | null = null;
  
  // Race ALL sources in parallel with LRCLIB priority
  // LRCLIB gets a 2s grace window for synced lyrics; other sources resolve immediately
  console.log(`🎵 [Lyrics] Racing all sources in parallel...`);
  
  let lrclibResult: { lyrics: string; source: string; syncedLyrics?: string | null } | null = null;
  let firstOtherResult: { lyrics: string; source: string; syncedLyrics?: string | null } | null = null;
  
  const raceResult = await new Promise<{ lyrics: string; source: string; syncedLyrics?: string | null } | null>((resolve) => {
    let resolved = false;
    const done = (result: { lyrics: string; source: string; syncedLyrics?: string | null }) => {
      if (resolved) return;
      resolved = true;
      resolve(result);
    };
    
    const lrclibPromise = searchLRCLIB(title, artist).then(r => {
      if (r) {
        lrclibResult = { lyrics: r.plain, source: 'LRCLIB', syncedLyrics: r.synced };
        done(lrclibResult);
      }
      return r;
    }).catch(() => null);
    
    const otherDone = (result: { lyrics: string; source: string }) => {
      firstOtherResult = firstOtherResult || result;
      setTimeout(() => {
        if (!resolved) done(lrclibResult || result);
      }, 1500);
    };
    
    searchGeniusWithClient(title, artist).then(l => {
      if (l) otherDone({ lyrics: l, source: 'Genius' });
    }).catch(() => null);
    searchLyricsOvh(title, artist).then(l => {
      if (l) otherDone({ lyrics: l, source: 'Lyrics.ovh' });
    }).catch(() => null);
    searchAZLyrics(title, artist).then(l => {
      if (l) otherDone({ lyrics: l, source: 'AZLyrics' });
    }).catch(() => null);
    recallLyricsWithAI(title, artist).then(l => {
      if (l) otherDone({ lyrics: l, source: 'AI Recall' });
    }).catch(() => null);
    
    Promise.all([
      lrclibPromise,
      new Promise(r => setTimeout(r, 10000)),
    ]).then(() => {
      if (!resolved) resolve(lrclibResult || firstOtherResult || null);
    });
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(lrclibResult || firstOtherResult || null);
      }
    }, 10000);
  });
  
  bestResult = raceResult;
  
  const elapsed = Date.now() - startTime;
  
  if (bestResult) {
    lyricsCache.set(cacheKey, {
      lyrics: bestResult.lyrics,
      source: bestResult.source,
      syncedLyrics: bestResult.syncedLyrics || null,
      timestamp: Date.now(),
    });
    
    const detectedLanguage = detectLanguage(bestResult.lyrics);
    console.log(`✅ [Lyrics] Success from ${bestResult.source} in ${elapsed}ms (${bestResult.lyrics.length} chars, lang: ${detectedLanguage})`);
    
    return {
      success: true,
      lyrics: {
        fullText: bestResult.lyrics,
        language: detectedLanguage,
        copyright: `Lyrics provided by ${bestResult.source}`,
        syncedLyrics: bestResult.syncedLyrics,
      },
    };
  }
  
  console.log(`⚠️ [Lyrics] No lyrics found for "${title}" by ${artist} (searched ${elapsed}ms)`);
  return {
    success: false,
    errorMessage: `Lyrics not found for "${title}" by ${artist}. The song may be too new or not in our databases.`,
  };
}

export async function fetchLyricsByTrackId(
  trackId: number
): Promise<MusixmatchLyricsResult> {
  return {
    success: false,
    errorMessage: 'Track ID lookup not supported. Use fetchLyrics(title, artist) instead.',
  };
}

export function isMusixmatchConfigured(): boolean {
  return true;
}

export function getMusixmatchStatus() {
  const aiProvider = getAiProviderConfig();

  return {
    configured: true,
    service: 'LRCLIB + Lyrics.ovh + optional fallbacks',
    providers: [
      'LRCLIB',
      'Lyrics.ovh',
      ...(getGeniusApiKey() ? ['Genius'] : []),
      'AZLyrics',
      ...(aiProvider.configured ? ['AI recall fallback'] : []),
    ],
    geniusApiKey: getGeniusApiKey() ? 'Configured' : 'Not set',
    aiFallback: aiProvider.configured ? `${aiProvider.provider} configured` : 'Disabled',
  };
}

export function isLyricsServiceAvailable(): boolean {
  return isMusixmatchConfigured();
}

export function getLyricsServiceStatus() {
  return getMusixmatchStatus();
}
