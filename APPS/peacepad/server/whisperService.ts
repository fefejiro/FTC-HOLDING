import OpenAI from "openai";

let openai: OpenAI | null = null;

// Prioritize OPENAI_API_KEY (user's own key) over AI_INTEGRATIONS key which may have incorrect values
const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const baseURL = process.env.OPENAI_API_KEY ? undefined : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

if (apiKey) {
  openai = new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });
  console.log('[Whisper] OpenAI client initialized with API key source:', 
    process.env.OPENAI_API_KEY ? 'OPENAI_API_KEY' : 'AI_INTEGRATIONS_OPENAI_API_KEY');
} else {
  console.log('[Whisper] No OpenAI API key found - transcription will be unavailable');
}

export interface TranscriptionResult {
  text: string;
  duration: number;
  language?: string;
}

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeAudio(
  audioFile: File | Blob,
  language?: string
): Promise<TranscriptionResult> {
  if (!openai) {
    console.log('[Whisper] OpenAI not configured - transcription unavailable');
    throw new Error('OpenAI API key not configured');
  }

  try {
    const startTime = Date.now();

    // Convert Blob to File if needed
    const file = audioFile instanceof File 
      ? audioFile 
      : new File([audioFile], 'audio.webm', { type: 'audio/webm' });

    // Call Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: language || undefined, // Optional language hint
      response_format: "json",
    });

    const duration = Date.now() - startTime;

    return {
      text: transcription.text,
      duration,
      language: language,
    };
  } catch (error) {
    console.error('[Whisper] Transcription failed:', error);
    throw new Error('Failed to transcribe audio');
  }
}

/**
 * Transcribe audio from base64 string
 */
export async function transcribeFromBase64(
  base64Audio: string,
  mimeType: string = 'audio/webm',
  language?: string
): Promise<TranscriptionResult> {
  try {
    // Convert base64 to Buffer
    const buffer = Buffer.from(base64Audio, 'base64');
    
    // Create blob
    const blob = new Blob([buffer], { type: mimeType });
    
    // Transcribe
    return await transcribeAudio(blob, language);
  } catch (error) {
    console.error('[Whisper] Base64 transcription failed:', error);
    throw new Error('Failed to transcribe base64 audio');
  }
}
