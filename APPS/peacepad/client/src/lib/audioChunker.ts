/**
 * AudioChunker - Capture and process audio chunks for speech-to-text
 * Records 15-20 second segments from WebRTC streams for Whisper API
 */

export interface AudioChunk {
  blob: Blob;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface AudioChunkerConfig {
  chunkDuration?: number; // Duration in milliseconds (default: 18000 = 18 seconds)
  mimeType?: string; // Audio format (default: 'audio/webm;codecs=opus')
}

export class AudioChunker {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private chunkStartTime = 0;
  private config: Required<AudioChunkerConfig>;
  private isRecording = false;
  private chunkInterval: NodeJS.Timeout | null = null;

  constructor(config: AudioChunkerConfig = {}) {
    this.config = {
      chunkDuration: config.chunkDuration || 18000, // 18 seconds
      mimeType: config.mimeType || 'audio/webm;codecs=opus',
    };
  }

  /**
   * Start chunked recording from MediaStream
   */
  startRecording(
    stream: MediaStream,
    onChunkReady: (chunk: AudioChunk) => void
  ): void {
    try {
      // Check if mimeType is supported
      if (!MediaRecorder.isTypeSupported(this.config.mimeType)) {
        console.warn(
          `[AudioChunker] ${this.config.mimeType} not supported, using default`
        );
        this.config.mimeType = 'audio/webm';
      }

      // Create MediaRecorder for audio only
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.config.mimeType,
      });

      // Collect audio data
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      // Handle recording stop (chunk complete)
      this.mediaRecorder.onstop = () => {
        if (this.chunks.length === 0) return;

        const blob = new Blob(this.chunks, { type: this.config.mimeType });
        const endTime = Date.now();
        const duration = endTime - this.chunkStartTime;

        const audioChunk: AudioChunk = {
          blob,
          startTime: this.chunkStartTime,
          endTime,
          duration,
        };

        onChunkReady(audioChunk);

        // Reset for next chunk
        this.chunks = [];
        
        // Restart recording if still active
        if (this.isRecording && this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
          this.chunkStartTime = Date.now();
          this.mediaRecorder.start();
        }
      };

      // Start initial recording
      this.isRecording = true;
      this.chunkStartTime = Date.now();
      this.mediaRecorder.start();

      // Set up interval to create chunks
      this.chunkInterval = setInterval(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          this.mediaRecorder.stop();
        }
      }, this.config.chunkDuration);

      console.log(
        `[AudioChunker] Started recording with ${this.config.chunkDuration}ms chunks`
      );
    } catch (error) {
      console.error('[AudioChunker] Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop chunked recording
   */
  stopRecording(): void {
    this.isRecording = false;

    if (this.chunkInterval) {
      clearInterval(this.chunkInterval);
      this.chunkInterval = null;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }

    console.log('[AudioChunker] Stopped recording');
  }

  /**
   * Convert audio chunk to File for API upload
   */
  static chunkToFile(chunk: AudioChunk, filename: string = 'audio.webm'): File {
    return new File([chunk.blob], filename, { type: chunk.blob.type });
  }

  /**
   * Convert audio chunk to base64 for API transmission
   */
  static async chunkToBase64(chunk: AudioChunk): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Extract base64 data (remove data:audio/webm;base64, prefix)
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(chunk.blob);
    });
  }

  /**
   * Get recording state
   */
  isActive(): boolean {
    return this.isRecording;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopRecording();
    this.mediaRecorder = null;
    this.chunks = [];
    console.log('[AudioChunker] Cleaned up successfully');
  }
}
