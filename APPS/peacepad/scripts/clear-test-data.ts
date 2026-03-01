
import { db } from "../server/db";
import { partnerships, conversations, messages, users } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function clearTestData() {
  console.log("🧹 Starting test data cleanup...");

  try {
    // Get all users
    const allUsers = await db.select().from(users);
    console.log(`Found ${allUsers.length} users`);

    // Delete all messages
    const deletedMessages = await db.delete(messages);
    console.log(`✅ Deleted all messages`);

    // Delete all conversations
    const deletedConversations = await db.delete(conversations);
    console.log(`✅ Deleted all conversations`);

    // Delete all partnerships
    const deletedPartnerships = await db.delete(partnerships);
    console.log(`✅ Deleted all partnerships`);

    console.log("\n✨ Test data cleanup complete!");
    console.log("Users are preserved - they can create fresh partnerships");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

clearTestData();
