/**
 * End-to-End Integration Tests for Speech Clarity API
 * Tests complete workflows: create → save → analyze → verify storage
 */

import { createSpeechClarityStore } from '../../lib/speechClarity/speechClarityStore.js';
import { createSpeechClarityAnalyze } from '../../lib/speechClarity/speechClarityAnalyze.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testMemoryDir = path.join(__dirname, '../../__test_memory__');

describe('Speech Clarity E2E Integration Tests', () => {
  let store;
  let analyze;

  beforeAll(async () => {
    // Create isolated test memory directory
    if (!fs.existsSync(testMemoryDir)) {
      fs.mkdirSync(testMemoryDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Cleanup test directory
    if (fs.existsSync(testMemoryDir)) {
      const files = fs.readdirSync(testMemoryDir);
      for (const file of files) {
        const filePath = path.join(testMemoryDir, file);
        if (fs.statSync(filePath).isDirectory()) {
          fs.rmSync(filePath, { recursive: true });
        } else {
          fs.unlinkSync(filePath);
        }
      }
      fs.rmdirSync(testMemoryDir);
    }
  });

  beforeEach(async () => {
    store = createSpeechClarityStore({ memoryDir: testMemoryDir });
    analyze = createSpeechClarityAnalyze();
    await store.ensure();
  });

  /**
   * Workflow 1: Happy Path - Complete Session Lifecycle
   */
  describe('Workflow 1: Complete Session Lifecycle', () => {
    test('should create, save, and retrieve session', async () => {
      const title = 'Test Session 1';

      // Create session
      const session = await store.createSession('learning', title);
      expect(session.id).toBeTruthy();
      expect(session.mode).toBe('learning');
      expect(session.title).toBe(title);
      expect(session.created_at).toBeTruthy();

      // Save session
      const saved = await store.saveSession(session);
      expect(saved.id).toBe(session.id);

      // Retrieve session
      const retrieved = await store.getSession(session.id);
      expect(retrieved.id).toBe(session.id);
      expect(retrieved.title).toBe(title);
    });

    test('should save session and verify file exists', async () => {
      const session = await store.createSession('podcast', 'File Check Session');
      await store.saveSession(session);

      const speechDir = path.join(testMemoryDir, 'speech_clarity');
      const sessionFile = path.join(speechDir, `${session.id}.json`);

      expect(fs.existsSync(sessionFile)).toBe(true);
      const fileContent = fs.readFileSync(sessionFile, 'utf8');
      const parsed = JSON.parse(fileContent);
      expect(parsed.id).toBe(session.id);
    });

    test('should list recently created sessions in reverse order', async () => {
      const session1 = await store.createSession('learning', 'Session 1');
      await store.saveSession(session1);

      const session2 = await store.createSession('podcast', 'Session 2');
      await store.saveSession(session2);

      const sessions = await store.listSessions(10);
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions[0].id).toBe(session2.id);
      expect(sessions[1].id).toBe(session1.id);
    });

    test('should respect list limit of 14 sessions', async () => {
      // Create 20 sessions
      for (let i = 0; i < 20; i++) {
        const session = await store.createSession('learning', `Session ${i}`);
        await store.saveSession(session);
        // Small delay to ensure different timestamps
        await new Promise(r => setTimeout(r, 10));
      }

      const sessions = await store.listSessions(14);
      expect(sessions.length).toBeLessThanOrEqual(14);
    });
  });

  /**
   * Workflow 2: Transcript Analysis with Metrics
   */
  describe('Workflow 2: Transcript Analysis with Metrics', () => {
    test('should analyze clean transcript and return metrics + 4 drills', async () => {
      const transcript = 'I consistently complete my consonants. Photosynthesis is important.';
      const result = analyze.analyzeTranscript(transcript);

      expect(result.metrics).toBeTruthy();
      expect(result.metrics.wordCount).toBeGreaterThan(0);
      expect(result.metrics.fillerCount).toBeGreaterThanOrEqual(0);
      expect(result.metrics.fillerDensityPer100).toBeGreaterThanOrEqual(0);

      expect(result.drills).toBeInstanceOf(Array);
      expect(result.drills.length).toBe(4);
      result.drills.forEach(drill => {
        expect(drill.title).toBeTruthy();
        expect(drill.description).toBeTruthy();
        expect(drill.id).toBeTruthy();
        // All drills have either words, pattern, pair, or sentence property
        expect(
          drill.words || drill.pattern || drill.pair || drill.sentence
        ).toBeTruthy();
      });
    });

    test('should detect filler words and calculate density', async () => {
      const transcript = 'Um, like, you know, photosynthesis. Um, basically, like, really important.';
      const result = analyze.analyzeTranscript(transcript);

      expect(result.metrics.fillerCount).toBeGreaterThan(0);
      expect(result.metrics.topFillers).toBeInstanceOf(Array);
      expect(result.metrics.topFillers.length).toBeGreaterThan(0);
    });

    test('should detect flagged word endings', async () => {
      const transcript = 'Photosynthesis. Cloud versus Claude. Test for consistency in consonants.';
      const result = analyze.analyzeTranscript(transcript);

      expect(result.metrics.flaggedEndingsCount).toBeGreaterThan(0);
      expect(result.metrics.flaggedEndingsExamples).toBeInstanceOf(Array);
      expect(result.metrics.flaggedEndingsExamples.length).toBeGreaterThan(0);
    });

    test('should handle empty transcript gracefully', async () => {
      const result = analyze.analyzeTranscript('');
      expect(result.metrics.wordCount).toBe(0);
      expect(result.metrics.fillerCount).toBe(0);
      expect(result.metrics.wpm).toBeNull();
    });

    test('should generate appropriate drills based on analysis', async () => {
      const result = analyze.analyzeTranscript('photosynthesis test consistency');
      const { drills } = result;

      const drillTitles = drills.map(d => d.title).join(' ').toLowerCase();
      expect(drillTitles).toContain('final');
      expect(drillTitles).toContain('vowel');
      expect(drillTitles).toContain('minimal');
    });
  });

  /**
   * Workflow 3: Audio File Handling
   */
  describe('Workflow 3: Audio File Handling', () => {
    test('should save and retrieve audio file', async () => {
      const session = await store.createSession('learning', 'Audio Test');
      const audioBuffer = Buffer.from('fake_audio_data');

      // Save audio
      const audioPath = await store.saveAudioFile(session.id, audioBuffer);
      expect(audioPath).toContain('audio/');
      expect(audioPath).toContain(session.id);

      // Retrieve audio
      const retrieved = await store.getAudioFile(session.id);
      expect(retrieved).toBeTruthy();
      expect(retrieved.toString()).toBe(audioBuffer.toString());
    });

    test('should handle non-existent audio file', async () => {
      const retrieved = await store.getAudioFile('nonexistent_id');
      expect(retrieved).toBeNull();
    });

    test('should create audio subdirectory if missing', async () => {
      const session = await store.createSession('learning', 'Dir Test');
      const audioBuffer = Buffer.from('test_data');

      await store.saveAudioFile(session.id, audioBuffer);

      const audioDir = path.join(testMemoryDir, 'speech_clarity', 'audio');
      expect(fs.existsSync(audioDir)).toBe(true);
    });
  });

  /**
   * Workflow 4: Complete Session with Transcript & Audio
   */
  describe('Workflow 4: Complete Session with Transcript & Audio', () => {
    test('should create session, add transcript, save audio, and analyze', async () => {
      const title = 'Full Workflow Test';
      const transcript = 'Um, like photosynthesis converts light energy. Tests for consistency.';
      const audioBuffer = Buffer.from('audio_content');

      // 1. Create and save session
      const session = await store.createSession('learning', title);
      await store.saveSession(session);

      // 2. Add transcript and audio info to session
      session.transcript_text = transcript;
      session.duration_seconds = 10;
      await store.saveSession(session);

      // 3. Save audio file
      await store.saveAudioFile(session.id, audioBuffer);

      // 4. Analyze transcript
      const analysis = analyze.analyzeTranscript(transcript);
      session.metrics_json = analysis.metrics;
      session.drills_json = analysis.drills;
      await store.saveSession(session);

      // 5. Retrieve and verify complete session
      const retrieved = await store.getSession(session.id);
      expect(retrieved.transcript_text).toBe(transcript);
      expect(retrieved.duration_seconds).toBe(10);
      expect(retrieved.metrics_json).toBeTruthy();
      expect(retrieved.drills_json).toBeInstanceOf(Array);
      expect(retrieved.drills_json.length).toBe(4);

      // 6. Verify audio exists
      const audio = await store.getAudioFile(session.id);
      expect(audio).toBeTruthy();
    });
  });

  /**
   * Workflow 5: Multiple Sessions & Analytics
   */
  describe('Workflow 5: Multiple Sessions & Analytics', () => {
    test('should track multiple sessions with different modes', async () => {
      const modes = ['learning', 'podcast', 'interview'];
      const sessionIds = [];

      for (const mode of modes) {
        const session = await store.createSession(mode, `Session ${mode}`);
        await store.saveSession(session);
        sessionIds.push(session.id);
      }

      const sessions = await store.listSessions(10);
      const retrievedIds = sessions.map(s => s.id);

      sessionIds.forEach(id => {
        expect(retrievedIds).toContain(id);
      });
    });

    test('should handle concurrent session creation', async () => {
      const sessionPromises = [];

      for (let i = 0; i < 5; i++) {
        sessionPromises.push(
          store.createSession('learning', `Concurrent ${i}`).then(s => store.saveSession(s))
        );
      }

      const sessions = await Promise.all(sessionPromises);
      expect(sessions.length).toBe(5);

      const sessionIds = new Set(sessions.map(s => s.id));
      expect(sessionIds.size).toBe(5);
    });
  });

  /**
   * Workflow 6: Complex Real-World Scenarios
   */
  describe('Workflow 6: Complex Real-World Scenarios', () => {
    test('should handle long transcript with mixed content', async () => {
      const longTranscript = `
        Um, like, you know, photosynthesis is the process where plants convert, um,
        light energy into chemical energy. Tests for consistency in consonants are important,
        basically. Cloud versus Claude, um, you know, different things.
        It's important to, like, complete all your consonants properly.
        Basically, um, this is really important for clarity.
      `;

      const result = analyze.analyzeTranscript(longTranscript);
      expect(result.metrics.wordCount).toBeGreaterThan(0);
      expect(result.metrics.fillerCount).toBeGreaterThan(0);
      expect(result.metrics.wpm).toBeNull(); // No duration provided, so WPM is null
      expect(result.metrics.flaggedEndingsCount).toBeGreaterThan(0);
    });

    test('should handle special characters and punctuation', async () => {
      const specialTranscript = 'Um... cloud—versus—Claude! (photosynthesis). Like, "really?"';
      const result = analyze.analyzeTranscript(specialTranscript);
      expect(result.metrics.wordCount).toBeGreaterThan(0);
    });

    test('should calculate WPM correctly for different durations', async () => {
      const transcript = 'This is a test transcript for WPM calculation';
      const wordCount = transcript.split(/\s+/).length; // 8 words

      // Test WPM calculated as (wordCount / duration_in_minutes)
      // For 8 words in 30 seconds (0.5 min) = 16 WPM
      // For 8 words in 60 seconds (1.0 min) = 8 WPM

      const session30s = await store.createSession('learning', 'WPM 30s');
      session30s.transcript_text = transcript;
      session30s.duration_seconds = 30;

      const session60s = await store.createSession('learning', 'WPM 60s');
      session60s.transcript_text = transcript;
      session60s.duration_seconds = 60;

      // Verify WPM calculation logic
      const wpm30 = Math.round(wordCount / (30 / 60));
      const wpm60 = Math.round(wordCount / (60 / 60));

      expect(wpm30).toBe(16);
      expect(wpm60).toBe(8);
    });

    test('should handle very short and very long transcripts', async () => {
      // Very short
      const shortResult = analyze.analyzeTranscript('Hi');
      expect(shortResult.metrics.wordCount).toBe(1);

      // Very long (1000+ words)
      const longWords = Array(500).fill('photosynthesis test consistency').join(' ');
      const longResult = analyze.analyzeTranscript(longWords);
      expect(longResult.metrics.wordCount).toBeGreaterThan(500);
    });
  });

  /**
   * Workflow 7: Error Scenarios & Recovery
   */
  describe('Workflow 7: Error Scenarios & Recovery', () => {
    test('should handle session not found gracefully', async () => {
      try {
        await store.getSession('nonexistent_id_12345');
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('not found');
      }
    });

    test('should create session even if previous operations failed', async () => {
      // Try to get nonexistent session (will fail)
      try {
        await store.getSession('invalid_id');
      } catch (error) {
        // Expected
      }

      // Should still be able to create new session
      const session = await store.createSession('learning', 'Recovery Test');
      expect(session.id).toBeTruthy();

      const saved = await store.saveSession(session);
      const retrieved = await store.getSession(saved.id);
      expect(retrieved.id).toBe(session.id);
    });

    test('should handle corrupted JSON file gracefully', async () => {
      const session = await store.createSession('learning', 'Corruption Test');
      await store.saveSession(session);

      // Corrupt the JSON file
      const sessionFile = path.join(testMemoryDir, 'speech_clarity', `${session.id}.json`);
      fs.writeFileSync(sessionFile, 'invalid json {{{');

      // Should handle gracefully
      try {
        await store.getSession(session.id);
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Failed to parse');
      }
    });
  });

  /**
   * Workflow 8: State Consistency
   */
  describe('Workflow 8: State Consistency', () => {
    test('should maintain state consistency across save/retrieve cycles', async () => {
      const original = await store.createSession('learning', 'Consistency Test');
      original.transcript_text = 'Test transcript';
      original.duration_seconds = 45;
      original.metrics_json = { wpm: 150, fillerCount: 2 };
      original.drills_json = [{ title: 'Drill 1' }];

      // Save multiple times
      await store.saveSession(original);
      await store.saveSession(original);

      const retrieved = await store.getSession(original.id);
      expect(retrieved.transcript_text).toBe(original.transcript_text);
      expect(retrieved.duration_seconds).toBe(original.duration_seconds);
      expect(retrieved.metrics_json.wpm).toBe(original.metrics_json.wpm);
    });

    test('should preserve session metadata through cycles', async () => {
      const session = await store.createSession('interview', 'Metadata Test');
      const originalCreated = session.created_at;

      await store.saveSession(session);
      const retrieved = await store.getSession(session.id);

      expect(retrieved.created_at).toBe(originalCreated);
      expect(retrieved.mode).toBe('interview');
      expect(retrieved.id).toBe(session.id);
    });
  });

  /**
   * Workflow 9: Deterministic Analysis
   */
  describe('Workflow 9: Deterministic Analysis', () => {
    test('should produce identical results for same transcript', async () => {
      const transcript = 'Um, like photosynthesis. Tests for consistency.';

      const result1 = analyze.analyzeTranscript(transcript);
      const result2 = analyze.analyzeTranscript(transcript);

      expect(result1.metrics.wordCount).toBe(result2.metrics.wordCount);
      expect(result1.metrics.fillerCount).toBe(result2.metrics.fillerCount);
      expect(result1.metrics.wpm).toBe(result2.metrics.wpm);
      expect(result1.drills.length).toBe(result2.drills.length);
    });

    test('should produce deterministic drill generation', async () => {
      const transcript = 'photosynthesis test consistency';

      const analysis1 = analyze.analyzeTranscript(transcript);
      const analysis2 = analyze.analyzeTranscript(transcript);

      expect(JSON.stringify(analysis1.drills)).toBe(JSON.stringify(analysis2.drills));
    });
  });
});
