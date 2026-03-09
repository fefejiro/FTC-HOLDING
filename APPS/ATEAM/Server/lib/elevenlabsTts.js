function createHttpError(status, error, details = "") {
  const err = new Error(error || "tts_error");
  err.status = Number(status) || 500;
  err.error = String(error || "tts_error");
  err.details = String(details || "");
  return err;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseEnvNumber(name, fallback, min = 0, max = 1) {
  const raw = process.env[name];
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function parseEnvBoolean(name, fallback) {
  const raw = String(process.env[name] ?? "").trim().toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function sanitizeTextForSpeech(text) {
  let clean = String(text || "");
  if (!clean) return "";

  clean = clean
    .replace(/\*[^*]*\*/g, " ")
    .replace(/\[[^\]]*]/g, " ")
    .replace(/`{1,3}[^`]*`{1,3}/g, " ")
    .replace(/^\s{0,3}(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s{2,}/g, " ")
    .replace(/([!?.,])\1{1,}/g, "$1")
    .replace(/[|_~]/g, " ")
    .trim();

  clean = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ");

  return clean;
}

function shapeTextForConversationalTts(text, maxWordsPerPhrase = 22) {
  const clean = sanitizeTextForSpeech(text);
  if (!clean) return "";

  const sentenceLike = clean.match(/[^.!?]+[.!?]?/g) || [clean];
  const paced = [];

  for (const raw of sentenceLike) {
    const sentence = String(raw || "").trim();
    if (!sentence) continue;
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length <= maxWordsPerPhrase) {
      paced.push(sentence);
      continue;
    }

    let idx = 0;
    while (idx < words.length) {
      const remaining = words.length - idx;
      const take = remaining <= maxWordsPerPhrase ? remaining : Math.min(maxWordsPerPhrase, 16);
      let chunk = words.slice(idx, idx + take).join(" ");
      const isLast = idx + take >= words.length;
      if (isLast && !/[.!?]$/.test(chunk)) {
        chunk += ".";
      } else if (!isLast && !/[,:;]$/.test(chunk)) {
        chunk += ",";
      }
      paced.push(chunk);
      idx += take;
    }
  }

  return paced
    .join(" ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function createElevenLabsTts({
  apiKey = "",
  modelId = "eleven_multilingual_v2",
  outputFormat = "mp3_44100_128",
  voiceMap = {},
  timeoutMs = 20000
} = {}) {
  const key = String(apiKey || "").trim();
  const model = String(modelId || "eleven_multilingual_v2").trim();
  const format = String(outputFormat || "mp3_44100_128").trim();
  const timeout = Number.isFinite(Number(timeoutMs)) ? Number(timeoutMs) : 20000;
  const resolvedVoiceMap = {
    male: String(voiceMap?.male || "").trim(),
    female: String(voiceMap?.female || "").trim(),
    prof: String(voiceMap?.prof || "").trim(),
    default: String(voiceMap?.default || "").trim()
  };
  const perPhraseWords = parseEnvNumber("ELEVENLABS_TTS_MAX_WORDS_PER_PHRASE", 22, 10, 40);

  function buildProfileVoiceSettings(profile) {
    const p = String(profile || "").trim().toLowerCase();
    const defaults =
      p === "prof"
        ? { stability: 0.62, similarity_boost: 0.84, style: 0.18, use_speaker_boost: true }
        : p === "female"
        ? { stability: 0.46, similarity_boost: 0.8, style: 0.24, use_speaker_boost: true }
        : { stability: 0.34, similarity_boost: 0.86, style: 0.42, use_speaker_boost: true };
    const key = p === "female" ? "FEMALE" : p === "prof" ? "PROF" : "MALE";
    return {
      stability: parseEnvNumber(`ELEVENLABS_STABILITY_${key}`, defaults.stability),
      similarity_boost: parseEnvNumber(`ELEVENLABS_SIMILARITY_${key}`, defaults.similarity_boost),
      style: parseEnvNumber(`ELEVENLABS_STYLE_${key}`, defaults.style),
      use_speaker_boost: parseEnvBoolean(`ELEVENLABS_SPEAKER_BOOST_${key}`, defaults.use_speaker_boost)
    };
  }

  const resolvedProfileVoiceSettings = {
    male: buildProfileVoiceSettings("male"),
    female: buildProfileVoiceSettings("female"),
    prof: buildProfileVoiceSettings("prof")
  };

  function resolveVoiceId(profile) {
    const normalized = String(profile || "").trim().toLowerCase();
    if (normalized === "male" || normalized === "female" || normalized === "prof" || normalized === "default") {
      return resolvedVoiceMap[normalized];
    }
    return "";
  }

  function firstAvailableVoiceId() {
    return resolvedVoiceMap.default || resolvedVoiceMap.male || resolvedVoiceMap.female || resolvedVoiceMap.prof || "";
  }

  function availableProfiles() {
    return ["male", "female", "prof"].filter((p) => Boolean(resolveVoiceId(p)));
  }

  function resolveVoiceIdWithFallback(profile) {
    const requested = String(profile || "").trim().toLowerCase();
    const direct = resolveVoiceId(requested);
    if (direct) return { voiceId: direct, effectiveProfile: requested, fallbackUsed: false };
    const fallback = firstAvailableVoiceId();
    if (!fallback) return { voiceId: "", effectiveProfile: requested, fallbackUsed: false };
    return { voiceId: fallback, effectiveProfile: requested, fallbackUsed: true };
  }

  function voiceSettingsForProfile(profile) {
    const p = String(profile || "").trim().toLowerCase();
    if (p === "female" || p === "prof") return resolvedProfileVoiceSettings[p];
    return resolvedProfileVoiceSettings.male;
  }

  function getConfigState() {
    const keyConfigured = Boolean(key);
    const profiles = availableProfiles();
    const profilesConfigured = Boolean(profiles.length);
    const allProfilesConfigured =
      Boolean(resolvedVoiceMap.male) && Boolean(resolvedVoiceMap.female) && Boolean(resolvedVoiceMap.prof);
    return {
      provider: keyConfigured ? "elevenlabs" : "browser_fallback",
      configured: keyConfigured && profilesConfigured,
      keyConfigured,
      profilesConfigured,
      allProfilesConfigured,
      availableProfiles: profiles,
      modelId: model,
      outputFormat: format,
      ttsPacingMaxWordsPerPhrase: perPhraseWords
    };
  }

  async function synthesize({ text, profile }) {
    const requestedProfile = String(profile || "").trim().toLowerCase();
    if (!["male", "female", "prof"].includes(requestedProfile)) {
      throw createHttpError(400, "invalid_profile", "profile must be one of male, female, prof");
    }

    const clean = shapeTextForConversationalTts(text, perPhraseWords);
    if (!clean) {
      throw createHttpError(400, "invalid_text", "text is required");
    }

    if (!key) {
      throw createHttpError(503, "tts_not_configured", "ELEVENLABS_API_KEY missing");
    }

    const resolved = resolveVoiceIdWithFallback(requestedProfile);
    const voiceId = resolved.voiceId;
    if (!voiceId) {
      throw createHttpError(
        503,
        "tts_not_configured",
        `no voice id configured. Set ELEVENLABS_VOICE_MALE (or FEMALE/PROF/DEFAULT) in Server/.env`
      );
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), timeout);

    let response;
    try {
      response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(
          format
        )}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": key,
            "Content-Type": "application/json",
            Accept: "audio/mpeg"
          },
          body: JSON.stringify({
            text: clean.slice(0, 5000),
            model_id: model,
            voice_settings: voiceSettingsForProfile(requestedProfile)
          }),
          signal: controller.signal
        }
      );
    } catch (err) {
      if (err?.name === "AbortError") {
        throw createHttpError(502, "elevenlabs_timeout", "tts request timed out");
      }
      throw createHttpError(502, "elevenlabs_network_error", String(err?.message || err));
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let details = "";
      try {
        details = await response.text();
      } catch {}
      throw createHttpError(502, "elevenlabs_upstream_error", `status=${response.status} ${details}`.trim());
    }

    let buffer;
    try {
      const arr = await response.arrayBuffer();
      buffer = Buffer.from(arr);
    } catch (err) {
      throw createHttpError(502, "elevenlabs_invalid_audio", String(err?.message || err));
    }

    if (!buffer || buffer.length <= 0) {
      throw createHttpError(502, "elevenlabs_empty_audio", "empty audio payload");
    }

    return {
      ok: true,
      audioBuffer: buffer,
      contentType: "audio/mpeg",
      profile: requestedProfile,
      effectiveProfile: resolved.effectiveProfile,
      voiceFallbackUsed: resolved.fallbackUsed
    };
  }

  return {
    sanitizeTextForSpeech,
    shapeTextForConversationalTts,
    resolveVoiceId,
    getConfigState,
    synthesize
  };
}
