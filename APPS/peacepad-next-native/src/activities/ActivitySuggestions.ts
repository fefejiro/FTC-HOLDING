export type ActivityWeather = "sunny" | "cloudy" | "rainy" | "snowy" | "hot" | "cold";

export type ActivitySuggestion = Readonly<{
  id: string;
  title: string;
  description: string;
  ageMinMonths: number;
  ageMaxMonths: number;
  activityType: "indoor" | "outdoor";
  weather: readonly ActivityWeather[];
  category: "active" | "creative" | "educational" | "sensory" | "social";
  duration: string;
  materials: readonly string[];
}>;

// This is the reviewed, non-personal activity catalogue from the established
// PeacePad web product. It is product content, not user or family data, and it
// deliberately remains on-device while the native API gains its own activity
// planning contract.
export const activitySuggestions: readonly ActivitySuggestion[] = [
  {
    id: "backyard-treasure-hunt",
    title: "Backyard Treasure Hunt",
    description: "Create a treasure map and hide small toys or treats around the backyard.",
    ageMinMonths: 24,
    ageMaxMonths: 120,
    activityType: "outdoor",
    weather: ["sunny", "cloudy"],
    category: "active",
    duration: "30–60 min",
    materials: ["Small toys or treats", "Paper for a map", "Crayons"]
  },
  {
    id: "nature-scavenger-hunt",
    title: "Nature Scavenger Hunt",
    description: "Make a list of natural items to find and take photos of each discovery.",
    ageMinMonths: 36,
    ageMaxMonths: 144,
    activityType: "outdoor",
    weather: ["sunny", "cloudy"],
    category: "educational",
    duration: "45–90 min",
    materials: ["Checklist", "Small bag", "Phone for photos"]
  },
  {
    id: "sidewalk-chalk-art",
    title: "Sidewalk Chalk Art Gallery",
    description: "Turn the driveway into an art gallery, letter practice, or hopscotch course.",
    ageMinMonths: 24,
    ageMaxMonths: 96,
    activityType: "outdoor",
    weather: ["sunny", "cloudy"],
    category: "creative",
    duration: "30–60 min",
    materials: ["Sidewalk chalk", "Water for cleanup"]
  },
  {
    id: "park-playground",
    title: "Park Playground Adventure",
    description: "Visit a playground and bring a picnic or snacks for a relaxed outing.",
    ageMinMonths: 12,
    ageMaxMonths: 144,
    activityType: "outdoor",
    weather: ["sunny", "cloudy"],
    category: "active",
    duration: "60–120 min",
    materials: ["Water bottles", "Snacks", "Blanket"]
  },
  {
    id: "water-balloon-toss",
    title: "Water Balloon Toss",
    description: "Start close together and take a step back after each successful catch.",
    ageMinMonths: 36,
    ageMaxMonths: 144,
    activityType: "outdoor",
    weather: ["sunny", "hot"],
    category: "active",
    duration: "20–40 min",
    materials: ["Water balloons", "Towels", "Change of clothes"]
  },
  {
    id: "indoor-fort",
    title: "Indoor Fort Building",
    description: "Use blankets, pillows, and furniture to make a calm reading fort together.",
    ageMinMonths: 24,
    ageMaxMonths: 120,
    activityType: "indoor",
    weather: ["rainy", "cold"],
    category: "creative",
    duration: "45–120 min",
    materials: ["Blankets", "Pillows", "Books"]
  },
  {
    id: "baking-together",
    title: "Baking Together",
    description: "Make simple cookies or muffins, with children helping measure and decorate.",
    ageMinMonths: 30,
    ageMaxMonths: 144,
    activityType: "indoor",
    weather: ["rainy", "cold", "snowy"],
    category: "educational",
    duration: "60–90 min",
    materials: ["Recipe ingredients", "Mixing bowls", "Measuring cups"]
  },
  {
    id: "living-room-dance",
    title: "Living Room Dance Party",
    description: "Create a playlist and add freeze dance or musical statues.",
    ageMinMonths: 18,
    ageMaxMonths: 120,
    activityType: "indoor",
    weather: ["rainy", "cold", "snowy", "cloudy"],
    category: "active",
    duration: "20–45 min",
    materials: ["Music player", "Space to move"]
  },
  {
    id: "puddle-jumping",
    title: "Rainy Day Puddle Jumping",
    description: "Put on rain boots and make puddle jumping a short, playful adventure.",
    ageMinMonths: 24,
    ageMaxMonths: 96,
    activityType: "outdoor",
    weather: ["rainy"],
    category: "active",
    duration: "15–30 min",
    materials: ["Rain boots", "Raincoat", "Towels"]
  },
  {
    id: "snowman-family",
    title: "Build a Snowman Family",
    description: "Create snow people using natural materials for faces and accessories.",
    ageMinMonths: 30,
    ageMaxMonths: 144,
    activityType: "outdoor",
    weather: ["snowy", "cold"],
    category: "creative",
    duration: "30–90 min",
    materials: ["Warm clothes", "Carrots", "Sticks", "Scarves"]
  },
  {
    id: "hibernation-story-time",
    title: "Indoor Hibernation Story Time",
    description: "Make a cozy reading nook with blankets, books, and a warm drink.",
    ageMinMonths: 12,
    ageMaxMonths: 120,
    activityType: "indoor",
    weather: ["snowy", "cold"],
    category: "educational",
    duration: "30–90 min",
    materials: ["Favourite books", "Blankets"]
  },
  {
    id: "diy-water-park",
    title: "DIY Water Park",
    description: "Set up sprinklers or water toys for a supervised way to stay cool.",
    ageMinMonths: 24,
    ageMaxMonths: 120,
    activityType: "outdoor",
    weather: ["hot", "sunny"],
    category: "active",
    duration: "60–120 min",
    materials: ["Sprinkler", "Water toys", "Sunscreen", "Towels"]
  },
  {
    id: "frozen-treats",
    title: "Frozen Treat Making",
    description: "Make popsicles or fruit ice pops together and choose the combinations.",
    ageMinMonths: 24,
    ageMaxMonths: 144,
    activityType: "indoor",
    weather: ["hot"],
    category: "educational",
    duration: "15 min prep + freezing",
    materials: ["Popsicle molds", "Fruit juice or yogurt", "Freezer"]
  },
  {
    id: "science-experiments",
    title: "Science Experiments Day",
    description: "Try simple experiments such as a baking soda volcano or rainbow milk.",
    ageMinMonths: 48,
    ageMaxMonths: 144,
    activityType: "indoor",
    weather: ["rainy", "cloudy", "cold"],
    category: "educational",
    duration: "45–90 min",
    materials: ["Baking soda", "Vinegar", "Food colouring"]
  },
  {
    id: "movie-at-home",
    title: "Movie Theatre at Home",
    description: "Choose a family film, make popcorn, and create a comfortable viewing space.",
    ageMinMonths: 24,
    ageMaxMonths: 144,
    activityType: "indoor",
    weather: ["rainy", "cold", "snowy", "hot"],
    category: "social",
    duration: "90–120 min",
    materials: ["Film or streaming service", "Popcorn", "Blankets"]
  }
];

export function filterActivitySuggestions({
  ageMonths,
  weather
}: Readonly<{ ageMonths?: number; weather?: ActivityWeather }>): readonly ActivitySuggestion[] {
  return activitySuggestions.filter((activity) =>
    (ageMonths === undefined || (ageMonths >= activity.ageMinMonths && ageMonths <= activity.ageMaxMonths))
    && (weather === undefined || activity.weather.includes(weather))
  );
}
