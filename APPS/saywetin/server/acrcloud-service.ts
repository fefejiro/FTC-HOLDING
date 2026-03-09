import crypto from 'crypto';
import FormData from 'form-data';
import axios from 'axios';

function sanitizeCredential(value: string): string {
  return value.replace(/[\r\n\t]/g, "").trim();
}

// ACRCloud configuration from environment variables
const ACRCLOUD_HOST = sanitizeCredential(process.env.ACRCLOUD_HOST || '');
const ACRCLOUD_ACCESS_KEY = sanitizeCredential(process.env.ACRCLOUD_ACCESS_KEY || '');
const ACRCLOUD_ACCESS_SECRET = sanitizeCredential(process.env.ACRCLOUD_ACCESS_SECRET || '');
const ACRCLOUD_ALLOW_HUMMING_FALLBACK =
  sanitizeCredential(process.env.ACRCLOUD_ALLOW_HUMMING_FALLBACK || '').toLowerCase() === 'true';

function readScoreEnv(name: string, fallback: number): number {
  const raw = sanitizeCredential(process.env[name] || '');
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return Math.max(0, Math.min(100, rounded));
}

const ACRCLOUD_MIN_SCORE = readScoreEnv('ACRCLOUD_MIN_SCORE', 55);
const ACRCLOUD_MIN_HUMMING_SCORE = readScoreEnv('ACRCLOUD_MIN_HUMMING_SCORE', 75);

function parseConfidenceScore(rawScore: unknown): number | null {
  const numeric = Number(rawScore);
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.round(numeric);
  return Math.max(0, Math.min(100, rounded));
}

export interface ACRCloudRecognitionResult {
  success: boolean;
  errorMessage?: string;
  errorCode?: 'ACRCLOUD_NOT_CONFIGURED' | 'ACRCLOUD_UPSTREAM_UNAVAILABLE' | 'ACRCLOUD_RECOGNITION_FAILED';
  track?: {
    title: string;
    artist: string;
    album?: string;
    releaseYear?: number;
    duration?: number; // in seconds
    durationMs?: number; // in milliseconds
    genre?: string;
    isrc?: string;
    spotifyId?: string;
    youtubeId?: string;
    confidenceScore?: number; // 0-100
    playOffsetMs?: number; // Where in song the audio matched
  };
  rawResponse?: any;
}

/**
 * Generate HMAC-SHA1 signature for ACRCloud API authentication
 */
function generateSignature(
  stringToSign: string,
  accessSecret: string
): string {
  return crypto
    .createHmac('sha1', accessSecret)
    .update(Buffer.from(stringToSign, 'utf-8'))
    .digest()
    .toString('base64');
}

/**
 * Recognize song from audio buffer using ACRCloud API
 * @param audioBuffer - Audio file buffer (supports MP3, WAV, OGG, etc.)
 * @param audioDuration - Duration of audio clip in seconds (optional)
 * @returns Recognition result with song metadata
 */
