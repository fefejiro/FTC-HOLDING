export type LegacyWeatherCondition = "sunny" | "rainy" | "snowy" | "cloudy" | "windy" | "hot" | "cold";

export interface LegacyWeatherActivity {
  id: string;
  title: string;
  description: string;
  ageMinMonths: number;
  ageMaxMonths: number;
  activityType: "indoor" | "outdoor" | "flexible";
  weatherConditions: readonly LegacyWeatherCondition[];
  category: "active" | "creative" | "educational" | "sensory" | "social";
  durationMinutes: string;
  materialsNeeded: readonly string[];
}

// Ported from the legacy weather-activities page/seed. This is intentionally
// a read-only client catalogue until a production V2 content endpoint exists.
export const legacyWeatherActivities: readonly LegacyWeatherActivity[] = [
  {
    id: "backyard-treasure-hunt",
    title: "Backyard Treasure Hunt",
    description: "Create a treasure map and hide small toys or treats around the backyard. Kids love the excitement of finding hidden treasures!",
    ageMinMonths: 24,
    ageMaxMonths: 120,
    activityType: "outdoor",
    weatherConditions: ["sunny", "cloudy"],
    category: "active",
    durationMinutes: "30-60",
    materialsNeeded: ["Small toys or treats", "Paper for map", "Crayons"]
  },
  {
    id: "nature-scavenger-hunt",
    title: "Nature Scavenger Hunt",
    description: "Create a list of natural items to find, such as a pinecone, smooth rock, or feather. Take photos of each discovery!",
    ageMinMonths: 36,
    ageMaxMonths: 144,
    activityType: "outdoor",
    weatherConditions: ["sunny", "cloudy"],
    category: "educational",
    durationMinutes: "45-90",
    materialsNeeded: ["Printed checklist", "Small bag for collection", "Phone for photos"]
  },
  {
    id: "sidewalk-chalk-art",
    title: "Sidewalk Chalk Art Gallery",
    description: "Turn the driveway into an art gallery. Draw pictures, practise letters, or create a colourful hopscotch course.",
    ageMinMonths: 24,
    ageMaxMonths: 96,
    activityType: "outdoor",
    weatherConditions: ["sunny", "cloudy"],
    category: "creative",
    durationMinutes: "30-60",
    materialsNeeded: ["Sidewalk chalk", "Water for cleanup"]
  },
  {
    id: "park-playground-adventure",
    title: "Park Playground Adventure",
    description: "Visit a new playground nearby. Bring a picnic lunch and make it a special outing.",
    ageMinMonths: 12,
    ageMaxMonths: 144,
    activityType: "outdoor",
    weatherConditions: ["sunny", "cloudy"],
    category: "active",
    durationMinutes: "60-120",
    materialsNeeded: ["Sunscreen", "Water bottles", "Snacks", "Blanket"]
  },
  {
    id: "water-balloon-toss",
    title: "Water Balloon Toss",
    description: "Start close together and take a step back after each successful catch. Perfect for a hot day.",
    ageMinMonths: 36,
    ageMaxMonths: 144,
    activityType: "outdoor",
    weatherConditions: ["sunny", "hot"],
    category: "active",
    durationMinutes: "20-40",
    materialsNeeded: ["Water balloons", "Towels", "Change of clothes"]
  },
  {
    id: "indoor-fort-building",
    title: "Indoor Fort Building",
    description: "Use blankets, pillows, and furniture to create a cosy fort. Perfect for reading stories inside.",
    ageMinMonths: 24,
    ageMaxMonths: 120,
    activityType: "indoor",
    weatherConditions: ["rainy", "cold"],
    category: "creative",
    durationMinutes: "45-120",
    materialsNeeded: ["Blankets", "Pillows", "Chairs or couch cushions", "Flashlight", "Books"]
  },
  {
    id: "baking-together",
    title: "Baking Together",
    description: "Make simple cookies or muffins. Kids can measure ingredients and decorate the treats.",
    ageMinMonths: 30,
    ageMaxMonths: 144,
    activityType: "indoor",
    weatherConditions: ["rainy", "cold", "snowy"],
    category: "educational",
    durationMinutes: "60-90",
    materialsNeeded: ["Recipe ingredients", "Mixing bowls", "Measuring cups", "Cookie cutters"]
  },
  {
    id: "living-room-dance-party",
    title: "Living Room Dance Party",
    description: "Create a playlist of favourite songs and dance together. Add freeze dance or musical statues for extra fun.",
    ageMinMonths: 18,
    ageMaxMonths: 120,
    activityType: "indoor",
    weatherConditions: ["rainy", "cold", "snowy", "cloudy"],
    category: "active",
    durationMinutes: "20-45",
    materialsNeeded: ["Music player", "Space to move"]
  },
  {
    id: "rainy-day-puddle-jumping",
    title: "Rainy Day Puddle Jumping",
    description: "Put on rain boots and splash in puddles. Embrace the rain and make it an adventure.",
    ageMinMonths: 24,
    ageMaxMonths: 96,
    activityType: "outdoor",
    weatherConditions: ["rainy"],
    category: "active",
    durationMinutes: "15-30",
    materialsNeeded: ["Rain boots", "Raincoat", "Towels for after", "Warm bath ready"]
  },
  {
    id: "diy-playdough",
    title: "DIY Playdough Making",
    description: "Make homemade playdough, then create sculptures and shapes. Add food colouring for rainbow fun.",
    ageMinMonths: 24,
    ageMaxMonths: 84,
    activityType: "indoor",
    weatherConditions: ["rainy", "cold", "cloudy"],
    category: "sensory",
    durationMinutes: "45-90",
    materialsNeeded: ["Flour", "Salt", "Cream of tartar", "Vegetable oil", "Food colouring", "Water"]
  },
  {
    id: "indoor-obstacle-course",
    title: "Indoor Obstacle Course",
    description: "Use pillows, tape, and household items to create a fun obstacle course. Time each round.",
    ageMinMonths: 30,
    ageMaxMonths: 120,
    activityType: "indoor",
    weatherConditions: ["rainy", "cold", "snowy"],
    category: "active",
    durationMinutes: "30-60",
    materialsNeeded: ["Masking tape", "Pillows", "Chairs", "Stuffed animals", "Timer"]
  },
  {
    id: "build-a-snowman-family",
    title: "Build a Snowman Family",
    description: "Create a whole family of snow people and use natural materials for faces and accessories.",
    ageMinMonths: 30,
    ageMaxMonths: 144,
    activityType: "outdoor",
    weatherConditions: ["snowy", "cold"],
    category: "creative",
    durationMinutes: "30-90",
    materialsNeeded: ["Warm winter clothes", "Carrots", "Sticks", "Buttons or rocks", "Scarves and hats"]
  },
  {
    id: "indoor-story-time",
    title: "Indoor Hibernation Story Time",
    description: "Cuddle up with favourite books and create a cosy reading nook with blankets.",
    ageMinMonths: 12,
    ageMaxMonths: 120,
    activityType: "indoor",
    weatherConditions: ["snowy", "cold"],
    category: "educational",
    durationMinutes: "30-90",
    materialsNeeded: ["Favourite books", "Blankets", "Hot cocoa", "Marshmallows"]
  },
  {
    id: "diy-water-park",
    title: "DIY Water Park",
    description: "Set up sprinklers, a water table, or a small pool. Stay cool while having a blast.",
    ageMinMonths: 24,
    ageMaxMonths: 120,
    activityType: "outdoor",
    weatherConditions: ["hot", "sunny"],
    category: "active",
    durationMinutes: "60-120",
    materialsNeeded: ["Sprinkler", "Kiddie pool", "Water toys", "Sunscreen", "Towels"]
  },
  {
    id: "frozen-treat-making",
    title: "Frozen Treat Making",
    description: "Make popsicles or fruit ice pops together and experiment with different combinations.",
    ageMinMonths: 24,
    ageMaxMonths: 144,
    activityType: "indoor",
    weatherConditions: ["hot"],
    category: "educational",
    durationMinutes: "15 prep + 4 hours freezing",
    materialsNeeded: ["Popsicle moulds", "Fruit juice or yogurt", "Fresh fruit pieces", "Freezer"]
  },
  {
    id: "movie-theater-at-home",
    title: "Movie Theater at Home",
    description: "Pick a family movie, make popcorn, and create a cosy movie-theater atmosphere at home.",
    ageMinMonths: 24,
    ageMaxMonths: 144,
    activityType: "indoor",
    weatherConditions: ["rainy", "cold", "snowy", "hot"],
    category: "social",
    durationMinutes: "90-120",
    materialsNeeded: ["Movie or streaming service", "Popcorn", "Blankets", "Pillows", "Dimmed lights"]
  },
  {
    id: "arts-and-crafts",
    title: "Arts and Crafts Afternoon",
    description: "Set up a crafting station with paper, glue, scissors, and recyclable materials. Let creativity flow.",
    ageMinMonths: 30,
    ageMaxMonths: 144,
    activityType: "indoor",
    weatherConditions: ["rainy", "cold", "hot", "cloudy"],
    category: "creative",
    durationMinutes: "45-120",
    materialsNeeded: ["Construction paper", "Glue", "Safety scissors", "Crayons or markers", "Stickers"]
  },
  {
    id: "board-game-tournament",
    title: "Board Game Tournament",
    description: "Choose age-appropriate games, keep score, and celebrate everyone who takes a turn.",
    ageMinMonths: 48,
    ageMaxMonths: 144,
    activityType: "indoor",
    weatherConditions: ["rainy", "cold", "snowy", "hot"],
    category: "social",
    durationMinutes: "60-120",
    materialsNeeded: ["Board games", "Paper for scorekeeping", "Small prizes"]
  },
  {
    id: "lego-building-challenge",
    title: "LEGO Building Challenge",
    description: "Set a timer and challenge each other to build a tower, vehicle, or anything you imagine.",
    ageMinMonths: 36,
    ageMaxMonths: 144,
    activityType: "indoor",
    weatherConditions: ["rainy", "cold", "hot", "cloudy", "snowy"],
    category: "creative",
    durationMinutes: "30-90",
    materialsNeeded: ["LEGO or building blocks", "Timer"]
  },
  {
    id: "bike-or-scooter-adventure",
    title: "Bike or Scooter Adventure",
    description: "Explore the neighbourhood on bikes or scooters. Stop at a park or for a treat.",
    ageMinMonths: 48,
    ageMaxMonths: 144,
    activityType: "outdoor",
    weatherConditions: ["sunny", "cloudy"],
    category: "active",
    durationMinutes: "30-90",
    materialsNeeded: ["Bikes or scooters", "Helmets", "Water bottles", "Snacks"]
  },
  {
    id: "yoga-and-mindfulness",
    title: "Yoga and Mindfulness for Kids",
    description: "Try simple yoga poses and breathing exercises for calm, focused time together.",
    ageMinMonths: 36,
    ageMaxMonths: 144,
    activityType: "indoor",
    weatherConditions: ["rainy", "cold", "hot", "cloudy", "snowy"],
    category: "active",
    durationMinutes: "15-30",
    materialsNeeded: ["Yoga mats or towels", "Comfortable clothes", "Calm music (optional)"]
  }
];

export function filterLegacyWeatherActivities(options: {
  ageMonths?: number;
  weatherCondition?: LegacyWeatherCondition;
} = {}): LegacyWeatherActivity[] {
  return legacyWeatherActivities.filter((activity) => {
    const ageMatches = options.ageMonths === undefined
      || (options.ageMonths >= activity.ageMinMonths && options.ageMonths <= activity.ageMaxMonths);
    const weatherMatches = options.weatherCondition === undefined
      || activity.weatherConditions.includes(options.weatherCondition);
    return ageMatches && weatherMatches;
  });
}
