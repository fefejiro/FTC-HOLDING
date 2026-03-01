import { storage } from "./storage";

// Predefined custody schedule templates
const systemTemplates = [
  {
    name: "Every Other Weekend",
    description: "Standard every-other-weekend custody schedule. Parent A has weekdays, Parent B has alternating weekends (Friday 6pm - Sunday 6pm).",
    pattern: JSON.stringify({
      events: [
        {
          title: "Weekend Custody - Parent B",
          type: "pickup",
          dayOffset: 5, // Friday
          duration: 48, // 48 hours (Fri 6pm - Sun 6pm)
          recurring: "biweekly",
          description: "Parent B weekend custody begins",
        },
        {
          title: "Weekend Custody Return - Parent A",
          type: "dropoff",
          dayOffset: 7, // Sunday
          recurring: "biweekly",
          description: "Child returns to Parent A",
        },
      ],
    }),
    isCustom: false,
    isPublic: true,
  },
  {
    name: "2-2-3 Schedule",
    description: "2 days Parent A, 2 days Parent B, 3 days Parent A, then flip. Ensures frequent contact with both parents.",
    pattern: JSON.stringify({
      events: [
        {
          title: "Parent A Custody (2 days)",
          type: "custody_switch",
          dayOffset: 0, // Monday
          duration: 48,
          description: "Parent A: Monday-Wednesday",
        },
        {
          title: "Parent B Custody (2 days)",
          type: "custody_switch",
          dayOffset: 2, // Wednesday
          duration: 48,
          description: "Parent B: Wednesday-Friday",
        },
        {
          title: "Parent A Custody (3 days)",
          type: "custody_switch",
          dayOffset: 4, // Friday
          duration: 72,
          description: "Parent A: Friday-Monday",
        },
      ],
    }),
    isCustom: false,
    isPublic: true,
  },
  {
    name: "Week On/Week Off",
    description: "Alternating weekly custody. Each parent has child for one full week at a time.",
    pattern: JSON.stringify({
      events: [
        {
          title: "Weekly Exchange - Parent A to Parent B",
          type: "custody_switch",
          dayOffset: 0, // Monday
          recurring: "biweekly",
          description: "Child transitions to Parent B for the week",
        },
        {
          title: "Weekly Exchange - Parent B to Parent A",
          type: "custody_switch",
          dayOffset: 7, // Next Monday
          recurring: "biweekly",
          description: "Child transitions to Parent A for the week",
        },
      ],
    }),
    isCustom: false,
    isPublic: true,
  },
  {
    name: "2-2-5-5 Schedule",
    description: "2 days Parent A, 2 days Parent B, 5 days Parent A, 5 days Parent B. Provides consistency with longer blocks of time.",
    pattern: JSON.stringify({
      events: [
        {
          title: "Parent A Custody (2 days)",
          type: "custody_switch",
          dayOffset: 0, // Monday
          duration: 48,
          description: "Parent A: Monday-Wednesday",
        },
        {
          title: "Parent B Custody (2 days)",
          type: "custody_switch",
          dayOffset: 2, // Wednesday
          duration: 48,
          description: "Parent B: Wednesday-Friday",
        },
        {
          title: "Parent A Custody (5 days)",
          type: "custody_switch",
          dayOffset: 4, // Friday
          duration: 120,
          description: "Parent A: Friday-Wednesday",
        },
        {
          title: "Parent B Custody (5 days)",
          type: "custody_switch",
          dayOffset: 9, // Wednesday
          duration: 120,
          description: "Parent B: Wednesday-Monday",
        },
      ],
    }),
    isCustom: false,
    isPublic: true,
  },
  {
    name: "Weekday/Weekend Split",
    description: "Parent A has weekdays (Mon-Thu), Parent B has extended weekends (Fri-Sun). Good for working parents.",
    pattern: JSON.stringify({
      events: [
        {
          title: "Weekend Custody Begins - Parent B",
          type: "pickup",
          dayOffset: 4, // Friday
          recurring: "weekly",
          description: "Parent B picks up for weekend custody",
        },
        {
          title: "Weekday Custody Begins - Parent A",
          type: "dropoff",
          dayOffset: 0, // Monday
          recurring: "weekly",
          description: "Child returns to Parent A for weekdays",
        },
      ],
    }),
    isCustom: false,
    isPublic: true,
  },
];

export async function seedScheduleTemplates() {
  console.log("Seeding schedule templates...");
  
  try {
    // Check if templates already exist
    const existing = await storage.getScheduleTemplates();
    if (existing.length > 0) {
      console.log(`Found ${existing.length} existing templates. Skipping seed.`);
      return;
    }

    // Create system templates
    for (const template of systemTemplates) {
      await storage.createScheduleTemplate(template);
      console.log(`Created template: ${template.name}`);
    }

    console.log(`Successfully seeded ${systemTemplates.length} schedule templates!`);
  } catch (error: any) {
    // Gracefully handle database suspension - this is normal for Neon auto-suspend
    if (error.message?.includes('disabled') || error.message?.includes('suspended')) {
      console.log('[Seed Templates] Database suspended - templates will be seeded when database wakes up');
    } else {
      console.error("Error seeding schedule templates:", error);
    }
  }
}