export async function recognizeSong(
  audioBuffer: Buffer,
  audioDuration?: number,
  originalMimeType?: string
): Promise<ACRCloudRecognitionResult> {
  try {
    // Validate environment variables
    if (!ACRCLOUD_HOST || !ACRCLOUD_ACCESS_KEY || !ACRCLOUD_ACCESS_SECRET) {
      return {
        success: false,
        errorCode: 'ACRCLOUD_NOT_CONFIGURED',
        errorMessage: 'ACRCloud credentials not configured. Please set ACRCLOUD_HOST, ACRCLOUD_ACCESS_KEY, and ACRCLOUD_ACCESS_SECRET environment variables.',
      };
    }

    // Validate audio buffer
    if (!audioBuffer || audioBuffer.length === 0) {
      return {
        success: false,
        errorMessage: 'Invalid audio buffer provided',
      };
    }

    // Check file size (max 5MB recommended)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (audioBuffer.length > maxSize) {
      return {
        success: false,
        errorMessage: `Audio file too large (${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB). Maximum size is 5MB.`,
      };
    }

    // Prepare request parameters
    const httpMethod = 'POST';
    const httpUri = '/v1/identify';
    const dataType = 'audio'; // Can be 'audio' or 'fingerprint'
    const signatureVersion = '1';
    const timestamp = Math.floor(Date.now() / 1000);

    // Create string to sign (ACRCloud format)
    const stringToSign = `${httpMethod}\n${httpUri}\n${ACRCLOUD_ACCESS_KEY}\n${dataType}\n${signatureVersion}\n${timestamp}`;

    // Generate signature
    const signature = generateSignature(stringToSign, ACRCLOUD_ACCESS_SECRET);
    
    // Debug logging
    console.log('🔑 [ACRCloud] Host:', ACRCLOUD_HOST);
    console.log('🔑 [ACRCloud] Timestamp:', timestamp);

    let filename = 'audio.mp3';
    let contentType = 'audio/mpeg';
    if (originalMimeType) {
      if (originalMimeType.includes('aac') || originalMimeType.includes('m4a') || originalMimeType.includes('mp4')) {
        filename = 'audio.m4a';
        contentType = 'audio/mp4';
      } else if (originalMimeType.includes('webm')) {
        filename = 'audio.webm';
        contentType = 'audio/webm';
      } else if (originalMimeType.includes('wav')) {
        filename = 'audio.wav';
        contentType = 'audio/wav';
      }
    }
    console.log('🎵 [ACRCloud] Sending audio as:', { filename, contentType, originalMimeType, bufferSize: audioBuffer.length });

    const formData = new FormData();
    formData.append('sample', audioBuffer, {
      filename,
      contentType,
    });
    formData.append('access_key', ACRCLOUD_ACCESS_KEY);
    formData.append('data_type', dataType);
    formData.append('signature_version', signatureVersion);
    formData.append('signature', signature);
    formData.append('sample_bytes', audioBuffer.length.toString());
    formData.append('timestamp', timestamp.toString());

    // Optional: Add audio duration if provided
    if (audioDuration) {
      formData.append('audio_len', audioDuration.toString());
    }

    // Make request to ACRCloud
    const url = `https://${ACRCLOUD_HOST}${httpUri}`;
    const response = await axios.post(url, formData, {
      headers: formData.getHeaders(),
      timeout: 30000, // 30 second timeout
    });

    // Parse response
    const data = response.data;

    // Check if recognition was successful
    if (data.status?.code !== 0) {
      return {
        success: false,
        errorCode: 'ACRCLOUD_RECOGNITION_FAILED',
        errorMessage: data.status?.msg || 'Recognition failed',
        rawResponse: data,
      };
    }

    // Extract music metadata (use humming only when explicitly enabled).
    const musicData = data.metadata?.music?.[0];
    const hummingData = data.metadata?.humming?.[0];
    const matchData = musicData || (ACRCLOUD_ALLOW_HUMMING_FALLBACK ? hummingData : undefined);
    
    if (!matchData) {
      return {
        success: false,
        errorMessage: 'No music found in audio. Try playing the song louder or singing more clearly.',
        rawResponse: data,
      };
    }

    const isHummingMatch = !musicData && !!hummingData;
    if (isHummingMatch) {
      console.log('🎤 [ACRCloud] Matched via humming recognition');
    }

    const confidenceScore = parseConfidenceScore((matchData as any).score);
    const minimumAcceptedScore = isHummingMatch ? ACRCLOUD_MIN_HUMMING_SCORE : ACRCLOUD_MIN_SCORE;
    if (confidenceScore === null || confidenceScore < minimumAcceptedScore) {
      return {
        success: false,
        errorCode: 'ACRCLOUD_RECOGNITION_FAILED',
        errorMessage:
          confidenceScore === null
            ? 'Recognition confidence is unavailable. Try again with louder, clearer audio.'
            : `Low-confidence match (${confidenceScore}). Try again with louder, clearer audio.`,
        rawResponse: data,
      };
    }

    // Extract external IDs
    const externalIds = matchData.external_ids || {};
    const externalMetadata = matchData.external_metadata || {};

    // Parse result
    const result: ACRCloudRecognitionResult = {
      success: true,
      track: {
        title: matchData.title || 'Unknown',
        artist: matchData.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist',
        album: matchData.album?.name,
        releaseYear: matchData.release_date
          ? parseInt(matchData.release_date.substring(0, 4))
          : undefined,
        duration: matchData.duration_ms
          ? Math.round(matchData.duration_ms / 1000)
          : undefined,
        durationMs: matchData.duration_ms,
        genre: matchData.genres?.map((g: any) => g.name).join(', '),
        isrc: externalIds.isrc,
        spotifyId: externalMetadata.spotify?.track?.id,
        youtubeId: externalMetadata.youtube?.vid,
        confidenceScore,
        playOffsetMs: matchData.play_offset_ms,
      },
      rawResponse: data,
    };

    return result;
  } catch (error: any) {
    const upstreamUnavailable =
      (typeof error?.response?.status === 'number' && error.response.status >= 500) ||
      ['ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT'].includes(error?.code);

    console.error('ACRCloud recognition error:', error.message);
    return {
      success: false,
      errorCode: upstreamUnavailable ? 'ACRCLOUD_UPSTREAM_UNAVAILABLE' : 'ACRCLOUD_RECOGNITION_FAILED',
      errorMessage: error.response?.data?.status?.msg || error.message || 'Unknown error during recognition',
    };
  }
}

/**
 * Check if ACRCloud service is configured
 */
export function isACRCloudConfigured(): boolean {
  return !!(ACRCLOUD_HOST && ACRCLOUD_ACCESS_KEY && ACRCLOUD_ACCESS_SECRET);
}

/**
 * Get ACRCloud service status
 */
export function getACRCloudStatus() {
  return {
    configured: isACRCloudConfigured(),
  };
}
