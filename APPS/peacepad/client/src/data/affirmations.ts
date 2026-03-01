export const affirmations = {
  patience: [
    "You can disagree and still be kind.",
    "Patience is a gift your kids will feel.",
    "Taking a breath before responding shows strength.",
    "Progress, not perfection, builds trust.",
  ],
  peace: [
    "Peace starts with listening, even to yourself.",
    "Small calm moments make strong families.",
    "Your calm response today shapes tomorrow's peace.",
    "Choosing peace is choosing your children's well-being.",
  ],
  multicultural: [
    "Your roots make you strong.",
    "No two families drum to the same beat. Yours is perfect.",
    "Diversity in your family is a beautiful strength.",
    "Different traditions can coexist in harmony.",
  ],
  communication: [
    "Clear words build bridges, not walls.",
    "Listening is the first step to being heard.",
    "Respectful communication benefits everyone.",
    "Your tone matters as much as your words.",
  ],
  coparenting: [
    "You're both working toward the same goal: your children's happiness.",
    "Cooperation today creates stability for your kids.",
    "Flexibility in co-parenting shows strength, not weakness.",
    "Your teamwork gives your children security.",
  ],
};

export type AffirmationTheme = keyof typeof affirmations;

export function getRandomAffirmation(theme?: AffirmationTheme): string {
  if (theme && affirmations[theme]) {
    const themeAffirmations = affirmations[theme];
    return themeAffirmations[Math.floor(Math.random() * themeAffirmations.length)];
  }
  
  // Random theme
  const themes = Object.keys(affirmations) as AffirmationTheme[];
  const randomTheme = themes[Math.floor(Math.random() * themes.length)];
  return getRandomAffirmation(randomTheme);
}

export function getDailyAffirmation(): string {
  const today = new Date().toDateString();
  const stored = localStorage.getItem("daily_affirmation");
  const storedData = stored ? JSON.parse(stored) : null;
  
  if (storedData && storedData.date === today) {
    return storedData.affirmation;
  }
  
  const newAffirmation = getRandomAffirmation();
  localStorage.setItem("daily_affirmation", JSON.stringify({
    date: today,
    affirmation: newAffirmation,
  }));
  
  return newAffirmation;
}
