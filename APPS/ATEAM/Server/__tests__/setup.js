// Backend test setup
// This file runs before all tests
if (typeof jest !== 'undefined') {
  jest.setTimeout(10000);
}

// Global test utilities
global.testUtils = {
  createMockSession: (overrides = {}) => ({
    id: `sess_${Date.now()}_abc123`,
    created_at: new Date().toISOString(),
    mode: 'learning',
    title: 'Test Session',
    audio_path: null,
    transcript_text: '',
    duration_seconds: null,
    metrics_json: null,
    drills_json: null,
    reflection_notes_json: { audioOnly: [], videoMuted: [], full: [] },
    ...overrides
  }),

  createMockTranscript: () =>
    'Um, like, you know, photosynthesis basically converts light energy. Tests for consistency in consonants. Cloud versus Claude.',

  createMockAudioBuffer: (size = 1024) =>
    Buffer.alloc(size)
};

// Suppress console.error for specific known errors
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('not mocked')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
