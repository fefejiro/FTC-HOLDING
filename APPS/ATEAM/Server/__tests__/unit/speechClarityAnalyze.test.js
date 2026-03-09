import { createSpeechClarityAnalyze } from '../../lib/speechClarity/speechClarityAnalyze.js';
import transcripts from '../fixtures/sampleTranscripts.json' with { type: 'json' };

describe('speechClarityAnalyze', () => {
  let analyze;

  beforeEach(() => {
    analyze = createSpeechClarityAnalyze();
  });

  describe('countWords', () => {
    test('should count words correctly in clean transcript', () => {
      const result = analyze.analyzeTranscript(transcripts.clean);
      expect(result.metrics.wordCount).toBe(15);
    });

    test('should count words with punctuation', () => {
      const result = analyze.analyzeTranscript('Hello, world! How are you?');
      expect(result.metrics.wordCount).toBe(5);
    });

    test('should return 0 for empty/whitespace-only text', () => {
      const result = analyze.analyzeTranscript(transcripts.emptyTranscript);
      expect(result.metrics.wordCount).toBe(0);
    });
  });

  describe('detectFillers', () => {
    test('should detect filler words in transcript', () => {
      const result = analyze.analyzeTranscript(transcripts.withFillers);
      expect(result.metrics.fillerCount).toBeGreaterThan(0);
    });

    test('should calculate filler density per 100 words correctly', () => {
      const result = analyze.analyzeTranscript(transcripts.rapidFillers);
      expect(result.metrics.fillerDensityPer100).toBeGreaterThan(10);
    });

    test('should identify top 3 fillers', () => {
      const result = analyze.analyzeTranscript(transcripts.withFillers);
      expect(result.metrics.topFillers).toBeDefined();
      expect(Array.isArray(result.metrics.topFillers)).toBe(true);
    });

    test('should handle case-insensitive matching', () => {
      const result = analyze.analyzeTranscript('UM, Um, um, UH, Uh, uh');
      expect(result.metrics.fillerCount).toBeGreaterThan(0);
    });

    test('should return 0 fillers for clean transcript', () => {
      const result = analyze.analyzeTranscript(transcripts.clean);
      expect(result.metrics.fillerCount).toBe(0);
    });
  });

  describe('calculateWpm', () => {
    test('should calculate WPM correctly with valid inputs', () => {
      const result = analyze.analyzeTranscript(
        transcripts.longTranscript,
        120 // 2 minutes
      );
      expect(result.metrics.wpm).toBeTruthy();
      expect(result.metrics.wpm).toBeGreaterThan(0);
    });

    test('should return null WPM for zero duration', () => {
      const result = analyze.analyzeTranscript(transcripts.clean, 0);
      expect(result.metrics.wpm).toBeNull();
    });

    test('should return null WPM when duration is missing', () => {
      const result = analyze.analyzeTranscript(transcripts.clean, null);
      expect(result.metrics.wpm).toBeNull();
    });

    test('should correctly calculate for different durations', () => {
      const transcript = 'word ' .repeat(60); // 60 words
      const result60sec = analyze.analyzeTranscript(transcript, 60);
      const result120sec = analyze.analyzeTranscript(transcript, 120);

      expect(result60sec.metrics.wpm).toBeGreaterThan(
        result120sec.metrics.wpm
      );
    });
  });

  describe('detectFlaggedEndings', () => {
    test('should detect target words with specific endings', () => {
      const result = analyze.analyzeTranscript(
        transcripts.withFlaggedEndings
      );
      expect(result.metrics.flaggedEndingsCount).toBeGreaterThan(0);
    });

    test('should find photosynthesis', () => {
      const result = analyze.analyzeTranscript('photosynthesis');
      expect(result.metrics.flaggedEndingsCount).toBeGreaterThan(0);
    });

    test('should return examples of flagged words', () => {
      const result = analyze.analyzeTranscript(
        transcripts.withFlaggedEndings
      );
      expect(result.metrics.flaggedEndingsExamples).toBeDefined();
      expect(Array.isArray(result.metrics.flaggedEndingsExamples)).toBe(true);
    });

    test('should return 0 count for transcript with no flagged endings', () => {
      const result = analyze.analyzeTranscript('simple testing');
      expect(result.metrics.flaggedEndingsCount).toBe(0);
    });

    test('should handle multiple occurrences of same word', () => {
      const multiOccurrence =
        'photosynthesis is about photosynthesis tests for consistency';
      const result = analyze.analyzeTranscript(multiOccurrence);
      expect(result.metrics.flaggedEndingsCount).toBeGreaterThan(0);
    });
  });

  describe('generateDrills', () => {
    test('should generate exactly 4 drill objects', () => {
      const result = analyze.analyzeTranscript(transcripts.withFillers);
      expect(result.drills).toHaveLength(4);
    });

    test('should include drill_final_s', () => {
      const result = analyze.analyzeTranscript(transcripts.clean);
      const drillIds = result.drills.map((d) => d.id);
      expect(drillIds).toContain('drill_final_s');
    });

    test('should include drill_pencil_vowel', () => {
      const result = analyze.analyzeTranscript(transcripts.clean);
      const drillIds = result.drills.map((d) => d.id);
      expect(drillIds).toContain('drill_pencil_vowel');
    });

    test('should include drill_minimal_pair', () => {
      const result = analyze.analyzeTranscript(transcripts.clean);
      const drillIds = result.drills.map((d) => d.id);
      expect(drillIds).toContain('drill_minimal_pair');
    });

    test('should include drill_sentence_ending', () => {
      const result = analyze.analyzeTranscript(transcripts.clean);
      const drillIds = result.drills.map((d) => d.id);
      expect(drillIds).toContain('drill_sentence_ending');
    });

    test('should include title and description for each drill', () => {
      const result = analyze.analyzeTranscript(transcripts.clean);
      result.drills.forEach((drill) => {
        expect(drill.title).toBeTruthy();
        expect(drill.description).toBeTruthy();
      });
    });

    test('should handle empty transcript gracefully', () => {
      const result = analyze.analyzeTranscript('');
      expect(result.drills).toHaveLength(4);
    });
  });

  describe('analyzeTranscript (Integration)', () => {
    test('should return metrics and drills in complete analysis', () => {
      const result = analyze.analyzeTranscript(
        transcripts.withFillers,
        120
      );

      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('drills');
      expect(result.metrics).toHaveProperty('wordCount');
      expect(result.metrics).toHaveProperty('wpm');
      expect(result.metrics).toHaveProperty('fillerCount');
      expect(result.metrics).toHaveProperty('fillerDensityPer100');
      expect(result.metrics).toHaveProperty('topFillers');
      expect(result.metrics).toHaveProperty('flaggedEndingsCount');
      expect(result.metrics).toHaveProperty('flaggedEndingsExamples');
    });

    test('should handle complex real-world transcript', () => {
      const result = analyze.analyzeTranscript(transcripts.longTranscript, 180);

      expect(result.metrics.wordCount).toBeGreaterThan(0);
      expect(result.metrics.wpm).toBeGreaterThan(0);
      expect(result.drills).toHaveLength(4);
    });

    test('should handle single word transcript', () => {
      const result = analyze.analyzeTranscript(transcripts.singleWord);

      expect(result.metrics.wordCount).toBe(1);
      expect(result.metrics.wpm).toBeNull();
      expect(result.metrics.fillerCount).toBe(0);
      expect(result.drills).toHaveLength(4);
    });

    test('should handle special characters gracefully', () => {
      const result = analyze.analyzeTranscript(
        transcripts.specialCharacters
      );

      expect(result.metrics).toBeDefined();
      expect(result.drills).toBeDefined();
    });

    test('should be deterministic for same input', () => {
      const result1 = analyze.analyzeTranscript(
        transcripts.withFillers,
        120
      );
      const result2 = analyze.analyzeTranscript(
        transcripts.withFillers,
        120
      );

      expect(result1.metrics.wordCount).toBe(result2.metrics.wordCount);
      expect(result1.metrics.fillerCount).toBe(result2.metrics.fillerCount);
      expect(result1.drills).toEqual(result2.drills);
    });
  });
});
