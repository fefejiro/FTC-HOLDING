import { storage } from "./storage";

// Premium demo messages showing communication spectrum
// These teach healthy co-parenting communication patterns
const MESSAGE_SAMPLES = [
  // Hostile (needs work)
  {
    content: "You're such a terrible parent. You never think about what's best for the kids.",
    expectedTone: "hostile"
  },
  {
    content: "I can't believe you keep ruining everything. Stop being so selfish.",
    expectedTone: "hostile"
  },
  
  // Defensive (tension building)
  {
    content: "You're always blaming me for things. That's not fair and you know it.",
    expectedTone: "defensive"
  },
  {
    content: "This is typical of you. You never listen to what I'm actually saying.",
    expectedTone: "defensive"
  },
  {
    content: "I'm so frustrated with how you keep making unilateral decisions about the kids.",
    expectedTone: "frustrated"
  },
  
  // Neutral (factual, but could be warmer)
  {
    content: "Can we adjust the pickup time for next weekend? I have a commitment.",
    expectedTone: "neutral"
  },
  {
    content: "I got Emma's report card. She made the honor roll again.",
    expectedTone: "neutral"
  },
  {
    content: "Let's discuss the summer camp decision before the deadline.",
    expectedTone: "neutral"
  },
  
  // Cooperative (building connection)
  {
    content: "Thanks for being flexible with the schedule. That really helps our family flow.",
    expectedTone: "cooperative"
  },
  {
    content: "I appreciate how you handled that situation with Dylan. You made the right call.",
    expectedTone: "cooperative"
  },
  {
    content: "Let's think through this together. I know we can find a solution that works for everyone.",
    expectedTone: "cooperative"
  },
  
  // Calm (strengthens partnership)
  {
    content: "I really value how thoughtfully we approach co-parenting. It makes our kids feel secure.",
    expectedTone: "calm"
  },
  {
    content: "Thank you for always putting our children's wellbeing first. That matters so much.",
    expectedTone: "calm"
  },
  {
    content: "I'm grateful for the partnership we've built. Our kids are thriving because of it.",
    expectedTone: "calm"
  }
];

export async function seedMessages() {
  try {
    console.log("Seeding sample messages...");
    
    // Query database directly for partnerships
    const { db } = await import("./db");
    const { partnerships } = await import("../shared/schema");
    const allPartnerships = await db.select().from(partnerships).limit(1);
    
    if (allPartnerships.length === 0) {
      console.log("No partnerships found. Skipping message seeding.");
      return;
    }
    
    // Use the first partnership for demo messages
    const partnership = allPartnerships[0];
    console.log(`Using partnership ${partnership.id} for sample messages`);
    
    // Get or create conversation for this partnership
    const conversations = await storage.getConversations(partnership.user1Id);
    let conversation = conversations.find((c: any) => 
      c.type === 'direct' && (
        (c.createdBy === partnership.user1Id) || 
        (c.createdBy === partnership.user2Id)
      )
    );
    
    // If no conversation exists, create one
    if (!conversation) {
      console.log("Creating conversation for partnership");
      conversation = await storage.createConversation({
        name: null,
        type: 'direct',
        createdBy: partnership.user1Id
      });
      
      // Add both users as members
      await storage.addConversationMember({
        conversationId: conversation.id,
        userId: partnership.user1Id
      });
      await storage.addConversationMember({
        conversationId: conversation.id,
        userId: partnership.user2Id
      });
    }
    
    // Check if sample messages already exist by querying database directly for our unique marker message
    // We use a specific phrase that only appears in our seed data
    const { messages } = await import("../shared/schema");
    const { eq, and, like } = await import("drizzle-orm");
    
    const existingMarker = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversation.id),
          like(messages.content, "%I'm grateful we can work together so well%")
        )
      )
      .limit(1);
    
    if (existingMarker.length > 0) {
      console.log(`Found existing sample messages. Skipping seed.`);
      return;
    }
    
    // Create messages alternating between the two users
    let messageCount = 0;
    for (let i = 0; i < MESSAGE_SAMPLES.length; i++) {
      const sample = MESSAGE_SAMPLES[i];
      const senderId = i % 2 === 0 ? partnership.user1Id : partnership.user2Id;
      
      await storage.createMessage({
        conversationId: conversation.id,
        content: sample.content,
        senderId: senderId,
        tone: sample.expectedTone
      });
      
      messageCount++;
    }
    
    console.log(`✅ Seeded ${messageCount} sample messages with tone spectrum`);
    
  } catch (error: any) {
    console.error("Failed to seed messages:", error.message);
    throw error;
  }
}
