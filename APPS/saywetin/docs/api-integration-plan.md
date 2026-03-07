# API Integration Plan - AfroLyrics

## Overview
AfroLyrics will integrate two primary external APIs to enable audio recognition and lyrics fetching, combined with OpenAI for cultural context generation.

---

## 1. ACRCloud Audio Recognition

### Purpose
Identify songs from 6-10 second audio clips recorded by users.

### API Details
- **Endpoint**: `https://identify-{region}.acrcloud.com/v1/identify`
- **Method**: POST (multipart/form-data)
- **Authentication**: HMAC-SHA1 signature with access_key + access_secret
- **Max file size**: 5MB (recommended <15 seconds)
- **Supported formats**: MP3, WAV, WMA, AMR, OGG, AAC, M4A, etc.

### Pricing
- **Free Trial**: 14 days
- **Estimated Cost**: ~$6 per 1,000 requests
- **Volume Discount**: Up to 20% off with branding compliance

### Response Format
```json
{
  "status": {
    "msg": "Success",
    "code": 0
  },
  "metadata": {
    "music": [{
      "external_ids": {
        "isrc": "...",
        "upc": "..."
      },
      "title": "Song Title",
      "artists": [{"name": "Artist Name"}],
      "album": {"name": "Album Name"},
      "release_date": "2019-12-01",
      "genres": [{"name": "Afrobeats"}],
      "duration_ms": 234000,
      "external_metadata": {
        "spotify": {"track": {"id": "..."}},
        "youtube": {"vid": "..."}
      }
    }]
  }
}
```

### Integration Approach
1. User records audio in browser (MediaRecorder API)
2. Upload audio blob to backend `/api/listen` endpoint
3. Backend converts to appropriate format if needed
4. Generate HMAC signature and send to ACRCloud
5. Parse response and extract song metadata
6. Store in `recognized_tracks` table with confidence score

---

## 2. Musixmatch Lyrics API

### Purpose
Fetch complete song lyrics using song title and artist from ACRCloud response.

### API Details
- **Base URL**: `https://api.musixmatch.com/ws/1.1/`
- **Authentication**: API key as query parameter
- **Key Endpoints**:
  - `/track.search` - Find track by title/artist
  - `/track.lyrics.get` - Get lyrics by track_id

### Pricing
- **Free Tier**: Non-commercial use only
- **Commercial**: Custom pricing (contact sales@musixmatch.com)
- **Note**: Will need commercial license for public app

### Response Format
```json
{
  "message": {
    "header": {"status_code": 200},
    "body": {
      "lyrics": {
        "lyrics_id": 123,
        "lyrics_body": "Complete lyrics text...",
        "lyrics_language": "en",
        "lyrics_copyright": "Lyrics © Publisher"
      }
    }
  }
}
```

### Integration Approach
1. Use song title + artist from ACRCloud to search Musixmatch
2. Get track_id from search results
3. Fetch complete lyrics using track_id
4. Parse lyrics into individual lines
5. Detect language for each line
6. **Copyright Safety**: Only store lyrics if Public Domain/CC, otherwise keep in-memory

---

## 3. OpenAI Cultural Context (Already Integrated)

### Purpose
Generate translations, cultural context, and deeper meaning for lyrics.

### Enhancement Strategy
Use specialized prompts per lyric line or batch entire song:

```typescript
const prompt = `You are an expert in African music, languages, and culture with deep knowledge of Yoruba, Igbo, Zulu, Pidgin English, and other African languages.

Song: "${songTitle}" by ${artist}
Genre: ${genre}
Language: ${detectedLanguage}

Lyric line: "${originalText}"

Provide a detailed analysis in JSON format:
{
  "translation": "Natural English translation (not literal)",
  "culturalContext": "3-4 sentences explaining cultural references, traditions, idioms, or symbolism",
  "artistIntent": "What the artist meant to express with this line",
  "deeperMeaning": "Wordplay, historical context, proverbs, or hidden meanings",
  "languageNotes": "Explanation of code-switching, dialect, or linguistic choices (if applicable)"
}
`;
```

### Optimization
- **Batch processing**: Send entire song in one request (cheaper)
- **Structured output**: Use JSON mode for consistent formatting
- **Caching**: Store AI responses to avoid re-generating for same lines

---

## 4. Integration Architecture

### Flow Diagram
```
User clicks "Listen"
    ↓
Record 6-10 seconds audio (Browser)
    ↓
POST /api/listen (upload audio blob)
    ↓
Backend: ACRCloud recognition
    ↓
Store recognized_track record
    ↓
Backend: Musixmatch lyrics fetch
    ↓
Backend: OpenAI cultural analysis (batched)
    ↓
Return to frontend progressively:
  1. Song metadata (immediate)
  2. Lyrics (5-10 seconds)
  3. AI translations (stream line-by-line)
```

### Copyright Safety Strategy
- **Public Domain/CC songs**: Store everything in database
- **Copyrighted songs**: 
  - Store metadata only (title, artist, album)
  - Keep lyrics in-memory (Redis/session)
  - Display transiently
  - No export allowed
  - Translations stored separately (transformative use)

---

## 5. Fallback Strategy

### If ACRCloud fails:
- Try AudD API (alternative)
- Prompt user to manually enter song details

### If Musixmatch fails:
- Try Genius API (unofficial scraping)
- Use community-submitted lyrics (future)

### If OpenAI fails:
- Queue for retry
- Show lyrics without translation initially
- Display error message gracefully

---

## 6. Environment Variables Required

```bash
# ACRCloud
ACRCLOUD_HOST=identify-us-west-2.acrcloud.com
ACRCLOUD_ACCESS_KEY=your_access_key
ACRCLOUD_ACCESS_SECRET=your_access_secret

# Musixmatch
MUSIXMATCH_API_KEY=your_api_key

# OpenAI (already configured via Replit AI Integrations)
# AI_INTEGRATIONS_OPENAI_API_KEY (auto-populated)
```

---

## 7. Rate Limiting & Cost Management

### Caching Strategy
- Cache ACRCloud results by audio fingerprint hash (7 days)
- Cache Musixmatch lyrics by song_id (30 days)
- Cache OpenAI translations by lyric_hash + language (permanent)

### Expected Monthly Costs (10K users, 5 songs each)
- ACRCloud: 50K requests × $0.006 = $300/month
- Musixmatch: Custom pricing (TBD)
- OpenAI: 50K translations × $0.004-0.008 = $200-400/month
- **Total**: ~$500-1000/month

---

## 8. Next Steps

1. Sign up for ACRCloud free trial (14 days)
2. Contact Musixmatch sales for commercial pricing quote
3. Implement backend services (acr-service.ts, musixmatch-service.ts)
4. Update OpenAI prompts for cultural context
5. Build API routes and frontend components
6. Test with diverse African music catalog
