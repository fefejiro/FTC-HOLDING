/**
 * Nigerian Pidgin Phrase Dataset v1
 * 50 high-impact phrases used in Nigerian music
 * Each phrase includes: term, meaning, cultural usage, and emotional intent
 */

export interface NigerianPhrase {
  phrase: string;
  meaning: string;
  culturalUsage: string;
  emotionalIntent: string;
  variations?: string[];
}

export const NIGERIAN_PHRASES: NigerianPhrase[] = [
  // Greetings & Expressions
  {
    phrase: "wetin dey",
    meaning: "What's happening? / What's going on?",
    culturalUsage: "Common greeting or check-in, like 'what's up'",
    emotionalIntent: "Casual, friendly connection",
    variations: ["wetin dey happen", "wetin sup"]
  },
  {
    phrase: "how far",
    meaning: "How are you? / What's up?",
    culturalUsage: "Universal Nigerian greeting used across all social classes",
    emotionalIntent: "Warm, familiar acknowledgment"
  },
  {
    phrase: "e go be",
    meaning: "It will be fine / Everything will work out",
    culturalUsage: "Expression of hope and resilience despite challenges",
    emotionalIntent: "Optimistic, reassuring, faith-based hope"
  },
  {
    phrase: "na so",
    meaning: "That's how it is / It is what it is",
    culturalUsage: "Acceptance of situation, often with subtle resignation",
    emotionalIntent: "Philosophical acceptance, sometimes melancholic"
  },
  {
    phrase: "wahala",
    meaning: "Trouble / Problem / Drama",
    culturalUsage: "Describes any kind of difficulty or complication",
    emotionalIntent: "Exasperation, concern, or humorous complaint",
    variations: ["wahala dey", "no wahala"]
  },
  
  // Love & Relationships
  {
    phrase: "she been tell me",
    meaning: "She told me / She has been telling me",
    culturalUsage: "Recounting what a woman said, often in romantic context",
    emotionalIntent: "Reflective, often dealing with love or betrayal"
  },
  {
    phrase: "my woman",
    meaning: "My girlfriend / My love / My significant other",
    culturalUsage: "Term of endearment showing ownership and care",
    emotionalIntent: "Possessive love, pride in partnership"
  },
  {
    phrase: "jara",
    meaning: "Extra / Bonus / Something added for free",
    culturalUsage: "In love context, giving more than expected",
    emotionalIntent: "Generosity, going above and beyond"
  },
  {
    phrase: "omo",
    meaning: "Child / Person / Exclamation of surprise",
    culturalUsage: "Can mean 'wow' or refer to someone, context-dependent",
    emotionalIntent: "Surprise, emphasis, or casual reference",
    variations: ["omo see", "omo this one"]
  },
  {
    phrase: "baby girl",
    meaning: "Attractive woman / Girlfriend / Term of endearment",
    culturalUsage: "Affectionate term for women in music and daily life",
    emotionalIntent: "Admiration, romantic interest"
  },
  
  // Money & Success
  {
    phrase: "sho mo",
    meaning: "Do you know? / You know what I mean?",
    culturalUsage: "Yoruba phrase popularized by Olamide, seeking acknowledgment",
    emotionalIntent: "Assertive, confident, seeking validation"
  },
  {
    phrase: "owo",
    meaning: "Money (Yoruba)",
    culturalUsage: "Central theme in Nigerian music - wealth and prosperity",
    emotionalIntent: "Aspiration, celebration of success"
  },
  {
    phrase: "ego",
    meaning: "Money (Igbo)",
    culturalUsage: "Often used in Eastern Nigerian music",
    emotionalIntent: "Prosperity, hard work paying off"
  },
  {
    phrase: "baller",
    meaning: "Someone with money / Big spender",
    culturalUsage: "Celebration of wealth and living large",
    emotionalIntent: "Pride, flexing, confidence"
  },
  {
    phrase: "doings",
    meaning: "Activities / Lifestyle / Living well",
    culturalUsage: "Refers to enjoying life with money and status",
    emotionalIntent: "Celebration, showing off success"
  },
  {
    phrase: "we dey ball",
    meaning: "We're living lavishly / Having a good time",
    culturalUsage: "Expression of enjoying success and good life",
    emotionalIntent: "Joy, celebration, victory"
  },
  
  // Street Life & Hustle
  {
    phrase: "street",
    meaning: "The hustle / Tough life / Working class reality",
    culturalUsage: "Represents struggle, survival, and street wisdom",
    emotionalIntent: "Gritty determination, authenticity"
  },
  {
    phrase: "hustle",
    meaning: "Work hard / Grind / Make money by any means",
    culturalUsage: "Central to Nigerian youth culture - the grind mindset",
    emotionalIntent: "Determination, ambition, survival"
  },
  {
    phrase: "dey kampe",
    meaning: "Doing well / Standing strong",
    culturalUsage: "Resilience despite challenges",
    emotionalIntent: "Confidence, stability, assurance"
  },
  {
    phrase: "no dey slack",
    meaning: "Don't slow down / Stay focused",
    culturalUsage: "Motivational phrase about maintaining effort",
    emotionalIntent: "Encouragement, discipline"
  },
  {
    phrase: "level up",
    meaning: "Upgrade / Improve status / Progress",
    culturalUsage: "Aspiration to move to a higher social/financial level",
    emotionalIntent: "Ambition, growth mindset"
  },
  
  // Emotions & States
  {
    phrase: "sapa",
    meaning: "Broke / Having no money",
    culturalUsage: "Popular term for financial struggles",
    emotionalIntent: "Humorous self-deprecation, commiseration"
  },
  {
    phrase: "cruise",
    meaning: "Fun / Vibes / Not serious",
    culturalUsage: "Enjoying life without heavy concerns",
    emotionalIntent: "Lighthearted, playful, carefree"
  },
  {
    phrase: "gbas gbos",
    meaning: "Back and forth / Drama / Exchange of words",
    culturalUsage: "Conflict or heated exchange",
    emotionalIntent: "Confrontational, dramatic"
  },
  {
    phrase: "vibe",
    meaning: "Mood / Energy / Good feeling",
    culturalUsage: "Describes atmosphere or connection",
    emotionalIntent: "Positive energy, connection"
  },
  {
    phrase: "para",
    meaning: "Anger / Outrage / Going off",
    culturalUsage: "Expressing strong displeasure",
    emotionalIntent: "Frustration, righteous anger"
  },
  
  // Actions & Commands
  {
    phrase: "comot",
    meaning: "Get out / Leave / Remove",
    culturalUsage: "Direct command to leave or remove something",
    emotionalIntent: "Dismissive, authoritative"
  },
  {
    phrase: "chop",
    meaning: "Eat / Enjoy / Use (money)",
    culturalUsage: "Can mean eating food or spending money",
    emotionalIntent: "Enjoyment, consumption"
  },
  {
    phrase: "japa",
    meaning: "Run away / Flee / Leave Nigeria",
    culturalUsage: "Modern term for emigrating, especially to escape hardship",
    emotionalIntent: "Desperation, seeking better life",
    variations: ["japa o"]
  },
  {
    phrase: "shayo",
    meaning: "Alcohol / Drinking / Partying",
    culturalUsage: "Party culture and celebration",
    emotionalIntent: "Celebratory, sometimes escapist"
  },
  {
    phrase: "gbe body e",
    meaning: "Lift your body / Dance / Move",
    culturalUsage: "Dance command in Afrobeats",
    emotionalIntent: "Energetic, commanding, festive"
  },
  
  // Affirmations & Responses
  {
    phrase: "na you baddest",
    meaning: "You're the best / You're amazing",
    culturalUsage: "High praise and admiration",
    emotionalIntent: "Admiration, hype"
  },
  {
    phrase: "mad o",
    meaning: "That's crazy / Impressive / Unbelievable",
    culturalUsage: "Expression of amazement",
    emotionalIntent: "Surprised admiration"
  },
  {
    phrase: "e choke",
    meaning: "It's intense / It's overwhelming (positively)",
    culturalUsage: "Describing something impressively good",
    emotionalIntent: "Awe, being overwhelmed by quality"
  },
  {
    phrase: "correct",
    meaning: "Right / Authentic / Good quality",
    culturalUsage: "Approval of something genuine",
    emotionalIntent: "Appreciation, validation"
  },
  {
    phrase: "shakara",
    meaning: "Showing off / Playing hard to get / Putting on airs",
    culturalUsage: "Often used about women who are being coy",
    emotionalIntent: "Flirtatious frustration, admiration"
  },
  
  // Spiritual & Cultural
  {
    phrase: "God dey",
    meaning: "God exists / God will provide",
    culturalUsage: "Expression of faith and trust in divine providence",
    emotionalIntent: "Hopeful, surrendering to higher power"
  },
  {
    phrase: "baba God",
    meaning: "Father God / The almighty",
    culturalUsage: "Reverent reference to God",
    emotionalIntent: "Grateful, prayerful"
  },
  {
    phrase: "ori mi",
    meaning: "My head / My destiny (Yoruba)",
    culturalUsage: "Yoruba spiritual concept - the head carries one's destiny",
    emotionalIntent: "Self-affirmation, spiritual grounding"
  },
  {
    phrase: "ase",
    meaning: "Power to make things happen (Yoruba)",
    culturalUsage: "Spiritual force behind manifestation",
    emotionalIntent: "Empowered, commanding reality"
  },
  {
    phrase: "chi",
    meaning: "Personal god / Destiny (Igbo)",
    culturalUsage: "Igbo spiritual concept of personal divine spirit",
    emotionalIntent: "Deep spiritual identity"
  },
  
  // Social & Relationships
  {
    phrase: "paddy",
    meaning: "Friend / Close companion",
    culturalUsage: "Term for trusted friend",
    emotionalIntent: "Loyalty, brotherhood",
    variations: ["padi", "padi mi"]
  },
  {
    phrase: "geng",
    meaning: "Gang / Crew / Close friends",
    culturalUsage: "Your inner circle, popularized by artists",
    emotionalIntent: "Solidarity, exclusivity"
  },
  {
    phrase: "maga",
    meaning: "Fool / Someone easily deceived",
    culturalUsage: "Often in context of scams or being taken advantage of",
    emotionalIntent: "Cautionary, sometimes predatory"
  },
  {
    phrase: "original",
    meaning: "Authentic / Real / First of its kind",
    culturalUsage: "Praise for authenticity",
    emotionalIntent: "Respect, recognition"
  },
  {
    phrase: "chairman",
    meaning: "Boss / Leader / Respected person",
    culturalUsage: "Title of respect and authority",
    emotionalIntent: "Reverence, acknowledgment of status"
  },
  
  // Party & Dance
  {
    phrase: "zanku",
    meaning: "Dance style / Leg movement",
    culturalUsage: "Popular dance style in Afrobeats",
    emotionalIntent: "Energetic, trendy"
  },
  {
    phrase: "shaku shaku",
    meaning: "Dance style / Vibe",
    culturalUsage: "Dance and music movement",
    emotionalIntent: "Celebratory, street culture"
  },
  {
    phrase: "ijo",
    meaning: "Dance (Yoruba)",
    culturalUsage: "Core element of Nigerian music culture",
    emotionalIntent: "Joy, expression, celebration"
  },
  {
    phrase: "turn up",
    meaning: "Party hard / Get lit",
    culturalUsage: "Party culture",
    emotionalIntent: "Excitement, release"
  },
  {
    phrase: "meji",
    meaning: "Two / twice / in pairs (Yoruba)",
    culturalUsage: "Common Yoruba counting word often repeated in hooks for rhythm or emphasis",
    emotionalIntent: "Rhythmic emphasis, playful repetition"
  },
  {
    phrase: "jaiye",
    meaning: "Enjoy life / live well (Yoruba slang)",
    culturalUsage: "Used in Nigerian music to celebrate soft life, fun, and spending on enjoyment",
    emotionalIntent: "Celebration, freedom, enjoyment",
    variations: ["jaye", "jaiye lo", "jaye lo"]
  },
  {
    phrase: "gbadun",
    meaning: "Enjoy / take pleasure in (Yoruba)",
    culturalUsage: "Used to describe savoring good company, fun, or comfort",
    emotionalIntent: "Pleasure, warmth, appreciation"
  }
];

/**
 * Find phrases that match in given text (case-insensitive)
 */
export function findMatchingPhrases(text: string): NigerianPhrase[] {
  const lowerText = text.toLowerCase();
  return NIGERIAN_PHRASES.filter(phrase => {
    if (lowerText.includes(phrase.phrase.toLowerCase())) {
      return true;
    }
    // Check variations
    if (phrase.variations) {
      return phrase.variations.some(v => lowerText.includes(v.toLowerCase()));
    }
    return false;
  });
}

/**
 * Get random phrases for a given category/mood
 */
export function getRandomPhrases(count: number = 5): NigerianPhrase[] {
  const shuffled = [...NIGERIAN_PHRASES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
