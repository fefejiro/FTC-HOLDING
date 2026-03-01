import { storage } from "./storage";

const defaultAchievements = [
  // Communication Achievements
  {
    code: "first_message",
    name: "First Steps",
    description: "Sent your first message",
    icon: "💬",
    category: "communication",
    tier: "bronze",
    requirement: 1,
  },
  {
    code: "messages_10",
    name: "Getting Started",
    description: "Sent 10 messages",
    icon: "📱",
    category: "communication",
    tier: "bronze",
    requirement: 10,
  },
  {
    code: "messages_50",
    name: "Active Communicator",
    description: "Sent 50 messages",
    icon: "💫",
    category: "communication",
    tier: "silver",
    requirement: 50,
  },
  {
    code: "messages_100",
    name: "Communication Champion",
    description: "Sent 100 messages",
    icon: "🏆",
    category: "communication",
    tier: "gold",
    requirement: 100,
  },
  
  // Streak Achievements
  {
    code: "streak_3",
    name: "Building Momentum",
    description: "Maintained a 3-day communication streak",
    icon: "🔥",
    category: "consistency",
    tier: "bronze",
    requirement: 3,
  },
  {
    code: "streak_7",
    name: "Week Warrior",
    description: "Maintained a 7-day communication streak",
    icon: "📅",
    category: "consistency",
    tier: "silver",
    requirement: 7,
  },
  {
    code: "streak_14",
    name: "Fortnight Champion",
    description: "Maintained a 14-day communication streak",
    icon: "🌟",
    category: "consistency",
    tier: "gold",
    requirement: 14,
  },
  {
    code: "streak_30",
    name: "Monthly Master",
    description: "Maintained a 30-day communication streak",
    icon: "💎",
    category: "consistency",
    tier: "platinum",
    requirement: 30,
  },
  
  // Positivity Achievements
  {
    code: "positive_10",
    name: "Positive Start",
    description: "Sent 10 positive messages",
    icon: "😊",
    category: "positivity",
    tier: "bronze",
    requirement: 10,
  },
  {
    code: "positive_25",
    name: "Spreading Kindness",
    description: "Sent 25 positive messages",
    icon: "💚",
    category: "positivity",
    tier: "silver",
    requirement: 25,
  },
  {
    code: "positive_50",
    name: "Positivity Expert",
    description: "Sent 50 positive messages",
    icon: "✨",
    category: "positivity",
    tier: "gold",
    requirement: 50,
  },
  {
    code: "positive_streak_7",
    name: "Week of Kindness",
    description: "Maintained 7-day positive tone streak",
    icon: "🌈",
    category: "positivity",
    tier: "gold",
    requirement: 7,
  },
  
  // Collaboration Achievements
  {
    code: "calendar_5",
    name: "Planning Ahead",
    description: "Created 5 calendar events",
    icon: "📆",
    category: "collaboration",
    tier: "bronze",
    requirement: 5,
  },
  {
    code: "tasks_5",
    name: "Task Master",
    description: "Completed 5 tasks",
    icon: "✅",
    category: "collaboration",
    tier: "bronze",
    requirement: 5,
  },
  {
    code: "tasks_20",
    name: "Getting Things Done",
    description: "Completed 20 tasks",
    icon: "🎯",
    category: "collaboration",
    tier: "silver",
    requirement: 20,
  },
  {
    code: "expenses_10",
    name: "Expense Tracker",
    description: "Logged 10 expenses",
    icon: "💰",
    category: "collaboration",
    tier: "bronze",
    requirement: 10,
  },
  {
    code: "conch_first",
    name: "Structured Communication",
    description: "Completed your first Conch Mode session",
    icon: "🐚",
    category: "collaboration",
    tier: "silver",
    requirement: 1,
  },
  {
    code: "conch_5",
    name: "Conversation Pro",
    description: "Completed 5 Conch Mode sessions",
    icon: "🎙️",
    category: "collaboration",
    tier: "gold",
    requirement: 5,
  },
  
  // Listening Achievements
  {
    code: "first_listen",
    name: "Active Listener",
    description: "Completed your first understanding check",
    icon: "👂",
    category: "listening",
    tier: "bronze",
    requirement: 1,
  },
  {
    code: "listen_3",
    name: "Attentive Ear",
    description: "Completed 3 understanding checks",
    icon: "🎧",
    category: "listening",
    tier: "bronze",
    requirement: 3,
  },
  {
    code: "listen_10",
    name: "Deep Listener",
    description: "Completed 10 understanding checks",
    icon: "💭",
    category: "listening",
    tier: "silver",
    requirement: 10,
  },
  {
    code: "listen_25",
    name: "Listening Master",
    description: "Completed 25 understanding checks",
    icon: "🏅",
    category: "listening",
    tier: "gold",
    requirement: 25,
  },
  {
    code: "perfect_score",
    name: "Perfect Understanding",
    description: "Scored 90% or higher on an understanding check",
    icon: "⭐",
    category: "listening",
    tier: "silver",
    requirement: 90,
  },
  {
    code: "listen_streak_3",
    name: "Listening Habit",
    description: "Maintained a 3-day listening streak",
    icon: "🔊",
    category: "listening",
    tier: "bronze",
    requirement: 3,
  },
  {
    code: "listen_streak_7",
    name: "Weekly Listener",
    description: "Maintained a 7-day listening streak",
    icon: "📻",
    category: "listening",
    tier: "silver",
    requirement: 7,
  },
  {
    code: "listen_streak_14",
    name: "Listening Champion",
    description: "Maintained a 14-day listening streak",
    icon: "🎖️",
    category: "listening",
    tier: "gold",
    requirement: 14,
  },
];

export async function seedAchievements() {
  console.log("Seeding achievements...");
  
  try {
    // Get existing achievements
    const existingAchievements = await storage.getAchievements();
    const existingCodes = new Set(existingAchievements.map(a => a.code));
    
    // Find achievements that don't exist yet
    const newAchievements = defaultAchievements.filter(a => !existingCodes.has(a.code));
    
    if (newAchievements.length === 0) {
      console.log(`Found ${existingAchievements.length} existing achievements. All up to date.`);
      return;
    }
    
    // Insert only new achievements
    for (const achievement of newAchievements) {
      await storage.createAchievement(achievement);
    }
    
    console.log(`✅ Added ${newAchievements.length} new achievements (total: ${existingAchievements.length + newAchievements.length})`);
  } catch (error) {
    console.error("❌ Failed to seed achievements:", error);
    throw error;
  }
}
