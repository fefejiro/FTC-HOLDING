// Empathetic prompts for mood check-ins and reflections
export const REFLECTION_PROMPTS = [
  {
    title: "Taking a moment for yourself",
    description: "You've been engaged in some important conversations. How are you feeling right now?",
  },
  {
    title: "A gentle pause",
    description: "It's okay to take a breath. Let's check in with how you're doing.",
  },
  {
    title: "Noticing your emotions",
    description: "Your feelings matter. Take a moment to reflect on your experience today.",
  },
  {
    title: "Creating space for yourself",
    description: "You've been working through some things. How would you describe your mood?",
  },
  {
    title: "Honoring your feelings",
    description: "There's no right or wrong way to feel. What's coming up for you right now?",
  },
  {
    title: "Checking in with yourself",
    description: "You deserve this moment of reflection. How has today been for you?",
  },
];

// Breathing prompts shown before difficult conversations
export const BREATHING_PROMPTS = [
  "Taking a breath before responding shows strength.",
  "Pausing before you speak is a sign of wisdom, not weakness.",
  "Your calm response today builds trust for tomorrow.",
  "One deep breath can change the tone of an entire conversation.",
  "This moment of pause is a gift to yourself and your family.",
  "Responding from a calm place serves everyone, especially your kids.",
  "You can't control their words, but you can choose your response.",
  "Taking time to respond thoughtfully is setting a powerful example.",
];

// Transition prompts when moving from activity to dormancy
export const TRANSITION_PROMPTS = [
  {
    title: "Acknowledging your effort",
    description: "That conversation took energy. It's natural to have feelings about it.",
  },
  {
    title: "Processing what happened",
    description: "Give yourself permission to notice how that exchange affected you.",
  },
  {
    title: "Making space for reflection",
    description: "Every conversation is an opportunity to learn about yourself.",
  },
  {
    title: "Honoring the work you're doing",
    description: "Co-parenting communication isn't easy. You're showing up, and that matters.",
  },
];

// Supportive phrases for different moods
export const MOOD_RESPONSES = {
  positive: [
    "It's wonderful that you're feeling good. These moments of positivity matter.",
    "Your positive energy can ripple out to everyone around you.",
    "Feeling good is something worth acknowledging and celebrating.",
  ],
  neutral: [
    "Neutral is perfectly valid. Not every moment needs to be a high or low.",
    "Sometimes steady and calm is exactly what we need.",
    "Being in the middle ground shows balance and perspective.",
  ],
  negative: [
    "It's okay to feel difficult emotions. They're information, not failure.",
    "Hard feelings are part of the journey. You don't have to carry them alone.",
    "Acknowledging when things feel tough is an act of self-awareness.",
    "These feelings won't last forever, even when they feel heavy right now.",
  ],
};

// Random selection helpers
export function getRandomReflectionPrompt() {
  return REFLECTION_PROMPTS[Math.floor(Math.random() * REFLECTION_PROMPTS.length)];
}

export function getRandomBreathingPrompt() {
  return BREATHING_PROMPTS[Math.floor(Math.random() * BREATHING_PROMPTS.length)];
}

export function getRandomTransitionPrompt() {
  return TRANSITION_PROMPTS[Math.floor(Math.random() * TRANSITION_PROMPTS.length)];
}

export function getMoodResponse(mood: 'positive' | 'neutral' | 'negative') {
  const responses = MOOD_RESPONSES[mood];
  return responses[Math.floor(Math.random() * responses.length)];
}
