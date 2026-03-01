/**
 * AudioAnalyzer - Real-time audio feature extraction using Web Audio API
 * Extracts volume, pitch estimation, and speech cadence from WebRTC streams
 */

export interface AudioFeatures {
  volume: number; // 0-100 normalized volume
  pitch: number; // Estimated fundamental frequency in Hz
  cadence: number; // Speech rate indicator (0-100)
  timestamp: number;
}

export interface AudioAnalyzerConfig {
  fftSize?: number; // FFT size for frequency analysis (default: 2048)
  smoothingTimeConstant?: number; // Smoothing for frequency data (default: 0.8)
  volumeThreshold?: number; // Minimum volume to consider as speech (default: 10)
}

export class AudioAnalyzer {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private freqDataArray: Uint8Array | null = null;
  private config: Required<AudioAnalyzerConfig>;
  private isAnalyzing = false;
  private animationFrameId: number | null = null;
  private lastSpeechTime = 0;
  private speechIntervals: number[] = [];

  constructor(config: AudioAnalyzerConfig = {}) {
    this.config = {
      fftSize: config.fftSize || 2048,
      smoothingTimeConstant: config.smoothingTimeConstant || 0.8,
      volumeThreshold: config.volumeThreshold || 10,
    };
  }

  /**
   * Initialize analyzer with MediaStream from WebRTC
   */
  async initialize(stream: MediaStream): Promise<void> {
    try {
      // Create audio context
      this.audioContext = new AudioContext();
      
      // Create analyser node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;

      // Connect stream to analyser
      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);

      // Create data arrays for analysis
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      this.freqDataArray = new Uint8Array(bufferLength);

      console.log('[AudioAnalyzer] Initialized successfully');
    } catch (error) {
      console.error('[AudioAnalyzer] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start real-time audio analysis
   */
  startAnalysis(callback: (features: AudioFeatures) => void): void {
    if (!this.analyser || !this.dataArray || !this.freqDataArray) {
      console.error('[AudioAnalyzer] Not initialized');
      return;
    }

    this.isAnalyzing = true;
    this.lastSpeechTime = Date.now();

    const analyze = () => {
      if (!this.isAnalyzing || !this.analyser || !this.dataArray || !this.freqDataArray) {
        return;
      }

      // Get time domain data (waveform)
      this.analyser.getByteTimeDomainData(this.dataArray);
      
      // Get frequency domain data
      this.analyser.getByteFrequencyData(this.freqDataArray);

      // Calculate features
      const features = this.extractFeatures(this.dataArray, this.freqDataArray);
      
      // Track speech intervals for cadence
      if (features.volume > this.config.volumeThreshold) {
        const now = Date.now();
        const interval = now - this.lastSpeechTime;
        this.speechIntervals.push(interval);
        
        // Keep only last 10 intervals
        if (this.speechIntervals.length > 10) {
          this.speechIntervals.shift();
        }
        
        this.lastSpeechTime = now;
      }

      callback(features);

      // Continue analysis loop
      this.animationFrameId = requestAnimationFrame(analyze);
    };

    analyze();
  }

  /**
   * Stop audio analysis
   */
  stopAnalysis(): void {
    this.isAnalyzing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Extract audio features from waveform and frequency data
   */
  private extractFeatures(timeData: Uint8Array, freqData: Uint8Array): AudioFeatures {
    // 1. Volume (RMS of waveform)
    const volume = this.calculateVolume(timeData);

    // 2. Pitch estimation (fundamental frequency)
    const pitch = this.estimatePitch(freqData);

    // 3. Cadence (speech rate based on intervals)
    const cadence = this.calculateCadence();

    return {
      volume,
      pitch,
      cadence,
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate volume from time domain data (0-100 scale)
   */
  private calculateVolume(data: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const normalized = (data[i] - 128) / 128; // Normalize to -1 to 1
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / data.length);
    return Math.min(100, rms * 100);
  }

  /**
   * Estimate pitch from frequency data
   * Simplified approach: find peak frequency in typical human voice range (85-255 Hz)
   */
  private estimatePitch(freqData: Uint8Array): number {
    if (!this.audioContext) return 0;

    const nyquist = this.audioContext.sampleRate / 2;
    const binWidth = nyquist / freqData.length;

    // Human voice range: 85-255 Hz (typical fundamental)
    const minFreq = 85;
    const maxFreq = 255;
    const minBin = Math.floor(minFreq / binWidth);
    const maxBin = Math.floor(maxFreq / binWidth);

    let maxMagnitude = 0;
    let peakBin = 0;

    for (let i = minBin; i < maxBin && i < freqData.length; i++) {
      if (freqData[i] > maxMagnitude) {
        maxMagnitude = freqData[i];
        peakBin = i;
      }
    }

    return peakBin * binWidth;
  }

  /**
   * Calculate speech cadence from interval patterns
   * Returns 0-100 scale (higher = faster speech)
   */
  private calculateCadence(): number {
    if (this.speechIntervals.length < 2) return 0;

    // Average interval between speech segments
    const avgInterval = this.speechIntervals.reduce((a, b) => a + b, 0) / this.speechIntervals.length;
    
    // Map intervals to 0-100 scale
    // Shorter intervals = faster speech = higher cadence
    // 100ms intervals = very fast (100), 1000ms = very slow (0)
    const cadence = Math.max(0, Math.min(100, 100 - (avgInterval / 10)));
    
    return Math.round(cadence);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopAnalysis();
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.dataArray = null;
    this.freqDataArray = null;
    this.speechIntervals = [];
    
    console.log('[AudioAnalyzer] Cleaned up successfully');
  }
}
