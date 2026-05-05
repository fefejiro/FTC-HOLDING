#!/usr/bin/env node
// Standalone test harness for the upgraded cultural-analysis prompt.
// Mirrors generateCulturalAnalysis() in _restore_repo/APPS/saywetin/server/openai-service.ts
// Uses fetch directly to avoid SDK install. Requires OPENAI_API_KEY in env.

const KEY = process.env.OPENAI_API_KEY;
if (!KEY) { console.error('OPENAI_API_KEY missing'); process.exit(1); }

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const SAMPLES = [
  { line: 'tuff kin king Nkemakonam', song: 'Last Last', artist: 'Burna Boy', genre: 'Afrobeats', lang: 'Pidgin English + Igbo' },
  { line: 'Nkemakonam, e go be',       song: 'Test',      artist: 'Generic',   genre: 'Afro-fusion', lang: 'Igbo + Pidgin' },
  { line: 'Odogwu, we dey ball',       song: 'Test',      artist: 'Generic',   genre: 'Afro-rap',    lang: 'Igbo + Pidgin' },
  { line: 'Sho mo say I sabi am, abeg', song: 'Test',     artist: 'Generic',   genre: 'Afrobeats',   lang: 'Yoruba + Pidgin' },
];

function buildPrompt(s) {
  return `You are a renowned expert in African music, languages, and culture with deep knowledge of:
- Yoruba, Igbo, Hausa, Zulu, Xhosa, Swahili, Amharic, Somali, and other African languages
- Pidgin English (Nigerian, Ghanaian, Cameroonian varieties)
- Code-switching patterns in African music
- Traditional African proverbs, idioms, and metaphors
- Historical and political context of African songs
- Religious and spiritual references in African music

This line is from "${s.song}" by ${s.artist}. Genre: ${s.genre}. The language is likely ${s.lang}.

Lyric line: "${s.line}"

CRITICAL DECODING RULES — apply BEFORE translating:
1. African personal names carry literal meaning. If a line contains a name like "Nkemakonam", "Chinwe", "Olamide", "Obafemi", "Adetokunbo", "Ifeanyichukwu", "Oluwadamilola" etc., translate the NAME ITSELF (e.g., Nkemakonam = Igbo "What is mine shall not pass me by"; Olamide = Yoruba "My wealth has come home"). Put the literal meaning in deeperMeaning, not just "a Nigerian name".
2. Rap and Afro-fusion artists stylize spelling phonetically. Normalize before parsing: "tuff"→"tough", "kin" can mean "kind" / "kingdom" / "kin/family" depending on context, "sef"→"self", "abeg"→"I beg/please", "sabi"→"know", "jare"→emphatic particle, "shey"→"is it that", "o"→emphatic suffix. If the literal reading is gibberish, try 2-3 alternate parses and pick the one that fits the artist's flow.
3. Multi-word stylized phrases (e.g. "tuff kin king") are usually a play on "tough kind king" / "tough kingdom" / "too tough king" — explain the wordplay AND the most likely intended meaning.
4. Never output "Translation unavailable" or "a Nigerian phrase" as the answer. If genuinely uncertain, give the most likely interpretation and flag uncertainty in languageNotes.

Provide a scholarly, in-depth analysis in JSON format:

{
  "translation": "Natural, contextual English translation (not literal word-for-word). Preserve the poetic feel. For lines that are just a name, translate the name's literal meaning.",
  "detectedLanguage": "Specific language(s) detected (e.g., 'Yoruba', 'Pidgin English + Igbo', 'Zulu')",
  "culturalContext": "3-4 sentences explaining cultural references, traditions, proverbs, symbolism, or historical context. What cultural knowledge helps understand this line?",
  "artistIntent": "2-3 sentences on what the artist likely meant to express. What emotion, message, or story are they conveying?",
  "deeperMeaning": "2-3 sentences on wordplay, hidden meanings, double entendres, layered name-meanings, or stylized spelling decoded. Any linguistic creativity?",
  "languageNotes": "Optional: Explain code-switching, dialect choices, name origin, or de-stylized spelling (if applicable). Flag uncertainty here. Leave empty if not relevant."
}

Important:
- Be specific and scholarly, not generic
- Reference actual cultural traditions and concepts
- Explain proverbs and idioms fully
- Translate African names by their literal meaning, not just label them as "a name"
- De-stylize phonetic rap spelling before analyzing
- Note if there's wordplay or multiple meanings
- If code-switching occurs, explain WHY (cultural significance)`;
}

async function callOpenAI(prompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

(async () => {
  for (const s of SAMPLES) {
    console.log('\n' + '='.repeat(80));
    console.log(`LINE: "${s.line}"   (${s.song} — ${s.artist})`);
    console.log('='.repeat(80));
    try {
      const r = await callOpenAI(buildPrompt(s));
      console.log('translation     :', r.translation);
      console.log('detectedLanguage:', r.detectedLanguage);
      console.log('culturalContext :', r.culturalContext);
      console.log('artistIntent    :', r.artistIntent);
      console.log('deeperMeaning   :', r.deeperMeaning);
      if (r.languageNotes) console.log('languageNotes   :', r.languageNotes);
    } catch (e) {
      console.error('FAIL:', e.message);
    }
  }
})();
