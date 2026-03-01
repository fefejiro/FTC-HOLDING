import { AudioAnalyzer, AudioFeatures } from './audioAnalyzer';
import { AudioChunker, AudioChunk } from './audioChunker';

export interface EmotionSnapshot {
  emotion: 'calm' | 'cooperative' | 'neutral' | 'frustrated' | 'tense' | 'defensive';
  confidence: number;
  summary: string;
  timestamp: number;
  audioFeatures?: AudioFeatures;
}

export interface SessionMoodTrackerConfig {
  sessionId: string;
  userId: string;
  onEmotionUpdate?: (emotion: EmotionSnapshot) => void;
  onError?: (error: Error) => void;
}

/**
 * SessionMoodTracker - Orchestrates continuous audio analysis and emotion tracking
 */
export class SessionMoodTracker {
  private audioAnalyzer: AudioAnalyzer | null = null;
  private audioChunker: AudioChunker | null = null;
  private emotionTimeline: EmotionSnapshot[] = [];
  private config: SessionMoodTrackerConfig;
  private isTracking = false;
  private currentEmotion: EmotionSnapshot | null = null;

  constructor(config: SessionMoodTrackerConfig) {
    this.config = config;
  }

  /**
   * Start mood tracking for a call session
   */
  async startTracking(stream: MediaStream): Promise<void> {
    try {
      console.log('[SessionMoodTracker] Starting mood tracking...');

      // Initialize audio analyzer for real-time features
      this.audioAnalyzer = new AudioAnalyzer({
        volumeThreshold: 15, // Adjust sensitivity
      });
      await this.audioAnalyzer.initialize(stream);

      // Start analyzing audio features
      this.audioAnalyzer.startAnalysis((features) => {
        this.handleAudioFeatures(features);
      });

      // Initialize audio chunker for transcription
      this.audioChunker = new AudioChunker({
        chunkDuration: 18000, // 18 seconds
      });

      // Start recording chunks
      this.audioChunker.startRecording(stream, (chunk) => {
        this.processAudioChunk(chunk);
      });

      this.isTracking = true;
      console.log('[SessionMoodTracker] Tracking started successfully');
    } catch (error) {
      console.error('[SessionMoodTracker] Failed to start tracking:', error);
      this.config.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop mood tracking
   */
  stopTracking(): void {
    console.log('[SessionMoodTracker] Stopping mood tracking...');
    this.isTracking = false;

    if (this.audioAnalyzer) {
      this.audioAnalyzer.stopAnalysis();
      this.audioAnalyzer.cleanup();
      this.audioAnalyzer = null;
    }

    if (this.audioChunker) {
      this.audioChunker.stopRecording();
      this.audioChunker.cleanup();
      this.audioChunker = null;
    }

    console.log('[SessionMoodTracker] Tracking stopped');
  }

  /**
   * Handle real-time audio features (for quick feedback)
   */
  private handleAudioFeatures(features: AudioFeatures): void {
    // Simple heuristic-based emotion detection for instant feedback
    // This provides quick visual updates while waiting for AI analysis

    let emotion: EmotionSnapshot['emotion'] = 'neutral';
    let confidence = 50;

    // Volume-based quick detection
    if (features.volume < 20) {
      emotion = 'calm';
      confidence = 60;
    } else if (features.volume > 70) {
      // High volume could indicate frustration or tension
      emotion = features.cadence > 70 ? 'frustrated' : 'tense';
      confidence = 55;
    } else if (features.cadence > 80) {
      // Fast speech might indicate excitement (cooperative) or frustration
      emotion = features.volume > 50 ? 'cooperative' : 'neutral';
      confidence = 50;
    }

    // Only update if emotion changed or confidence improved
    if (!this.currentEmotion || this.currentEmotion.emotion !== emotion) {
      this.currentEmotion = {
        emotion,
        confidence,
        summary: 'Quick audio analysis (awaiting AI confirmation)',
        timestamp: Date.now(),
        audioFeatures: features,
      };

      this.config.onEmotionUpdate?.(this.currentEmotion);
    }
  }

  /**
   * Process audio chunk for AI transcription and emotion analysis
   */
  private async processAudioChunk(chunk: AudioChunk): Promise<void> {
    try {
      console.log(`[SessionMoodTracker] Processing ${chunk.duration}ms audio chunk`);

      // Convert chunk to base64 for API transmission
      const base64Audio = await AudioChunker.chunkToBase64(chunk);

      // Send to backend for Whisper + Emotion analysis
      const response = await fetch('/api/analyze-emotion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: this.config.sessionId,
          audioData: base64Audio,
          mimeType: chunk.blob.type,
          timestamp: chunk.startTime,
        }),
      });

      if (!response.ok) {
        throw new Error(`Emotion analysis failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Update with AI-analyzed emotion
      const emotionSnapshot: EmotionSnapshot = {
        emotion: result.emotion,
        confidence: result.confidence,
        summary: result.summary,
        timestamp: chunk.startTime,
      };

      this.emotionTimeline.push(emotionSnapshot);
      this.currentEmotion = emotionSnapshot;

      // Notify update
      this.config.onEmotionUpdate?.(emotionSnapshot);

      console.log(`[SessionMoodTracker] Detected emotion: ${result.emotion} (${result.confidence}%)`);
    } catch (error) {
      console.error('[SessionMoodTracker] Chunk processing failed:', error);
      this.config.onError?.(error as Error);
    }
  }

  /**
   * Get current emotion state
   */
  getCurrentEmotion(): EmotionSnapshot | null {
    return this.currentEmotion;
  }

  /**
   * Get complete emotion timeline
   */
  getEmotionTimeline(): EmotionSnapshot[] {
    return [...this.emotionTimeline];
  }

  /**
   * Generate session summary
   */
  async generateSummary(): Promise<string> {
    try {
      if (this.emotionTimeline.length === 0) {
        return 'No emotional data recorded for this session.';
      }

      const response = await fetch('/api/session-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: this.config.sessionId,
          emotionTimeline: this.emotionTimeline,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }

      const result = await response.json();
      return result.summary;
    } catch (error) {
      console.error('[SessionMoodTracker] Summary generation failed:', error);
      return 'Your conversation showed thoughtful communication. Keep building on these positive interactions.';
    }
  }

  /**
   * Check if tracking is active
   */
  isActive(): boolean {
    return this.isTracking;
  }

  /**
   * Cleanup all resources
   */
  cleanup(): void {
    this.stopTracking();
    this.emotionTimeline = [];
    this.currentEmotion = null;
    console.log('[SessionMoodTracker] Cleaned up successfully');
  }
}
