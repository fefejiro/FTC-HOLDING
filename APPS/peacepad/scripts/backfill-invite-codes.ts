import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq, or, isNull } from "drizzle-orm";

async function generateUniqueCode(existingCodes: Set<string>): Promise<string> {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let attempts = 0;
  
  while (attempts < 100) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    if (!existingCodes.has(code)) {
      existingCodes.add(code);
      return code;
    }
    attempts++;
  }
  
  throw new Error('Failed to generate unique code after 100 attempts');
}

async function backfillInviteCodes() {
  console.log('Starting invite code backfill...');
  
  // Get all users without invite codes
  const usersWithoutCodes = await db
    .select()
    .from(users)
    .where(
      or(
        isNull(users.inviteCode),
        eq(users.inviteCode, '')
      )
    );
  
  console.log(`Found ${usersWithoutCodes.length} users without invite codes`);
  
  // Get all existing codes to avoid duplicates
  const allUsers = await db.select({ inviteCode: users.inviteCode }).from(users);
  const existingCodes = new Set(
    allUsers
      .map(u => u.inviteCode)
      .filter((code): code is string => !!code && code.length > 0)
  );
  
  console.log(`Existing codes in database: ${existingCodes.size}`);
  
  // Update each user with a unique code
  let updated = 0;
  for (const user of usersWithoutCodes) {
    try {
      const newCode = await generateUniqueCode(existingCodes);
      await db
        .update(users)
        .set({ 
          inviteCode: newCode,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));
      
      updated++;
      if (updated % 10 === 0) {
        console.log(`Updated ${updated}/${usersWithoutCodes.length} users...`);
      }
    } catch (error) {
      console.error(`Failed to update user ${user.id}:`, error);
    }
  }
  
  console.log(`✅ Backfill complete! Updated ${updated} users with invite codes.`);
  process.exit(0);
}

backfillInviteCodes().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
