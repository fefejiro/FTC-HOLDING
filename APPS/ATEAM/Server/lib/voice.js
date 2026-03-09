export function createVoiceModule() {
  function getCapabilities() {
    return {
      mode: "local_stub",
      transcription: {
        available: false,
        plannedEngine: "whisper.cpp"
      },
      synthesis: {
        available: false,
        plannedEngine: "piper"
      }
    };
  }

  async function transcribeAudio() {
    return {
      ok: false,
      text: "",
      reason: "transcription_not_configured"
    };
  }

  async function synthesizeSpeech(text) {
    return {
      ok: false,
      textLength: String(text || "").length,
      reason: "speech_synthesis_not_configured"
    };
  }

  return {
    getCapabilities,
    transcribeAudio,
    synthesizeSpeech
  };
}
