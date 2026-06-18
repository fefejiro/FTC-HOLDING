import {
  users,
  messages,
  notes,
  tasks,
  childUpdates,
  children,
  pets,
  expenses,
  expenseParticipants,
  settlements,
  partnershipBalances,
  events,
  guestSessions,
  guestSessionData,
  usageMetrics,
  contacts,
  partnerships,
  conversations,
  conversationMembers,
  callSessions,
  calls,
  scheduledCalls,
  callRecordings,
  callFollowups,
  callPreferences,
  therapists,
  supportResources,
  auditLogs,
  pushSubscriptions,
  sessionMoodSummaries,
  scheduleTemplates,
  conchSessions,
  conchSessionParticipants,
  parentingTips,
  weatherActivities,
  storybooks,
  storyPages,
  shoppingLists,
  shoppingItems,
  type User,
  type UpsertUser,
  type Message,
  type InsertMessage,
  type Note,
  type InsertNote,
  type Task,
  type InsertTask,
  type ChildUpdate,
  type InsertChildUpdate,
  type Child,
  type InsertChild,
  type Pet,
  type InsertPet,
  type Expense,
  type InsertExpense,
  type ExpenseParticipant,
  type InsertExpenseParticipant,
  type Settlement,
  type InsertSettlement,
  type PartnershipBalance,
  type InsertPartnershipBalance,
  type Event,
  type InsertEvent,
  type GuestSession,
  type InsertGuestSession,
  type GuestSessionData,
  type InsertGuestSessionData,
  type UsageMetric,
  type InsertUsageMetric,
  type Contact,
  type InsertContact,
  type Partnership,
  type InsertPartnership,
  type Conversation,
  type InsertConversation,
  type ConversationMember,
  type InsertConversationMember,
  type CallSession,
  type InsertCallSession,
  type Call,
  type InsertCall,
  type ScheduledCall,
  type InsertScheduledCall,
  type CallRecording,
  type InsertCallRecording,
  type CallFollowup,
  type InsertCallFollowup,
  type CallPreference,
  type InsertCallPreference,
  type Therapist,
  type InsertTherapist,
  type SupportResource,
  type InsertSupportResource,
  type AuditLog,
  type InsertAuditLog,
  type PushSubscription,
  type InsertPushSubscription,
  type SessionMoodSummary,
  type InsertSessionMoodSummary,
  type ScheduleTemplate,
  type InsertScheduleTemplate,
  type ConchSession,
  type InsertConchSession,
  type ConchSessionParticipant,
  type InsertConchSessionParticipant,
  type ParentingTip,
  type InsertParentingTip,
  type WeatherActivity,
  type InsertWeatherActivity,
  type Storybook,
  type InsertStorybook,
  type StoryPage,
  type InsertStoryPage,
  type ShoppingList,
  type InsertShoppingList,
  type ShoppingItem,
  type InsertShoppingItem,
  feedback,
  type Feedback,
  type InsertFeedback,
  safetyPlans,
  type SafetyPlan,
  type InsertSafetyPlan,
  type SafetyPlanData,
  userStats,
  type UserStats,
  type InsertUserStats,
  streaks,
  type Streak,
  type InsertStreak,
  achievements,
  type Achievement,
  type InsertAchievement,
  userAchievements,
  type UserAchievement,
  type InsertUserAchievement,
  // V2 Call Engine tables and types
  callSessionsV2,
  callParticipantsV2,
  conchStateV2,
  conchTurnsV2,
  callEventsV2,
  type CallSessionV2,
  type InsertCallSessionV2,
  type CallParticipantV2,
  type InsertCallParticipantV2,
  type ConchStateV2,
  type InsertConchStateV2,
  type ConchTurnV2,
  type InsertConchTurnV2,
  type CallEventV2,
  type InsertCallEventV2,
  messageSummaries,
  type MessageSummary,
  type InsertMessageSummary,
  listeningSettings,
  type ListeningSettings,
  type InsertListeningSettings,
  relationshipMemories,
  type RelationshipMemory,
  type InsertRelationshipMemory,
  agentInterventions,
  type AgentIntervention,
  type InsertAgentIntervention,
  conflictPatterns,
  type ConflictPattern,
  type InsertConflictPattern,
  prepChatSessions,
  type PrepChatSession,
  type InsertPrepChatSession,
  agentSettings,
  type AgentSettings,
  type InsertAgentSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, and, count, sql, lt } from "drizzle-orm";
import { getEncryptionService } from "./services/encryption";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getDeactivatedUserByEmail(email: string): Promise<User | undefined>;
  getDeactivatedUserById(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<{ user: User; isNewUser: boolean }>;
  setActivePartnership(userId: string, partnershipId: string | null): Promise<User | undefined>;
  getOtherUsers(currentUserId: string): Promise<User[]>;
  deactivateUser(userId: string): Promise<void>;
  reactivateUser(userId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  exportUserData(userId: string): Promise<any>;
  incrementUserUsage(userId: string, metrics: { messages?: number; actions?: number }): Promise<void>;
  updateUserActiveDays(userId: string): Promise<void>;
  
  // Guest session operations
  getGuestSession(sessionId: string): Promise<GuestSession | undefined>;
  getGuestSessionByGuestId(guestId: string): Promise<GuestSession | undefined>;
  getGuestSessionByUserId(userId: string): Promise<GuestSession | undefined>;
  createGuestSession(session: InsertGuestSession): Promise<GuestSession>;
  getGuestSessionData(guestSessionId: string): Promise<GuestSessionData | undefined>;
  upsertGuestSessionData(data: InsertGuestSessionData): Promise<GuestSessionData>;
  updateGuestSessionActivity(sessionId: string): Promise<void>;
  markGuestSessionUpgraded(guestId: string, userId: string): Promise<void>;
  markGuestSessionUpgradedBySessionId(sessionId: string, userId: string): Promise<void>;
  migrateGuestDataToUser(guestUserId: string, userId: string): Promise<void>;
  cleanupExpiredSessions(): Promise<{
    deletedSessions: number;
    deletedGuestData: number;
    deletedUsageMetrics: number;
  }>;
  
  // Usage metrics operations
  getUsageMetrics(sessionId: string): Promise<UsageMetric | undefined>;
  createUsageMetric(metric: InsertUsageMetric): Promise<UsageMetric>;
  updateUsageMetric(sessionId: string, updates: Partial<UsageMetric>): Promise<void>;
  
  // Message operations
  getMessages(): Promise<Message[]>;
  getMessagesByUser(userId: string): Promise<any[]>;
  getMessage(messageId: string): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void>;
  
  // Contact operations
  getContacts(userId: string): Promise<Contact[]>;
  getContactWithUser(userId: string, peerUserId: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact>;
  deleteContact(id: string): Promise<void>;
  
  // Partnership operations
  getPartnerships(userId: string): Promise<Partnership[]>;
  getAllPartnerships(): Promise<Partnership[]>;
  getPartnershipByCode(inviteCode: string): Promise<Partnership | undefined>;
  getPartnership(partnershipId: string): Promise<Partnership | undefined>;
  createPartnership(partnership: InsertPartnership): Promise<Partnership>;
  updatePartnership(partnershipId: string, updates: Partial<Partnership>): Promise<Partnership>;
  deletePartnership(partnershipId: string): Promise<void>;
  getUserByInviteCode(inviteCode: string): Promise<User | undefined>;
  generateInviteCode(): Promise<string>;
  regenerateInviteCode(userId: string): Promise<string>;
  
  // Conversation operations
  getConversations(userId: string): Promise<any[]>;
  getConversation(conversationId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  addConversationMember(member: InsertConversationMember): Promise<ConversationMember>;
  getConversationMembers(conversationId: string): Promise<ConversationMember[]>;
  getConversationMessages(conversationId: string): Promise<any[]>;
  findDirectConversation(userId1: string, userId2: string): Promise<Conversation | undefined>;
  deleteConversation(conversationId: string): Promise<void>;
  
  // Note operations
  getNotes(userId: string): Promise<Note[]>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: string, note: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: string): Promise<void>;
  
  // Task operations
  getTasks(userId: string): Promise<Task[]>;
  getTask(taskId: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  
  // Child update operations
  getChildUpdates(userId: string): Promise<ChildUpdate[]>;
  createChildUpdate(update: InsertChildUpdate): Promise<ChildUpdate>;
  deleteChildUpdate(id: string): Promise<void>;
  
  // Children operations (for onboarding)
  getChildren(userId: string): Promise<Child[]>;
  getChild(id: string): Promise<Child | undefined>;
  createChild(child: InsertChild): Promise<Child>;
  updateChild(id: string, updates: Partial<InsertChild>): Promise<Child>;
  deleteChild(id: string): Promise<void>;
  
  // Pet operations
  getPets(userId: string): Promise<Pet[]>;
  createPet(pet: InsertPet): Promise<Pet>;
  
  // Expense operations
  getExpenses(userId: string): Promise<Expense[]>;
  getExpense(expenseId: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(expenseId: string, updates: Partial<Expense>): Promise<Expense>;
  
  // Expense participant operations
  getExpenseParticipants(expenseId: string): Promise<ExpenseParticipant[]>;
  createExpenseParticipant(participant: InsertExpenseParticipant): Promise<ExpenseParticipant>;
  updateExpenseParticipant(id: string, updates: Partial<ExpenseParticipant>): Promise<ExpenseParticipant>;
  
  // Settlement operations
  getSettlements(partnershipId: string): Promise<Settlement[]>;
  getSettlement(settlementId: string): Promise<Settlement | undefined>;
  getExpenseSettlements(expenseId: string): Promise<Settlement[]>;
  createSettlement(settlement: InsertSettlement): Promise<Settlement>;
  updateSettlement(id: string, updates: Partial<Settlement>): Promise<Settlement>;
  getPendingSettlements(userId: string): Promise<Settlement[]>;
  
  // Partnership balance operations
  getPartnershipBalance(partnershipId: string, userId: string): Promise<PartnershipBalance | undefined>;
  upsertPartnershipBalance(balance: InsertPartnershipBalance): Promise<PartnershipBalance>;
  calculatePartnershipBalances(partnershipId: string): Promise<void>;
  
  // Event operations
  getEvents(userId: string): Promise<Event[]>;
  getEvent(eventId: string): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(eventId: string, event: InsertEvent): Promise<Event>;
  deleteEvent(eventId: string): Promise<void>;
  
  // Call session operations (legacy)
  createCallSession(session: InsertCallSession): Promise<CallSession>;
  getCallSessionByCode(sessionCode: string): Promise<CallSession | undefined>;
  getCallSessionById(sessionId: string): Promise<CallSession | undefined>;
  endCallSession(sessionCode: string): Promise<void>;
  
  // New direct calling operations
  createCall(call: InsertCall): Promise<Call>;
  getCall(id: string): Promise<Call | undefined>;
  getCalls(userId: string, filter?: string): Promise<Call[]>;
  getAllCalls(): Promise<Call[]>;
  getStuckRingingCalls(timeoutSeconds: number): Promise<Call[]>;
  updateCall(id: string, updates: Partial<Call>): Promise<Call>;
  
  // Scheduled call operations
  createScheduledCall(scheduledCall: InsertScheduledCall): Promise<ScheduledCall>;
  getScheduledCalls(userId: string): Promise<ScheduledCall[]>;
  getScheduledCall(id: string): Promise<ScheduledCall | undefined>;
  updateScheduledCall(id: string, updates: Partial<ScheduledCall>): Promise<ScheduledCall>;
  
  // Call recording operations
  createCallRecording(recording: InsertCallRecording): Promise<CallRecording>;
  getCallRecordings(userId: string): Promise<CallRecording[]>;
  getCallRecordingById(id: string): Promise<CallRecording | undefined>;
  
  // Call follow-up operations
  createCallFollowup(followup: InsertCallFollowup): Promise<CallFollowup>;
  getCallFollowup(callId: string): Promise<CallFollowup | undefined>;
  
  // Call preference operations
  getCallPreference(userId: string): Promise<CallPreference | undefined>;
  createCallPreference(preference: InsertCallPreference): Promise<CallPreference>;
  updateCallPreference(userId: string, updates: Partial<CallPreference>): Promise<CallPreference>;
  
  // V2 Call Engine operations
  createCallSessionV2(session: InsertCallSessionV2): Promise<CallSessionV2>;
  getCallSessionV2(id: string): Promise<CallSessionV2 | undefined>;
  updateCallSessionV2(id: string, updates: Partial<CallSessionV2>): Promise<CallSessionV2>;
  createCallParticipantV2(participant: InsertCallParticipantV2): Promise<CallParticipantV2>;
  updateCallParticipantV2ByUserAndCall(callId: string, userId: string, updates: Partial<CallParticipantV2>): Promise<CallParticipantV2>;
  createConchTurnV2(turn: InsertConchTurnV2): Promise<ConchTurnV2>;
  completeConchTurnV2(callId: string, userId: string, endReason: string): Promise<void>;
  upsertConchStateV2(state: InsertConchStateV2): Promise<ConchStateV2>;
  
  // Therapist operations
  createTherapist(therapist: InsertTherapist): Promise<Therapist>;
  getTherapists(): Promise<Therapist[]>;
  searchTherapists(userLat: string, userLng: string, maxDistance?: number): Promise<Therapist[]>;
  
  // Support resource operations
  getSupportResources(category?: string, genderFocus?: string): Promise<SupportResource[]>;
  
  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(userId: string): Promise<AuditLog[]>;
  getUserAuditTrail(userId: string, startDate?: Date, endDate?: Date): Promise<any>;
  
  // Push subscription operations
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]>;
  deletePushSubscription(identifier: { endpoint?: string; deviceToken?: string }): Promise<void>;
  
  // Session mood summary operations
  createSessionMoodSummary(summary: InsertSessionMoodSummary): Promise<SessionMoodSummary>;
  getSessionMoodSummary(sessionId: string): Promise<SessionMoodSummary | undefined>;
  getSessionMoodSummariesByUser(userId: string): Promise<SessionMoodSummary[]>;
  
  // Schedule template operations
  getScheduleTemplates(userId?: string): Promise<ScheduleTemplate[]>;
  getScheduleTemplate(id: string): Promise<ScheduleTemplate | undefined>;
  createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate>;
  deleteScheduleTemplate(id: string): Promise<void>;
  
  // Conch session operations
  createConchSession(session: InsertConchSession): Promise<ConchSession>;
  getConchSession(sessionId: string): Promise<ConchSession | undefined>;
  getActiveConchSession(partnershipId: string): Promise<ConchSession | undefined>;
  getAllConchSessions(): Promise<ConchSession[]>;
  updateConchSession(sessionId: string, updates: Partial<ConchSession>): Promise<ConchSession>;
  endConchSession(sessionId: string): Promise<void>;
  addConchSessionParticipant(participant: InsertConchSessionParticipant): Promise<ConchSessionParticipant>;
  getConchSessionParticipants(sessionId: string): Promise<ConchSessionParticipant[]>;
  
  // Admin statistics
  getAdminStats(): Promise<{
    totalUsers: number;
    totalPartnerships: number;
    totalMessages: number;
    consentStats: {
      privacyAccepted: number;
      aiMessageConsent: number;
      aiCallConsent: number;
    };
    recentSignups: Array<{
      id: string;
      displayName: string | null;
      email: string | null;
      createdAt: Date | null;
      privacyAccepted: boolean;
      aiMessageConsent: boolean;
      aiCallConsent: boolean;
    }>;
  }>;
  
  // Parenting tips operations
  getParentingTips(childAgeMonths?: number, category?: string): Promise<ParentingTip[]>;
  getParentingTip(id: string): Promise<ParentingTip | undefined>;
  createParentingTip(tip: InsertParentingTip): Promise<ParentingTip>;

  // Beta feedback operations
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getAllFeedback(): Promise<Feedback[]>;
  getFeedbackByStatus(status: string): Promise<Feedback[]>;
  updateFeedbackStatus(id: string, status: string, adminNotes?: string): Promise<Feedback>;
  
  // Gamification operations
  // User stats
  getUserStats(userId: string, partnershipId?: string): Promise<UserStats | undefined>;
  upsertUserStats(stats: InsertUserStats): Promise<UserStats>;
  incrementUserStat(userId: string, statName: string, amount?: number, partnershipId?: string): Promise<void>;
  
  // Streaks
  getStreaks(userId: string, partnershipId?: string): Promise<Streak[]>;
  getStreak(userId: string, streakType: string, partnershipId?: string): Promise<Streak | undefined>;
  createStreak(streak: InsertStreak): Promise<Streak>;
  updateStreak(id: string, updates: Partial<Streak>): Promise<Streak>;
  incrementStreak(userId: string, streakType: string, partnershipId?: string): Promise<void>;
  breakStreak(userId: string, streakType: string, partnershipId?: string): Promise<void>;
  
  // Achievements
  getAchievements(): Promise<Achievement[]>;
  getAchievement(id: string): Promise<Achievement | undefined>;
  getAchievementByCode(code: string): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  
  // User achievements
  getUserAchievements(userId: string, partnershipId?: string): Promise<any[]>;
  hasAchievement(userId: string, achievementCode: string, partnershipId?: string): Promise<boolean>;
  awardAchievement(userId: string, achievementCode: string, partnershipId?: string): Promise<UserAchievement | null>;
  checkAndAwardAchievements(userId: string, partnershipId?: string): Promise<UserAchievement[]>;
  
  // Safety Plan operations (returns decrypted data)
  getSafetyPlan(userId: string): Promise<SafetyPlanData | undefined>;
  createSafetyPlan(userId: string, planData: SafetyPlanData): Promise<SafetyPlanData>;
  updateSafetyPlan(userId: string, planData: SafetyPlanData): Promise<SafetyPlanData>;
  deleteSafetyPlan(userId: string): Promise<void>;
  
  // Rogerian Active Listening operations
  createMessageSummary(summary: InsertMessageSummary): Promise<MessageSummary>;
  getMessageSummary(id: string): Promise<MessageSummary | undefined>;
  getMessageSummariesByUser(userId: string, limit?: number): Promise<MessageSummary[]>;
  getMessageSummariesByPartnership(partnershipId: string, limit?: number): Promise<MessageSummary[]>;
  getListeningSettings(userId: string): Promise<ListeningSettings | undefined>;
  upsertListeningSettings(settings: InsertListeningSettings): Promise<ListeningSettings>;
  
  // Agent Memory System operations
  createRelationshipMemory(memory: InsertRelationshipMemory): Promise<RelationshipMemory>;
  getRelationshipMemories(partnershipId: string): Promise<RelationshipMemory[]>;
  getRelationshipMemoriesByPattern(partnershipId: string, options: {
    dayOfWeek?: number;
    timeOfDay?: string;
    weekOfYear?: number;
    memoryType?: string;
    minConflictScore?: number;
  }): Promise<RelationshipMemory[]>;
  updateRelationshipMemoryRetrieval(memoryId: string): Promise<void>;
  deleteRelationshipMemory(memoryId: string): Promise<void>;
  
  // Agent Intervention operations
  createAgentIntervention(intervention: InsertAgentIntervention): Promise<AgentIntervention>;
  getAgentInterventions(partnershipId: string, limit?: number): Promise<AgentIntervention[]>;
  updateAgentIntervention(id: string, updates: Partial<AgentIntervention>): Promise<AgentIntervention>;
  
  // Conflict Pattern operations
  createConflictPattern(pattern: InsertConflictPattern): Promise<ConflictPattern>;
  getConflictPatterns(partnershipId: string): Promise<ConflictPattern[]>;
  updateConflictPattern(id: string, updates: Partial<ConflictPattern>): Promise<ConflictPattern>;
  
  // Prep Chat operations
  createPrepChatSession(session: InsertPrepChatSession): Promise<PrepChatSession>;
  getPrepChatSession(sessionId: string): Promise<PrepChatSession | undefined>;
  getPrepChatSessions(userId: string, limit?: number): Promise<PrepChatSession[]>;
  updatePrepChatSession(sessionId: string, updates: Partial<PrepChatSession>): Promise<PrepChatSession>;
  
  // Agent Settings operations
  getAgentSettings(userId: string): Promise<AgentSettings | undefined>;
  upsertAgentSettings(settings: InsertAgentSettings): Promise<AgentSettings>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getDeactivatedUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.isDeactivated, true)));
    return user;
  }

  async getDeactivatedUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(and(eq(users.id, id), eq(users.isDeactivated, true)));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users);
    return allUsers;
  }

  async upsertUser(userData: UpsertUser): Promise<{ user: User; isNewUser: boolean }> {
    // Only generate invite code for NEW users (not updates)
    // Check if user exists first to prevent code regeneration on updates
    let existingUser: User | undefined;
    if (userData.id) {
      existingUser = await this.getUser(userData.id);
    }
    
    const isNewUser = !existingUser;
    
    // Generate invite code only for truly new users
    if (!userData.inviteCode && !existingUser) {
      const newCode = await this.generateInviteCode();
      console.log(`[Storage] Generated invite code for new user: ${newCode}`);
      userData.inviteCode = newCode;
      userData.inviteCodeGeneratedAt = new Date(); // Set timestamp for 14-day expiration
    }
    
    // Filter out undefined values to prevent overwriting existing data with null
    const cleanedData = Object.fromEntries(
      Object.entries(userData).filter(([_, value]) => value !== undefined)
    );
    
    // If updating existing user, preserve their invite code
    if (existingUser && !cleanedData.inviteCode) {
      delete cleanedData.inviteCode;
    }
    
    const [user] = await (db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...cleanedData,
          updatedAt: new Date(),
        },
      })
      .returning() as any);
    
    console.log(`[Storage] User ${isNewUser ? 'created' : 'updated'} - ID: ${user.id}, Invite Code: ${user.inviteCode}, Display Name: ${user.displayName}`);
    return { user, isNewUser };
  }

  async setActivePartnership(userId: string, partnershipId: string | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        activePartnershipId: partnershipId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }


  async getOtherUsers(currentUserId: string): Promise<User[]> {
    const { ne } = await import("drizzle-orm");
    const otherUsers = await db.select().from(users).where(ne(users.id, currentUserId));
    return otherUsers;
  }

  async deactivateUser(userId: string): Promise<void> {
    await db.update(users)
      .set({ 
        isDeactivated: true, 
        deletedAt: new Date() 
      })
      .where(eq(users.id, userId));
    
    // Also cleanup guest sessions immediately on deactivation
    await db.delete(guestSessions).where(eq(guestSessions.userId, userId));
    
    console.log(`[Storage] User ${userId} deactivated (soft-delete)`);
  }

  async reactivateUser(userId: string): Promise<void> {
    await db.update(users)
      .set({ 
        isDeactivated: false, 
        deletedAt: null 
      })
      .where(eq(users.id, userId));
    console.log(`[Storage] User ${userId} reactivated`);
  }

  async incrementUserUsage(userId: string, metrics: { messages?: number; actions?: number }): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    await db.update(users)
      .set({
        totalMessagesSent: (user.totalMessagesSent || 0) + (metrics.messages || 0),
        totalStructuredActions: (user.totalStructuredActions || 0) + (metrics.actions || 0),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async updateUserActiveDays(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) return;

    const now = new Date();
    const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
    
    // Check if it's a new day
    if (!lastActive || lastActive.toDateString() !== now.toDateString()) {
      await db.update(users)
        .set({
          distinctDaysActive: (user.distinctDaysActive || 0) + 1,
          lastActiveAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, userId));
    }
  }

  async deleteUser(userId: string): Promise<void> {
    // Execute all deletes in a single transaction for atomicity
    // Either all deletes succeed or all are rolled back
    await db.transaction(async (tx) => {
      // Delete all user data in the correct order (respecting foreign key constraints)
      // Start with dependent tables first, then parent tables
      
      // Delete audit logs
      await tx.delete(auditLogs).where(eq(auditLogs.userId, userId));
      
      // Delete call recordings
      await tx.delete(callRecordings).where(eq(callRecordings.recordedBy, userId));
      
      // Delete call follow-ups before calls
      await tx.execute(sql`DELETE FROM call_followups WHERE call_id IN (SELECT id FROM calls WHERE caller_id = ${userId} OR receiver_id = ${userId})`);

      // Delete calls where user is caller or receiver
      await tx.delete(calls).where(or(eq(calls.callerId, userId), eq(calls.receiverId, userId)));

      // Delete call sessions
      await tx.delete(callSessions).where(eq(callSessions.hostId, userId));
      
      // Delete scheduled calls (both as scheduler and participant)
      
      // Delete partnerships
      await tx.delete(partnerships).where(or(eq(partnerships.user1Id, userId), eq(partnerships.user2Id, userId)));
      
      // Delete contacts
      await tx.delete(contacts).where(or(eq(contacts.userId, userId), eq(contacts.peerUserId, userId)));
      
      // Delete push subscriptions
      await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
      
      // Delete usage metrics
      await tx.delete(usageMetrics).where(eq(usageMetrics.userId, userId));
      
      // Delete guest sessions
      await tx.delete(guestSessions).where(eq(guestSessions.userId, userId));
      
      // Finally, delete the user
      await tx.delete(users).where(eq(users.id, userId));
      
      console.log(`[Storage] User ${userId} and all associated data deleted successfully in transaction`);
    });
  }

  async exportUserData(userId: string): Promise<any> {
    const userData = await this.getUser(userId);
    if (!userData) {
      throw new Error('User not found');
    }

    // Get all conversation IDs where user is a member
    const userConversationMembers = await db
      .select()
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId));
    
    const conversationIds = userConversationMembers.map(m => m.conversationId);

    // Get all Conch session IDs where user participated
    const userConchParticipantRecords = await db
      .select()
      .from(conchSessionParticipants)
      .where(eq(conchSessionParticipants.userId, userId));
    
    const participatedConchSessionIds = userConchParticipantRecords.map(p => p.sessionId);

    const [
      sentMessages,
      receivedMessagesInConversations,
      receivedDirectMessages,
      allConversationsWhereUserIsMember,
      userNotes,
      userTasks,
      userChildUpdates,
      userPets,
      userEvents,
      userExpenses,
      expenseParticipations,
      userSettlements,
      userPartnershipBalances,
      userPartnerships,
      conversationMemberships,
      userContacts,
      userCalls,
      userScheduledCalls,
      userCallRecordings,
      userCallFollowups,
      userCallPreferences,
      userCallSessions,
      userAuditLogs,
      userPushSubscriptions,
      userSessionMoodSummaries,
      userScheduleTemplates,
      userConchSessions,
      userConchParticipations,
      participatedConchSessions,
      userGuestSessions,
      userUsageMetrics,
      userFeedback,
      userStorybooks,
      userShoppingLists,
    ] = await Promise.all([
      // Messages sent by user
      db.select().from(messages).where(eq(messages.senderId, userId)),
      // Messages in conversations where user is a member (all messages from shared conversations)
      conversationIds.length > 0 
        ? db.select().from(messages).where(
            or(...conversationIds.map(cid => eq(messages.conversationId, cid)))
          )
        : Promise.resolve([]),
      // Direct messages received by user (recipientId field)
      db.select().from(messages).where(eq(messages.recipientId, userId)),
      // All conversation records where user is a member (not just created)
      conversationIds.length > 0
        ? db.select().from(conversations).where(
            or(...conversationIds.map(cid => eq(conversations.id, cid)))
          )
        : Promise.resolve([]),
      // Notes created by user
      db.select().from(notes).where(eq(notes.createdBy, userId)),
      // Tasks created by or assigned to user
      db.select().from(tasks).where(or(eq(tasks.createdBy, userId), eq(tasks.assignedTo, userId))),
      // Child updates created by user
      db.select().from(childUpdates).where(eq(childUpdates.createdBy, userId)),
      // Pets created by user
      db.select().from(pets).where(eq(pets.createdBy, userId)),
      // Events created by user
      db.select().from(events).where(eq(events.createdBy, userId)),
      // Expenses paid by user
      db.select().from(expenses).where(eq(expenses.paidBy, userId)),
      // Expense participations (where user is a participant)
      db.select().from(expenseParticipants).where(eq(expenseParticipants.userId, userId)),
      // Settlements where user is payer or receiver
      db.select().from(settlements).where(or(eq(settlements.payerId, userId), eq(settlements.receiverId, userId))),
      // Partnership balances
      db.select().from(partnershipBalances).where(eq(partnershipBalances.userId, userId)),
      // Partnerships
      db.select().from(partnerships).where(or(eq(partnerships.user1Id, userId), eq(partnerships.user2Id, userId))),
      // Conversation memberships
      db.select().from(conversationMembers).where(eq(conversationMembers.userId, userId)),
      // Contacts
      db.select().from(contacts).where(or(eq(contacts.userId, userId), eq(contacts.peerUserId, userId))),
      // Calls where user is caller or receiver
      db.select().from(calls).where(or(eq(calls.callerId, userId), eq(calls.receiverId, userId))),
      // Scheduled calls
      db.select().from(scheduledCalls).where(or(eq(scheduledCalls.schedulerId, userId), eq(scheduledCalls.participantId, userId))),
      // Call recordings made by user
      db.select().from(callRecordings).where(eq(callRecordings.recordedBy, userId)),
      // Call follow-ups (query via calls where user is caller/receiver)
      db.select().from(callFollowups),
      // Call preferences
      db.select().from(callPreferences).where(eq(callPreferences.userId, userId)),
      // Call sessions hosted by user
      db.select().from(callSessions).where(eq(callSessions.hostId, userId)),
      // Audit logs
      db.select().from(auditLogs).where(eq(auditLogs.userId, userId)),
      // Push subscriptions
      db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)),
      // Session mood summaries (filter by participants array containing userId)
      db.select().from(sessionMoodSummaries),
      // Schedule templates created by user
      db.select().from(scheduleTemplates).where(eq(scheduleTemplates.createdBy, userId)),
      // Conch sessions initiated by user
      db.select().from(conchSessions).where(eq(conchSessions.initiatorUserId, userId)),
      // Conch session participations
      db.select().from(conchSessionParticipants).where(eq(conchSessionParticipants.userId, userId)),
      // Conch sessions where user participated (not hosted)
      participatedConchSessionIds.length > 0
        ? db.select().from(conchSessions).where(
            or(...participatedConchSessionIds.map(sid => eq(conchSessions.id, sid)))
          )
        : Promise.resolve([]),
      // Guest sessions
      db.select().from(guestSessions).where(eq(guestSessions.userId, userId)),
      // Usage metrics
      db.select().from(usageMetrics).where(eq(usageMetrics.userId, userId)),
      // Feedback submitted by user
      db.select().from(feedback).where(eq(feedback.userId, userId)),
      // Storybooks created by user (with pages)
      db.select().from(storybooks).where(eq(storybooks.createdBy, userId)),
      // Shopping lists created by user (with items)
      db.select().from(shoppingLists).where(eq(shoppingLists.createdBy, userId)),
    ]);

    // Get story pages for user's storybooks
    const storybookIds = userStorybooks.map(s => s.id);
    const storyPagesInOwnBooks = storybookIds.length > 0
      ? await db.select().from(storyPages).where(
          or(...storybookIds.map(sid => eq(storyPages.storyId, sid)))
        )
      : [];
    
    // ALSO get story pages CREATED by user (even in others' storybooks)
    const storyPagesCreatedByUser = await db.select().from(storyPages).where(eq(storyPages.createdBy, userId));
    
    // Combine and deduplicate story pages
    const allStoryPages = [...storyPagesInOwnBooks, ...storyPagesCreatedByUser];
    const uniqueStoryPages = Array.from(
      new Map(allStoryPages.map(page => [page.id, page])).values()
    );

    // Get parent storybooks for all exported pages (for context)
    const allStorybookIdsFromPages = uniqueStoryPages.map(p => p.storyId);
    const uniqueStorybookIds = Array.from(new Set([...storybookIds, ...allStorybookIdsFromPages]));
    const allRelatedStorybooks = uniqueStorybookIds.length > 0
      ? await db.select().from(storybooks).where(
          or(...uniqueStorybookIds.map(sid => eq(storybooks.id, sid)))
        )
      : [];
    
    // Combine user's storybooks + partner storybooks where user contributed
    const allStorybooks = [...userStorybooks, ...allRelatedStorybooks];
    const uniqueStorybooks = Array.from(
      new Map(allStorybooks.map(book => [book.id, book])).values()
    );

    // Get shopping items for user's shopping lists
    const shoppingListIds = userShoppingLists.map(l => l.id);
    const shoppingItemsInOwnLists = shoppingListIds.length > 0
      ? await db.select().from(shoppingItems).where(
          or(...shoppingListIds.map(lid => eq(shoppingItems.listId, lid)))
        )
      : [];
    
    // ALSO get shopping items ADDED by user (even in others' lists)
    const shoppingItemsCreatedByUser = await db.select().from(shoppingItems).where(eq(shoppingItems.addedBy, userId));
    
    // Combine and deduplicate shopping items
    const allShoppingItems = [...shoppingItemsInOwnLists, ...shoppingItemsCreatedByUser];
    const uniqueShoppingItems = Array.from(
      new Map(allShoppingItems.map(item => [item.id, item])).values()
    );

    // Get parent shopping lists for all exported items (for context)
    const allListIdsFromItems = uniqueShoppingItems.map(i => i.listId);
    const uniqueListIds = Array.from(new Set([...shoppingListIds, ...allListIdsFromItems]));
    const allRelatedShoppingLists = uniqueListIds.length > 0
      ? await db.select().from(shoppingLists).where(
          or(...uniqueListIds.map(lid => eq(shoppingLists.id, lid)))
        )
      : [];
    
    // Combine user's lists + partner lists where user contributed
    const allShoppingLists = [...userShoppingLists, ...allRelatedShoppingLists];
    const uniqueShoppingLists = Array.from(
      new Map(allShoppingLists.map(list => [list.id, list])).values()
    );

    // Include ALL user fields for complete GDPR compliance
    // Only exclude internal session/auth tokens if any
    const completeUserData = {
      id: userData.id,
      email: userData.email,
      displayName: userData.displayName,
      firstName: userData.firstName,
      lastName: userData.lastName,
      phoneNumber: userData.phoneNumber,
      profileImageUrl: userData.profileImageUrl,
      personalityType: userData.personalityType,
      communicationStyle: userData.communicationStyle,
      conflictResolutionStyle: userData.conflictResolutionStyle,
      inviteCode: userData.inviteCode,
      inviteCodeGeneratedAt: userData.inviteCodeGeneratedAt,
      privacyAccepted: userData.privacyAccepted,
      aiMessageConsent: userData.aiMessageConsent,
      aiCallConsent: userData.aiCallConsent,
      termsAcceptedAt: userData.termsAcceptedAt,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      lastLoginAt: userData.lastLoginAt,
      subscriptionTier: userData.subscriptionTier,
      onboardingCompletedAt: userData.onboardingCompletedAt,
      isGuest: userData.isGuest,
    };

    // Combine and deduplicate received messages (from conversations and direct)
    const allReceivedMessages = [...receivedMessagesInConversations, ...receivedDirectMessages];
    const uniqueReceivedMessages = Array.from(
      new Map(allReceivedMessages.map(msg => [msg.id, msg])).values()
    );

    // Combine and deduplicate Conch sessions (hosted + participated)
    const allConchSessions = [...userConchSessions, ...participatedConchSessions];
    const uniqueConchSessions = Array.from(
      new Map(allConchSessions.map(session => [session.id, session])).values()
    );

    return {
      exportDate: new Date().toISOString(),
      exportVersion: '1.0',
      user: completeUserData,
      messages: {
        sent: sentMessages,
        received: uniqueReceivedMessages,
      },
      notes: userNotes,
      tasks: userTasks,
      childUpdates: userChildUpdates,
      pets: userPets,
      events: userEvents,
      expenses: {
        paid: userExpenses,
        participations: expenseParticipations,
      },
      settlements: userSettlements,
      partnershipBalances: userPartnershipBalances,
      partnerships: userPartnerships,
      conversations: {
        all: allConversationsWhereUserIsMember,
        memberships: conversationMemberships,
      },
      contacts: userContacts,
      calls: {
        callHistory: userCalls,
        scheduledCalls: userScheduledCalls,
        recordings: userCallRecordings,
        followups: userCallFollowups,
        preferences: userCallPreferences,
        sessions: userCallSessions,
      },
      conchMode: {
        sessions: uniqueConchSessions,
        participations: userConchParticipations,
        moodSummaries: userSessionMoodSummaries,
      },
      scheduleTemplates: userScheduleTemplates,
      auditLogs: userAuditLogs,
      pushSubscriptions: userPushSubscriptions,
      guestSessions: userGuestSessions,
      usageMetrics: userUsageMetrics,
      feedback: userFeedback,
      storybooks: {
        books: uniqueStorybooks,
        pages: uniqueStoryPages,
      },
      shoppingLists: {
        lists: uniqueShoppingLists,
        items: uniqueShoppingItems,
      },
    };
  }

  // Guest session operations
  async getGuestSession(sessionId: string): Promise<GuestSession | undefined> {
    const [session] = await db.select().from(guestSessions).where(eq(guestSessions.sessionId, sessionId));
    return session;
  }

  async getGuestSessionByGuestId(guestId: string): Promise<GuestSession | undefined> {
    const [session] = await db
      .select()
      .from(guestSessions)
      .where(eq(guestSessions.guestId, guestId))
      .limit(1);
    return session;
  }

  async getGuestSessionByUserId(userId: string): Promise<GuestSession | undefined> {
    const [session] = await db.select().from(guestSessions)
      .where(eq(guestSessions.userId, userId))
      .orderBy(desc(guestSessions.createdAt))
      .limit(1);
    return session;
  }

  async createGuestSession(sessionData: InsertGuestSession): Promise<GuestSession> {
    const [session] = await db.insert(guestSessions).values(sessionData).returning();
    return session;
  }

  async getGuestSessionData(guestSessionId: string): Promise<GuestSessionData | undefined> {
    const [row] = await db
      .select()
      .from(guestSessionData)
      .where(eq(guestSessionData.guestSessionId, guestSessionId))
      .limit(1);
    return row;
  }

  async upsertGuestSessionData(data: InsertGuestSessionData): Promise<GuestSessionData> {
    const now = new Date();
    const existing = await this.getGuestSessionData(data.guestSessionId);

    if (existing) {
      const [updated] = await db
        .update(guestSessionData)
        .set({
          data: data.data ?? {},
          updatedAt: now,
        })
        .where(eq(guestSessionData.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(guestSessionData)
      .values({
        guestSessionId: data.guestSessionId,
        data: data.data ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return created;
  }

  async updateGuestSessionActivity(sessionId: string): Promise<void> {
    const now = new Date();
    await db
      .update(guestSessions)
      .set({ lastActive: now, lastSeenAt: now })
      .where(eq(guestSessions.sessionId, sessionId));
  }

  async markGuestSessionUpgraded(guestId: string, userId: string): Promise<void> {
    await db
      .update(guestSessions)
      .set({
        upgradedToUserId: userId,
        lastSeenAt: new Date(),
      })
      .where(eq(guestSessions.guestId, guestId));
  }

  async markGuestSessionUpgradedBySessionId(sessionId: string, userId: string): Promise<void> {
    await db
      .update(guestSessions)
      .set({
        upgradedToUserId: userId,
        lastSeenAt: new Date(),
      })
      .where(eq(guestSessions.sessionId, sessionId));
  }

  async migrateGuestDataToUser(guestUserId: string, userId: string): Promise<void> {
    if (!guestUserId || !userId || guestUserId === userId) {
      return;
    }

    await db.transaction(async (tx) => {
      const [guestUser] = await tx.select().from(users).where(eq(users.id, guestUserId)).limit(1);
      const [targetUser] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!guestUser || !targetUser) {
        return;
      }

      const now = new Date();
      const profilePatch: Record<string, any> = {};
      if (!targetUser.displayName && guestUser.displayName) profilePatch.displayName = guestUser.displayName;
      if (!targetUser.profileImageUrl && guestUser.profileImageUrl) profilePatch.profileImageUrl = guestUser.profileImageUrl;
      if (!targetUser.phoneNumber && guestUser.phoneNumber) profilePatch.phoneNumber = guestUser.phoneNumber;
      if (!targetUser.relationshipType && guestUser.relationshipType) profilePatch.relationshipType = guestUser.relationshipType;
      if (!targetUser.childName && guestUser.childName) profilePatch.childName = guestUser.childName;
      if (!targetUser.termsAcceptedAt && guestUser.termsAcceptedAt) profilePatch.termsAcceptedAt = guestUser.termsAcceptedAt;
      if (!targetUser.consentAcceptedAt && guestUser.consentAcceptedAt) profilePatch.consentAcceptedAt = guestUser.consentAcceptedAt;
      if (!targetUser.activePartnershipId && guestUser.activePartnershipId) profilePatch.activePartnershipId = guestUser.activePartnershipId;
      if (Object.keys(profilePatch).length > 0) {
        profilePatch.updatedAt = now;
        await tx.update(users).set(profilePatch).where(eq(users.id, userId));
      }

      // Core communication + planning records
      await tx.update(messages).set({ senderId: userId }).where(eq(messages.senderId, guestUserId));
      await tx.update(messages).set({ recipientId: userId }).where(eq(messages.recipientId, guestUserId));
      await tx.update(notes).set({ createdBy: userId }).where(eq(notes.createdBy, guestUserId));
      await tx.update(tasks).set({ createdBy: userId }).where(eq(tasks.createdBy, guestUserId));
      await tx.update(tasks).set({ assignedTo: userId }).where(eq(tasks.assignedTo, guestUserId));
      await tx.update(childUpdates).set({ createdBy: userId }).where(eq(childUpdates.createdBy, guestUserId));
      await tx.update(children).set({ userId }).where(eq(children.userId, guestUserId));
      await tx.update(pets).set({ createdBy: userId }).where(eq(pets.createdBy, guestUserId));
      await tx.update(events).set({ createdBy: userId }).where(eq(events.createdBy, guestUserId));
      await tx.update(expenses).set({ paidBy: userId }).where(eq(expenses.paidBy, guestUserId));
      await tx.update(expenseParticipants).set({ userId }).where(eq(expenseParticipants.userId, guestUserId));
      await tx.update(settlements).set({ payerId: userId }).where(eq(settlements.payerId, guestUserId));
      await tx.update(settlements).set({ receiverId: userId }).where(eq(settlements.receiverId, guestUserId));
      await tx.update(partnershipBalances).set({ userId }).where(eq(partnershipBalances.userId, guestUserId));
      await tx.update(partnerships).set({ user1Id: userId }).where(eq(partnerships.user1Id, guestUserId));
      await tx.update(partnerships).set({ user2Id: userId }).where(eq(partnerships.user2Id, guestUserId));
      await tx.update(conversations).set({ createdBy: userId }).where(eq(conversations.createdBy, guestUserId));
      await tx.update(conversationMembers).set({ userId }).where(eq(conversationMembers.userId, guestUserId));
      await tx.update(messageSummaries).set({ createdBy: userId }).where(eq(messageSummaries.createdBy, guestUserId));
      await tx.update(prepChatSessions).set({ userId }).where(eq(prepChatSessions.userId, guestUserId));
      await tx.update(scheduleTemplates).set({ createdBy: userId }).where(eq(scheduleTemplates.createdBy, guestUserId));
      await tx.update(storybooks).set({ createdBy: userId }).where(eq(storybooks.createdBy, guestUserId));
      await tx.update(storyPages).set({ createdBy: userId }).where(eq(storyPages.createdBy, guestUserId));
      await tx.update(shoppingLists).set({ createdBy: userId }).where(eq(shoppingLists.createdBy, guestUserId));
      await tx.update(shoppingItems).set({ addedBy: userId }).where(eq(shoppingItems.addedBy, guestUserId));
      await tx.update(shoppingItems).set({ checkedBy: userId }).where(eq(shoppingItems.checkedBy, guestUserId));

      // Calls + conch records
      await tx.update(callSessions).set({ hostId: userId }).where(eq(callSessions.hostId, guestUserId));
      await tx.update(calls).set({ callerId: userId }).where(eq(calls.callerId, guestUserId));
      await tx.update(calls).set({ receiverId: userId }).where(eq(calls.receiverId, guestUserId));
      await tx.update(scheduledCalls).set({ schedulerId: userId }).where(eq(scheduledCalls.schedulerId, guestUserId));
      await tx.update(scheduledCalls).set({ participantId: userId }).where(eq(scheduledCalls.participantId, guestUserId));
      await tx.update(callRecordings).set({ recordedBy: userId }).where(eq(callRecordings.recordedBy, guestUserId));
      await tx.update(conchSessions).set({ initiatorUserId: userId }).where(eq(conchSessions.initiatorUserId, guestUserId));
      await tx.update(conchSessions).set({ conchHolderUserId: userId }).where(eq(conchSessions.conchHolderUserId, guestUserId));
      await tx.update(conchSessionParticipants).set({ userId }).where(eq(conchSessionParticipants.userId, guestUserId));
      await tx.update(callSessionsV2).set({ createdByUserId: userId }).where(eq(callSessionsV2.createdByUserId, guestUserId));
      await tx.update(callParticipantsV2).set({ userId }).where(eq(callParticipantsV2.userId, guestUserId));
      await tx.update(conchStateV2).set({ holderUserId: userId }).where(eq(conchStateV2.holderUserId, guestUserId));
      await tx.update(conchTurnsV2).set({ userId }).where(eq(conchTurnsV2.userId, guestUserId));
      await tx.update(callEventsV2).set({ userId }).where(eq(callEventsV2.userId, guestUserId));
      await tx.update(auditLogs).set({ userId }).where(eq(auditLogs.userId, guestUserId));
      await tx.update(usageMetrics).set({ userId }).where(eq(usageMetrics.userId, guestUserId));
      await tx.update(feedback).set({ userId }).where(eq(feedback.userId, guestUserId));
      await tx.update(agentInterventions).set({ targetUserId: userId }).where(eq(agentInterventions.targetUserId, guestUserId));
      await tx.update(pushSubscriptions).set({ userId }).where(eq(pushSubscriptions.userId, guestUserId));
      await tx.update(streaks).set({ userId }).where(eq(streaks.userId, guestUserId));
      await tx.update(userAchievements).set({ userId }).where(eq(userAchievements.userId, guestUserId));

      // participant arrays
      await tx.execute(
        sql`update call_recordings set participants = array_replace(participants, ${guestUserId}, ${userId}) where ${guestUserId} = any(participants)`
      );
      await tx.execute(
        sql`update relationship_memories set participants = array_replace(participants, ${guestUserId}, ${userId}) where ${guestUserId} = any(participants)`
      );

      // Unique-by-user tables: keep authenticated user's record when it already exists.
      const [guestCallPreference] = await tx.select().from(callPreferences).where(eq(callPreferences.userId, guestUserId)).limit(1);
      const [targetCallPreference] = await tx.select().from(callPreferences).where(eq(callPreferences.userId, userId)).limit(1);
      if (guestCallPreference) {
        if (targetCallPreference) {
          await tx.delete(callPreferences).where(eq(callPreferences.id, guestCallPreference.id));
        } else {
          await tx.update(callPreferences).set({ userId, updatedAt: now }).where(eq(callPreferences.id, guestCallPreference.id));
        }
      }

      const [guestListeningSettings] = await tx.select().from(listeningSettings).where(eq(listeningSettings.userId, guestUserId)).limit(1);
      const [targetListeningSettings] = await tx.select().from(listeningSettings).where(eq(listeningSettings.userId, userId)).limit(1);
      if (guestListeningSettings) {
        if (targetListeningSettings) {
          await tx.delete(listeningSettings).where(eq(listeningSettings.id, guestListeningSettings.id));
        } else {
          await tx.update(listeningSettings).set({ userId, updatedAt: now }).where(eq(listeningSettings.id, guestListeningSettings.id));
        }
      }

      const [guestAgentSettings] = await tx.select().from(agentSettings).where(eq(agentSettings.userId, guestUserId)).limit(1);
      const [targetAgentSettings] = await tx.select().from(agentSettings).where(eq(agentSettings.userId, userId)).limit(1);
      if (guestAgentSettings) {
        if (targetAgentSettings) {
          await tx.delete(agentSettings).where(eq(agentSettings.id, guestAgentSettings.id));
        } else {
          await tx.update(agentSettings).set({ userId, updatedAt: now }).where(eq(agentSettings.id, guestAgentSettings.id));
        }
      }

      const [guestSafetyPlan] = await tx.select().from(safetyPlans).where(eq(safetyPlans.userId, guestUserId)).limit(1);
      const [targetSafetyPlan] = await tx.select().from(safetyPlans).where(eq(safetyPlans.userId, userId)).limit(1);
      if (guestSafetyPlan) {
        if (targetSafetyPlan) {
          await tx.delete(safetyPlans).where(eq(safetyPlans.id, guestSafetyPlan.id));
        } else {
          await tx.update(safetyPlans).set({ userId, updatedAt: now }).where(eq(safetyPlans.id, guestSafetyPlan.id));
        }
      }

      // Merge user stats to preserve trial engagement progress.
      const [guestStats] = await tx.select().from(userStats).where(eq(userStats.userId, guestUserId)).limit(1);
      const [targetStats] = await tx.select().from(userStats).where(eq(userStats.userId, userId)).limit(1);
      if (guestStats) {
        if (targetStats) {
          await tx.update(userStats).set({
            totalMessagesSent: (targetStats.totalMessagesSent || 0) + (guestStats.totalMessagesSent || 0),
            positiveMessagesSent: (targetStats.positiveMessagesSent || 0) + (guestStats.positiveMessagesSent || 0),
            calendarEventsCreated: (targetStats.calendarEventsCreated || 0) + (guestStats.calendarEventsCreated || 0),
            tasksCompleted: (targetStats.tasksCompleted || 0) + (guestStats.tasksCompleted || 0),
            expensesLogged: (targetStats.expensesLogged || 0) + (guestStats.expensesLogged || 0),
            conchSessionsCompleted: (targetStats.conchSessionsCompleted || 0) + (guestStats.conchSessionsCompleted || 0),
            summariesValidated: (targetStats.summariesValidated || 0) + (guestStats.summariesValidated || 0),
            understandingStreak: Math.max(targetStats.understandingStreak || 0, guestStats.understandingStreak || 0),
            longestUnderstandingStreak: Math.max(targetStats.longestUnderstandingStreak || 0, guestStats.longestUnderstandingStreak || 0),
            averageValidationScore: targetStats.averageValidationScore ?? guestStats.averageValidationScore,
            updatedAt: now,
          }).where(eq(userStats.id, targetStats.id));
          await tx.delete(userStats).where(eq(userStats.id, guestStats.id));
        } else {
          await tx.update(userStats).set({ userId, updatedAt: now }).where(eq(userStats.id, guestStats.id));
        }
      }

      // Deduplicate conversation membership rows after reassignment.
      await tx.execute(sql`
        delete from conversation_members a
        using conversation_members b
        where a.id < b.id
          and a.conversation_id = b.conversation_id
          and a.user_id = b.user_id
      `);

      // Link historical guest sessions to the upgraded auth user.
      await tx
        .update(guestSessions)
        .set({
          upgradedToUserId: userId,
          lastSeenAt: now,
        })
        .where(eq(guestSessions.userId, guestUserId));
    });
  }

  async cleanupExpiredSessions(): Promise<{
    deletedSessions: number;
    deletedGuestData: number;
    deletedUsageMetrics: number;
  }> {
    const now = new Date();
    const expiredSessions = await db
      .select({
        sessionId: guestSessions.sessionId,
      })
      .from(guestSessions)
      .where(lt(guestSessions.expiresAt, now));

    if (expiredSessions.length === 0) {
      return {
        deletedSessions: 0,
        deletedGuestData: 0,
        deletedUsageMetrics: 0,
      };
    }

    const sessionFiltersForUsage = expiredSessions.map((session) =>
      eq(usageMetrics.sessionId, session.sessionId),
    );
    const sessionFiltersForGuestData = expiredSessions.map((session) =>
      eq(guestSessionData.guestSessionId, session.sessionId),
    );
    const sessionFiltersForSessions = expiredSessions.map((session) =>
      eq(guestSessions.sessionId, session.sessionId),
    );

    const usageRows = await db
      .select({ id: usageMetrics.id })
      .from(usageMetrics)
      .where(or(...sessionFiltersForUsage));

    const guestDataRows = await db
      .select({ id: guestSessionData.id })
      .from(guestSessionData)
      .where(or(...sessionFiltersForGuestData));

    if (usageRows.length > 0) {
      await db.delete(usageMetrics).where(or(...sessionFiltersForUsage));
    }

    if (guestDataRows.length > 0) {
      await db.delete(guestSessionData).where(or(...sessionFiltersForGuestData));
    }

    await db.delete(guestSessions).where(or(...sessionFiltersForSessions));

    return {
      deletedSessions: expiredSessions.length,
      deletedGuestData: guestDataRows.length,
      deletedUsageMetrics: usageRows.length,
    };
  }

  // Usage metrics operations
  async getUsageMetrics(sessionId: string): Promise<UsageMetric | undefined> {
    const [metric] = await db.select().from(usageMetrics).where(eq(usageMetrics.sessionId, sessionId));
    return metric;
  }

  async createUsageMetric(metricData: InsertUsageMetric): Promise<UsageMetric> {
    const [metric] = await db.insert(usageMetrics).values(metricData).returning();
    return metric;
  }

  async updateUsageMetric(sessionId: string, updates: Partial<UsageMetric>): Promise<void> {
    await db
      .update(usageMetrics)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(usageMetrics.sessionId, sessionId));
  }

  // Message operations
  async getMessages(): Promise<any[]> {
    const result = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        timestamp: messages.timestamp,
        tone: messages.tone,
        toneSummary: messages.toneSummary,
        toneEmoji: messages.toneEmoji,
        rewordingSuggestion: messages.rewordingSuggestion,
        senderDisplayName: users.displayName,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
        senderProfileImage: users.profileImageUrl,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .orderBy(messages.timestamp);
    
    return result;
  }

  async getMessagesByUser(userId: string): Promise<any[]> {
    // Get all messages where user is either sender OR recipient (1:1 conversation)
    const result = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        recipientId: messages.recipientId,
        timestamp: messages.timestamp,
        tone: messages.tone,
        toneSummary: messages.toneSummary,
        toneEmoji: messages.toneEmoji,
        rewordingSuggestion: messages.rewordingSuggestion,
        messageType: messages.messageType,
        fileUrl: messages.fileUrl,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        mimeType: messages.mimeType,
        duration: messages.duration,
        senderDisplayName: users.displayName,
        senderFirstName: users.firstName,
        senderLastName: users.lastName,
        senderProfileImage: users.profileImageUrl,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        or(
          eq(messages.senderId, userId),
          eq(messages.recipientId, userId)
        )
      )
      .orderBy(messages.timestamp);
    
    return result;
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db.insert(messages).values(messageData).returning();
    return message;
  }

  async getMessage(messageId: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
    return message;
  }

  async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read'): Promise<void> {
    const updates: any = { status };
    
    if (status === 'delivered') {
      updates.deliveredAt = new Date();
    } else if (status === 'read') {
      updates.readAt = new Date();
      // Only set deliveredAt if it wasn't already set (preserve original delivery timestamp)
      const [message] = await db.select().from(messages).where(eq(messages.id, messageId));
      if (message && !message.deliveredAt) {
        updates.deliveredAt = new Date();
      }
    }
    
    await db.update(messages).set(updates).where(eq(messages.id, messageId));
  }

  // Contact operations
  async getContacts(userId: string): Promise<Contact[]> {
    const result = await db
      .select({
        id: contacts.id,
        userId: contacts.userId,
        peerUserId: contacts.peerUserId,
        nickname: contacts.nickname,
        allowAudio: contacts.allowAudio,
        allowVideo: contacts.allowVideo,
        allowSms: contacts.allowSms,
        allowRecording: contacts.allowRecording,
        allowAiTone: contacts.allowAiTone,
        createdAt: contacts.createdAt,
        updatedAt: contacts.updatedAt,
        peerUser: {
          id: users.id,
          displayName: users.displayName,
          profileImageUrl: users.profileImageUrl,
          phoneNumber: users.phoneNumber,
        },
      })
      .from(contacts)
      .leftJoin(users, eq(contacts.peerUserId, users.id))
      .where(eq(contacts.userId, userId));
    
    return result as any; // Type assertion needed due to nested object
  }

  async getContactWithUser(userId: string, peerUserId: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts)
      .where(and(
        eq(contacts.userId, userId),
        eq(contacts.peerUserId, peerUserId)
      ));
    return contact;
  }

  async createContact(contactData: InsertContact): Promise<Contact> {
    const [contact] = await db.insert(contacts).values(contactData).returning();
    return contact;
  }

  async updateContact(id: string, updates: Partial<InsertContact>): Promise<Contact> {
    const [contact] = await db.update(contacts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contacts.id, id))
      .returning();
    return contact;
  }

  async deleteContact(id: string): Promise<void> {
    await db.delete(contacts).where(eq(contacts.id, id));
  }

  // Partnership operations
  async getPartnerships(userId: string): Promise<Partnership[]> {
    const result = await db
      .select()
      .from(partnerships)
      .where(
        or(
          eq(partnerships.user1Id, userId),
          eq(partnerships.user2Id, userId)
        )
      );
    return result;
  }

  async getAllPartnerships(): Promise<Partnership[]> {
    const result = await db.select().from(partnerships);
    return result;
  }

  async getPartnershipByCode(inviteCode: string): Promise<Partnership | undefined> {
    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(eq(partnerships.inviteCode, inviteCode));
    return partnership;
  }

  async getPartnership(partnershipId: string): Promise<Partnership | undefined> {
    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(eq(partnerships.id, partnershipId));
    return partnership;
  }

  async createPartnership(partnershipData: InsertPartnership): Promise<Partnership> {
    const [partnership] = await (db.insert(partnerships).values(partnershipData).returning() as any);
    return partnership;
  }

  async updatePartnership(partnershipId: string, updates: Partial<Partnership>): Promise<Partnership> {
    const [partnership] = await db.update(partnerships)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(partnerships.id, partnershipId))
      .returning();
    return partnership;
  }

  async deletePartnership(partnershipId: string): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete ALL partnership-related data in correct order for foreign key constraints
      
      // 0. Clear activePartnershipId for any user referencing this partnership
      await tx.update(users).set({ activePartnershipId: null }).where(eq(users.activePartnershipId, partnershipId));
      
      // 1. Notes, tasks, child updates (no cascade)
      await tx.delete(notes).where(eq(notes.partnershipId, partnershipId));
      await tx.delete(tasks).where(eq(tasks.partnershipId, partnershipId));
      await tx.delete(childUpdates).where(eq(childUpdates.partnershipId, partnershipId));
      
      // 2. Children - set partnershipId to null (nullable FK, preserve child records)
      await tx.update(children).set({ partnershipId: null }).where(eq(children.partnershipId, partnershipId));
      
      // 3. Pets (no cascade)
      await tx.delete(pets).where(eq(pets.partnershipId, partnershipId));
      
      // 4. Message summaries (no cascade)
      await tx.delete(messageSummaries).where(eq(messageSummaries.partnershipId, partnershipId));
      
      // 5. User stats, streaks, achievements - set partnershipId to null (nullable FK)
      await tx.update(userStats).set({ partnershipId: null }).where(eq(userStats.partnershipId, partnershipId));
      await tx.update(streaks).set({ partnershipId: null }).where(eq(streaks.partnershipId, partnershipId));
      await tx.update(userAchievements).set({ partnershipId: null }).where(eq(userAchievements.partnershipId, partnershipId));
      
      // 6. Shopping lists (shoppingItems will cascade)
      await tx.delete(shoppingLists).where(eq(shoppingLists.partnershipId, partnershipId));
      
      // 7. Storybooks (storyPages will cascade)
      await tx.delete(storybooks).where(eq(storybooks.partnershipId, partnershipId));
      
      // 8. Expenses (expenseParticipants and settlements will cascade)
      await tx.delete(expenses).where(eq(expenses.partnershipId, partnershipId));
      
      // 9. Partnership balances
      await tx.delete(partnershipBalances).where(eq(partnershipBalances.partnershipId, partnershipId));
      
      // 10. Scheduled calls and calls
      await tx.delete(scheduledCalls).where(eq(scheduledCalls.partnershipId, partnershipId));
      await tx.delete(calls).where(eq(calls.partnershipId, partnershipId));
      
      // 11. V2 call sessions - set partnershipId to null (nullable FK)
      await tx.update(callSessionsV2).set({ partnershipId: null }).where(eq(callSessionsV2.partnershipId, partnershipId));
      
      // 12. Conch sessions (conchSessionParticipants will cascade)
      await tx.delete(conchSessions).where(eq(conchSessions.partnershipId, partnershipId));
      
      // 13. Finally, delete the partnership itself (cascade tables auto-delete: relationshipMemories, agentInterventions, conflictPatterns, prepChatSessions)
      await tx.delete(partnerships).where(eq(partnerships.id, partnershipId));
    });
  }

  async getUserByInviteCode(inviteCode: string): Promise<User | undefined> {
    console.log(`[Storage] Looking up user by invite code: ${inviteCode}`);
    const [user] = await db.select().from(users).where(eq(users.inviteCode, inviteCode));
    
    if (user) {
      console.log(`[Storage] Found user with invite code ${inviteCode}: ${user.displayName} (ID: ${user.id})`);
    } else {
      console.log(`[Storage] No user found with invite code: ${inviteCode}`);
      // Debug: Let's see all invite codes in the database
      const allUsers = await db.select({ id: users.id, displayName: users.displayName, inviteCode: users.inviteCode }).from(users);
      console.log(`[Storage] All users in database:`, allUsers);
    }
    
    return user;
  }

  async generateInviteCode(): Promise<string> {
    // Generate a unique 6-character alphanumeric code
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Keep generating until we find a unique one
    let isUnique = false;
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if code is unique
      const existing = await this.getUserByInviteCode(code);
      if (!existing) {
        isUnique = true;
      }
    }
    
    return code;
  }

  async regenerateInviteCode(userId: string): Promise<string> {
    const newCode = await this.generateInviteCode();
    await db
      .update(users)
      .set({ 
        inviteCode: newCode, 
        inviteCodeGeneratedAt: new Date(), // Reset expiration timer (14 days)
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId));
    return newCode;
  }

  // Conversation operations
  async getConversations(userId: string): Promise<any[]> {
    // Get all conversations the user is a member of
    const userConversations = await db
      .select({
        conversation: conversations,
      })
      .from(conversationMembers)
      .innerJoin(conversations, eq(conversationMembers.conversationId, conversations.id))
      .where(eq(conversationMembers.userId, userId))
      .orderBy(desc(conversations.updatedAt));

    // Enrich each conversation with member details
    const enrichedConversations = await Promise.all(
      userConversations.map(async ({ conversation }) => {
        const members = await this.getConversationMembers(conversation.id);
        const memberDetails = await Promise.all(
          members.map(async (member) => {
            const user = await this.getUser(member.userId);
            return {
              id: user?.id,
              displayName: user?.displayName,
              firstName: user?.firstName,
              lastName: user?.lastName,
              email: user?.email,
              profileImageUrl: user?.profileImageUrl,
            };
          })
        );

        return {
          ...conversation,
          members: memberDetails,
        };
      })
    );

    return enrichedConversations;
  }

  async getConversation(conversationId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    return conversation;
  }

  async createConversation(conversationData: InsertConversation): Promise<Conversation> {
    const [conversation] = await db.insert(conversations).values(conversationData).returning();
    return conversation;
  }

  async addConversationMember(memberData: InsertConversationMember): Promise<ConversationMember> {
    const [member] = await db.insert(conversationMembers).values(memberData).returning();
    return member;
  }

  async getConversationMembers(conversationId: string): Promise<ConversationMember[]> {
    return await db
      .select()
      .from(conversationMembers)
      .where(eq(conversationMembers.conversationId, conversationId));
  }

  async getConversationMessages(conversationId: string): Promise<any[]> {
    const result = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        conversationId: messages.conversationId,
        timestamp: messages.timestamp,
        tone: messages.tone,
        toneSummary: messages.toneSummary,
        toneEmoji: messages.toneEmoji,
        rewordingSuggestion: messages.rewordingSuggestion,
        messageType: messages.messageType,
        fileUrl: messages.fileUrl,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        mimeType: messages.mimeType,
        duration: messages.duration,
        replyToId: messages.replyToId,
        senderDisplayName: users.displayName,
        senderProfileImage: users.profileImageUrl, // Match field name used by frontend
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.timestamp);
    
    return result;
  }

  async getMessagesWithUnavailableTone(): Promise<any[]> {
    const { or, like } = await import("drizzle-orm");
    const result = await db
      .select({
        id: messages.id,
        content: messages.content,
        senderId: messages.senderId,
        conversationId: messages.conversationId,
      })
      .from(messages)
      .where(
        or(
          eq(messages.toneSummary, 'AI analysis unavailable'),
          like(messages.toneSummary, '%unavailable%')
        )
      );
    
    return result;
  }

  async updateMessageTone(
    messageId: string, 
    toneData: {
      tone: string;
      toneSummary: string;
      toneEmoji: string;
      rewordingSuggestion: string | null;
    }
  ): Promise<void> {
    await db
      .update(messages)
      .set({
        tone: toneData.tone,
        toneSummary: toneData.toneSummary,
        toneEmoji: toneData.toneEmoji,
        rewordingSuggestion: toneData.rewordingSuggestion,
      })
      .where(eq(messages.id, messageId));
  }

  async findDirectConversation(userId1: string, userId2: string): Promise<Conversation | undefined> {
    // Find a direct conversation between two users
    const conversations1 = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId1));

    const conversations2 = await db
      .select({ conversationId: conversationMembers.conversationId })
      .from(conversationMembers)
      .where(eq(conversationMembers.userId, userId2));

    // Find common conversations
    const commonConvIds = conversations1
      .map(c => c.conversationId)
      .filter(id => conversations2.some(c2 => c2.conversationId === id));

    // Check which ones are direct (have exactly 2 members)
    for (const convId of commonConvIds) {
      const members = await this.getConversationMembers(convId);
      if (members.length === 2) {
        const [conversation] = await db
          .select()
          .from(conversations)
          .where(and(
            eq(conversations.id, convId),
            eq(conversations.type, 'direct')
          ));
        if (conversation) {
          return conversation;
        }
      }
    }

    return undefined;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    // Delete conversation (cascade will automatically delete members and messages)
    await db.delete(conversations).where(eq(conversations.id, conversationId));
  }

  // Note operations
  async getNotes(userId: string, partnershipId?: string): Promise<Note[]> {
    // SECURITY: Require partnershipId to prevent cross-partnership data leakage
    if (!partnershipId) {
      // CRITICAL: No partnership = no data. User must have an active partnership to see any notes.
      return [];
    }
    
    // Filter by partnershipId column directly - prevents user-created data from other partnerships from leaking
    return await db.select().from(notes)
      .where(eq(notes.partnershipId, partnershipId))
      .orderBy(desc(notes.createdAt));
  }

  async createNote(noteData: InsertNote): Promise<Note> {
    const [note] = await db.insert(notes).values(noteData).returning();
    return note;
  }

  async updateNote(id: string, noteData: Partial<InsertNote>): Promise<Note> {
    const [note] = await db
      .update(notes)
      .set(noteData)
      .where(eq(notes.id, id))
      .returning();
    return note;
  }

  async deleteNote(id: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  // Task operations
  async getTasks(userId: string, partnershipId?: string): Promise<Task[]> {
    // SECURITY: Require partnershipId to prevent cross-partnership data leakage
    if (!partnershipId) {
      // CRITICAL: No partnership = no data. User must have an active partnership to see any tasks.
      return [];
    }
    
    // Filter by partnershipId column directly - prevents user-created data from other partnerships from leaking
    return await db.select().from(tasks)
      .where(eq(tasks.partnershipId, partnershipId))
      .orderBy(tasks.createdAt);
  }

  async getTask(taskId: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    return task;
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(taskData).returning();
    return task;
  }

  async updateTask(id: string, taskData: Partial<InsertTask>): Promise<Task> {
    const [task] = await db
      .update(tasks)
      .set(taskData)
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Child update operations
  async getChildUpdates(userId: string, partnershipId?: string): Promise<ChildUpdate[]> {
    // SECURITY: Require partnershipId to prevent cross-partnership data leakage
    if (!partnershipId) {
      // CRITICAL: No partnership = no data. User must have an active partnership to see any child updates.
      return [];
    }
    
    // Filter by partnershipId column directly - prevents user-created data from other partnerships from leaking
    return await db.select().from(childUpdates)
      .where(eq(childUpdates.partnershipId, partnershipId))
      .orderBy(desc(childUpdates.createdAt));
  }

  async createChildUpdate(updateData: InsertChildUpdate): Promise<ChildUpdate> {
    const [update] = await db.insert(childUpdates).values(updateData).returning();
    return update;
  }

  async deleteChildUpdate(id: string): Promise<void> {
    await db.delete(childUpdates).where(eq(childUpdates.id, id));
  }

  // Children operations (for onboarding)
  async getChildren(userId: string): Promise<Child[]> {
    return await db.select().from(children).where(eq(children.userId, userId));
  }

  async getChild(id: string): Promise<Child | undefined> {
    const result = await db.select().from(children).where(eq(children.id, id));
    return result[0];
  }

  async createChild(child: InsertChild): Promise<Child> {
    const result = await db.insert(children).values(child).returning();
    return result[0];
  }

  async updateChild(id: string, updates: Partial<InsertChild>): Promise<Child> {
    const result = await db.update(children)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(children.id, id))
      .returning();
    return result[0];
  }

  async deleteChild(id: string): Promise<void> {
    await db.delete(children).where(eq(children.id, id));
  }

  // Pet operations
  async getPets(userId: string, partnershipId?: string): Promise<Pet[]> {
    // SECURITY: Require partnershipId to prevent cross-partnership data leakage
    if (!partnershipId) {
      // CRITICAL: No partnership = no data. User must have an active partnership to see any pets.
      return [];
    }
    
    // Filter by partnershipId column directly - prevents user-created data from other partnerships from leaking
    return await db.select().from(pets)
      .where(eq(pets.partnershipId, partnershipId))
      .orderBy(desc(pets.createdAt));
  }

  async createPet(petData: InsertPet): Promise<Pet> {
    const [pet] = await db.insert(pets).values(petData).returning();
    return pet;
  }

  // Expense operations
  async getExpenses(userId: string, partnershipId?: string): Promise<Expense[]> {
    const { or, isNull, inArray } = await import("drizzle-orm");
    
    // SECURITY: Filter by active partnership to prevent cross-partnership data leakage
    if (partnershipId) {
      // Get partnership expenses AND user's solo expenses (null partnershipId)
      return await db.select().from(expenses)
        .where(or(
          eq(expenses.partnershipId, partnershipId),
          and(isNull(expenses.partnershipId), eq(expenses.paidBy, userId))
        ))
        .orderBy(desc(expenses.createdAt));
    }
    
    // No active partnership: get user's solo expenses + any partnered expenses
    const partnerships = await this.getPartnerships(userId);
    
    // Collect all user IDs in partnerships (including current user)
    const partnerUserIds = new Set<string>();
    partnerUserIds.add(userId);
    partnerships.forEach(p => {
      partnerUserIds.add(p.user1Id);
      partnerUserIds.add(p.user2Id);
    });
    
    // Return expenses: solo (null partnershipId + paidBy user) OR partnered expenses
    return await db.select().from(expenses)
      .where(or(
        and(isNull(expenses.partnershipId), eq(expenses.paidBy, userId)),
        inArray(expenses.paidBy, Array.from(partnerUserIds))
      ))
      .orderBy(desc(expenses.createdAt));
  }

  async getExpense(expenseId: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
    return expense;
  }

  async createExpense(expenseData: InsertExpense): Promise<Expense> {
    const [expense] = await db.insert(expenses).values(expenseData).returning();
    return expense;
  }

  async updateExpense(expenseId: string, updates: Partial<Expense>): Promise<Expense> {
    const [updated] = await db.update(expenses)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(expenses.id, expenseId))
      .returning();
    return updated;
  }

  // Expense participant operations
  async getExpenseParticipants(expenseId: string): Promise<ExpenseParticipant[]> {
    return await db.select().from(expenseParticipants)
      .where(eq(expenseParticipants.expenseId, expenseId));
  }

  async createExpenseParticipant(participantData: InsertExpenseParticipant): Promise<ExpenseParticipant> {
    const [participant] = await db.insert(expenseParticipants).values(participantData).returning();
    return participant;
  }

  async updateExpenseParticipant(id: string, updates: Partial<ExpenseParticipant>): Promise<ExpenseParticipant> {
    const [updated] = await db.update(expenseParticipants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(expenseParticipants.id, id))
      .returning();
    return updated;
  }

  // Settlement operations
  async getSettlements(partnershipId: string): Promise<Settlement[]> {
    return await db.select().from(settlements)
      .where(eq(settlements.partnershipId, partnershipId))
      .orderBy(desc(settlements.createdAt));
  }

  async getSettlement(settlementId: string): Promise<Settlement | undefined> {
    const [settlement] = await db.select().from(settlements)
      .where(eq(settlements.id, settlementId));
    return settlement;
  }

  async getExpenseSettlements(expenseId: string): Promise<Settlement[]> {
    return await db.select().from(settlements)
      .where(eq(settlements.expenseId, expenseId))
      .orderBy(desc(settlements.createdAt));
  }

  async createSettlement(settlementData: InsertSettlement): Promise<Settlement> {
    const [settlement] = await db.insert(settlements).values(settlementData).returning();
    return settlement;
  }

  async updateSettlement(id: string, updates: Partial<Settlement>): Promise<Settlement> {
    const [updated] = await db.update(settlements)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(settlements.id, id))
      .returning();
    return updated;
  }

  async getPendingSettlements(userId: string): Promise<Settlement[]> {
    // Get settlements where user is the receiver and status is pending_confirmation
    return await db.select().from(settlements)
      .where(
        and(
          eq(settlements.receiverId, userId),
          or(
            eq(settlements.status, 'initiated'),
            eq(settlements.status, 'pending_confirmation')
          )
        )
      )
      .orderBy(desc(settlements.createdAt));
  }

  // Partnership balance operations
  async getPartnershipBalance(partnershipId: string, userId: string): Promise<PartnershipBalance | undefined> {
    const [balance] = await db.select().from(partnershipBalances)
      .where(
        and(
          eq(partnershipBalances.partnershipId, partnershipId),
          eq(partnershipBalances.userId, userId)
        )
      );
    return balance;
  }

  async upsertPartnershipBalance(balanceData: InsertPartnershipBalance): Promise<PartnershipBalance> {
    // Try to find existing balance
    const existing = await this.getPartnershipBalance(balanceData.partnershipId, balanceData.userId);
    
    if (existing) {
      // Update existing
      const [updated] = await db.update(partnershipBalances)
        .set({ ...balanceData, lastUpdated: new Date() })
        .where(eq(partnershipBalances.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await db.insert(partnershipBalances).values(balanceData).returning();
      return created;
    }
  }

  async calculatePartnershipBalances(partnershipId: string): Promise<void> {
    // Get all expense participants for this partnership
    const participants = await db.select().from(expenseParticipants)
      .where(eq(expenseParticipants.partnershipId, partnershipId));
    
    // Calculate balance per user
    const balanceMap = new Map<string, number>();
    
    for (const participant of participants) {
      const owed = parseFloat(participant.owedAmount);
      const paid = parseFloat(participant.paidAmount);
      const balance = owed - paid; // Positive = they owe money
      
      const currentBalance = balanceMap.get(participant.userId) || 0;
      balanceMap.set(participant.userId, currentBalance + balance);
    }
    
    // Upsert balances for each user
    for (const [userId, netBalance] of Array.from(balanceMap.entries())) {
      await this.upsertPartnershipBalance({
        partnershipId,
        userId,
        netBalance: netBalance.toFixed(2),
      });
    }
  }

  // Event operations
  async getEvents(userId: string): Promise<Event[]> {
    // Get all partnerships for this user
    const partnerships = await this.getPartnerships(userId);
    
    // Collect all user IDs in partnerships (including current user)
    const partnerUserIds = new Set<string>();
    partnerUserIds.add(userId);
    partnerships.forEach(p => {
      partnerUserIds.add(p.user1Id);
      partnerUserIds.add(p.user2Id);
    });
    
    // Return events created by ANY partnered user
    const { inArray } = await import("drizzle-orm");
    return await db.select().from(events)
      .where(inArray(events.createdBy, Array.from(partnerUserIds)))
      .orderBy(events.startDate);
  }

  async createEvent(eventData: InsertEvent): Promise<Event> {
    const [event] = await db.insert(events).values(eventData).returning();
    return event;
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, eventId));
    return event;
  }

  async updateEvent(eventId: string, eventData: InsertEvent): Promise<Event> {
    const [event] = await db.update(events)
      .set(eventData)
      .where(eq(events.id, eventId))
      .returning();
    return event;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await db.delete(events).where(eq(events.id, eventId));
  }

  // Call session operations
  async createCallSession(sessionData: InsertCallSession): Promise<CallSession> {
    const [session] = await db.insert(callSessions).values(sessionData).returning();
    return session;
  }

  async getCallSessionByCode(sessionCode: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.sessionCode, sessionCode));
    return session;
  }

  async getCallSessionById(sessionId: string): Promise<CallSession | undefined> {
    const [session] = await db.select().from(callSessions).where(eq(callSessions.id, sessionId));
    return session;
  }

  async endCallSession(sessionCode: string): Promise<void> {
    await db.update(callSessions)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(callSessions.sessionCode, sessionCode));
  }

  // New direct calling operations
  async createCall(callData: InsertCall): Promise<Call> {
    const [call] = await db.insert(calls).values(callData).returning();
    return call;
  }

  async getCall(id: string): Promise<Call | undefined> {
    const [call] = await db.select().from(calls).where(eq(calls.id, id));
    return call;
  }

  async getCalls(userId: string, filter?: string): Promise<Call[]> {
    // Get all calls where user is either caller or receiver
    const userCalls = await db.select().from(calls)
      .where(or(eq(calls.callerId, userId), eq(calls.receiverId, userId)))
      .orderBy(desc(calls.createdAt));

    // Apply filters
    if (!filter || filter === 'all') {
      return userCalls;
    }

    if (filter === 'missed') {
      return userCalls.filter(c => c.status === 'missed' && c.receiverId === userId);
    }

    if (filter === 'received') {
      return userCalls.filter(c => c.receiverId === userId && (c.status === 'ended' || c.status === 'active'));
    }

    if (filter === 'outgoing') {
      return userCalls.filter(c => c.callerId === userId);
    }

    return userCalls;
  }

  async getAllCalls(): Promise<Call[]> {
    // Get all calls (for cleanup purposes)
    return await db.select().from(calls)
      .orderBy(desc(calls.createdAt));
  }

  async getStuckRingingCalls(timeoutSeconds: number): Promise<Call[]> {
    // Get calls stuck in ringing status for more than timeout seconds
    // Push filter down to DB for performance (no in-memory filtering)
    const cutoffTime = new Date(Date.now() - timeoutSeconds * 1000);
    return await db.select().from(calls)
      .where(and(
        eq(calls.status, 'ringing'),
        lt(calls.createdAt, cutoffTime)
      ))
      .orderBy(calls.createdAt);
  }

  async updateCall(id: string, updates: Partial<Call>): Promise<Call> {
    const [updatedCall] = await db.update(calls)
      .set({ ...updates, createdAt: undefined } as any) // Don't update createdAt
      .where(eq(calls.id, id))
      .returning();
    return updatedCall;
  }

  // Scheduled call operations
  async createScheduledCall(scheduledCallData: InsertScheduledCall): Promise<ScheduledCall> {
    const [scheduledCall] = await db.insert(scheduledCalls).values(scheduledCallData).returning();
    return scheduledCall;
  }

  async getScheduledCalls(userId: string): Promise<ScheduledCall[]> {
    // Get scheduled calls where user is either scheduler or participant
    return await db.select().from(scheduledCalls)
      .where(or(eq(scheduledCalls.schedulerId, userId), eq(scheduledCalls.participantId, userId)))
      .orderBy(scheduledCalls.scheduledFor);
  }

  async getScheduledCall(id: string): Promise<ScheduledCall | undefined> {
    const [scheduledCall] = await db.select().from(scheduledCalls).where(eq(scheduledCalls.id, id));
    return scheduledCall;
  }

  async updateScheduledCall(id: string, updates: Partial<ScheduledCall>): Promise<ScheduledCall> {
    const [updated] = await db.update(scheduledCalls)
      .set({ ...updates, createdAt: undefined } as any)
      .where(eq(scheduledCalls.id, id))
      .returning();
    return updated;
  }

  // Call recording operations
  async createCallRecording(recordingData: InsertCallRecording): Promise<CallRecording> {
    const [recording] = await db.insert(callRecordings).values(recordingData).returning();
    return recording;
  }

  async getCallRecordings(userId: string): Promise<CallRecording[]> {
    return await db.select().from(callRecordings)
      .where(eq(callRecordings.recordedBy, userId))
      .orderBy(desc(callRecordings.createdAt));
  }

  async getCallRecordingById(id: string): Promise<CallRecording | undefined> {
    const [recording] = await db.select().from(callRecordings).where(eq(callRecordings.id, id));
    return recording;
  }

  // Call follow-up operations
  async createCallFollowup(followupData: InsertCallFollowup): Promise<CallFollowup> {
    const [followup] = await db.insert(callFollowups).values(followupData).returning();
    return followup;
  }

  async getCallFollowup(callId: string): Promise<CallFollowup | undefined> {
    const [followup] = await db.select().from(callFollowups).where(eq(callFollowups.callId, callId));
    return followup;
  }

  // Call preference operations
  async getCallPreference(userId: string): Promise<CallPreference | undefined> {
    const [preference] = await db.select().from(callPreferences).where(eq(callPreferences.userId, userId));
    return preference;
  }

  async createCallPreference(preferenceData: InsertCallPreference): Promise<CallPreference> {
    const [preference] = await db.insert(callPreferences).values(preferenceData).returning();
    return preference;
  }

  async updateCallPreference(userId: string, updates: Partial<CallPreference>): Promise<CallPreference> {
    // Omit immutable fields to avoid NULL violations
    const { id, userId: _, createdAt, ...rest } = updates;
    const [updated] = await db.update(callPreferences)
      .set({ ...rest, updatedAt: new Date() })
      .where(eq(callPreferences.userId, userId))
      .returning();
    if (!updated) {
      throw new Error("Call preference not found for user");
    }
    return updated;
  }

  // V2 Call Engine operations
  async createCallSessionV2(session: InsertCallSessionV2): Promise<CallSessionV2> {
    const [created] = await db.insert(callSessionsV2).values(session).returning();
    return created;
  }

  async getCallSessionV2(id: string): Promise<CallSessionV2 | undefined> {
    const [session] = await db.select().from(callSessionsV2).where(eq(callSessionsV2.id, id));
    return session;
  }

  async updateCallSessionV2(id: string, updates: Partial<CallSessionV2>): Promise<CallSessionV2> {
    const { id: _, createdAt, ...rest } = updates;
    const [updated] = await db.update(callSessionsV2)
      .set(rest)
      .where(eq(callSessionsV2.id, id))
      .returning();
    if (!updated) {
      throw new Error("Call session V2 not found");
    }
    return updated;
  }

  async createCallParticipantV2(participant: InsertCallParticipantV2): Promise<CallParticipantV2> {
    const [created] = await db.insert(callParticipantsV2).values(participant).returning();
    return created;
  }

  async updateCallParticipantV2ByUserAndCall(callId: string, userId: string, updates: Partial<CallParticipantV2>): Promise<CallParticipantV2> {
    const { id, callId: _, userId: __, ...rest } = updates;
    const [updated] = await db.update(callParticipantsV2)
      .set(rest)
      .where(and(
        eq(callParticipantsV2.callId, callId),
        eq(callParticipantsV2.userId, userId)
      ))
      .returning();
    if (!updated) {
      throw new Error("Call participant V2 not found");
    }
    return updated;
  }

  async createConchTurnV2(turn: InsertConchTurnV2): Promise<ConchTurnV2> {
    const [created] = await db.insert(conchTurnsV2).values(turn).returning();
    return created;
  }

  async completeConchTurnV2(callId: string, userId: string, endReason: string): Promise<void> {
    const now = new Date();
    // Find the active turn for this user
    const [activeTurn] = await db.select()
      .from(conchTurnsV2)
      .where(and(
        eq(conchTurnsV2.callId, callId),
        eq(conchTurnsV2.userId, userId),
        sql`${conchTurnsV2.endedAt} IS NULL`
      ))
      .orderBy(desc(conchTurnsV2.startedAt))
      .limit(1);

    if (activeTurn) {
      const duration = Math.floor((now.getTime() - activeTurn.startedAt.getTime()) / 1000);
      await db.update(conchTurnsV2)
        .set({
          endedAt: now,
          duration,
          endReason
        })
        .where(eq(conchTurnsV2.id, activeTurn.id));
    }
  }

  async upsertConchStateV2(state: InsertConchStateV2): Promise<ConchStateV2> {
    const { callId } = state;
    
    // Check if conch state exists for this call
    const [existing] = await db.select()
      .from(conchStateV2)
      .where(eq(conchStateV2.callId, callId));

    if (existing) {
      // Update existing
      const [updated] = await db.update(conchStateV2)
        .set({
          ...state,
          lastUpdatedAt: new Date()
        })
        .where(eq(conchStateV2.callId, callId))
        .returning();
      return updated;
    } else {
      // Create new
      const [created] = await db.insert(conchStateV2)
        .values({
          ...state,
          lastUpdatedAt: new Date()
        })
        .returning();
      return created;
    }
  }

  // Therapist operations
  async createTherapist(therapistData: InsertTherapist): Promise<Therapist> {
    const [therapist] = await db.insert(therapists).values(therapistData).returning();
    return therapist;
  }

  async getTherapists(): Promise<Therapist[]> {
    return await db.select().from(therapists).orderBy(therapists.name);
  }

  async searchTherapists(userLat: string, userLng: string, maxDistance: number = 50): Promise<Therapist[]> {
    // Calculate distance using Haversine formula in SQL
    const allTherapists = await db.select().from(therapists);
    
    // Calculate distance for each therapist
    const therapistsWithDistance = allTherapists.map(t => {
      const lat1 = parseFloat(userLat);
      const lon1 = parseFloat(userLng);
      const lat2 = parseFloat(t.latitude);
      const lon2 = parseFloat(t.longitude);
      
      const R = 3959; // Earth radius in miles
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return { ...t, distance: distance.toFixed(2) };
    });
    
    // Filter by distance and sort
    return therapistsWithDistance
      .filter(t => parseFloat(t.distance || '0') <= maxDistance)
      .sort((a, b) => parseFloat(a.distance || '0') - parseFloat(b.distance || '0'));
  }

  // Support resource operations
  async getSupportResources(category: string = 'all', genderFocus: string = 'all'): Promise<SupportResource[]> {
    let query = db.select().from(supportResources);
    
    // Apply filters
    const conditions = [];
    if (category && category !== 'all') {
      conditions.push(eq(supportResources.category, category));
    }
    if (genderFocus && genderFocus !== 'all') {
      conditions.push(eq(supportResources.genderFocus, genderFocus));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const results = await query.orderBy(supportResources.organization);
    return results;
  }

  // Audit log operations
  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(logData).returning();
    return log;
  }

  async getAuditLogs(userId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.createdAt));
  }

  async getUserAuditTrail(userId: string, startDate?: Date, endDate?: Date): Promise<any> {
    // Get all messages sent by user
    const userMessages = await db.select().from(messages)
      .where(eq(messages.senderId, userId))
      .orderBy(messages.timestamp);
    
    // Enrich messages with conversation metadata for FRO compliance
    const enrichedMessages = await Promise.all(
      userMessages.map(async (msg) => {
        let conversationType = 'Unknown';
        let participants: string[] = [];
        
        if (msg.conversationId) {
          const conversation = await this.getConversation(msg.conversationId);
          if (conversation) {
            conversationType = conversation.type === 'direct' ? 'Direct (1:1)' : 'Group';
            const members = await this.getConversationMembers(msg.conversationId);
            const memberDetails = await Promise.all(
              members.map(async (m) => {
                const user = await this.getUser(m.userId);
                return user?.displayName || 'Unknown User';
              })
            );
            participants = memberDetails;
          }
        } else if (msg.recipientId) {
          // Legacy 1:1 message
          conversationType = 'Direct (1:1 - Legacy)';
          const recipient = await this.getUser(msg.recipientId);
          const sender = await this.getUser(msg.senderId);
          participants = [sender?.displayName || 'You', recipient?.displayName || 'Unknown'];
        }
        
        return {
          ...msg,
          conversationType,
          participants: participants.join(', '),
        };
      })
    );
    
    // Get all events
    const userEvents = await db.select().from(events)
      .where(eq(events.createdBy, userId))
      .orderBy(events.startDate);
    
    // Get all call sessions
    const userCalls = await db.select().from(callSessions)
      .where(eq(callSessions.hostId, userId))
      .orderBy(desc(callSessions.createdAt));
    
    // Get call recordings
    const userRecordings = await db.select().from(callRecordings)
      .where(eq(callRecordings.recordedBy, userId))
      .orderBy(desc(callRecordings.createdAt));
    
    return {
      messages: enrichedMessages,
      events: userEvents,
      calls: userCalls,
      recordings: userRecordings,
      summary: {
        totalMessages: enrichedMessages.length,
        totalEvents: userEvents.length,
        totalCalls: userCalls.length,
        totalRecordings: userRecordings.length,
      }
    };
  }

  // Push subscription operations
  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const [sub] = await db.insert(pushSubscriptions).values(subscription).returning();
    return sub;
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async deletePushSubscription(identifier: { endpoint?: string; deviceToken?: string }): Promise<void> {
    // SECURITY: Delete by either endpoint (web push) or deviceToken (native push)
    if (identifier.endpoint) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, identifier.endpoint));
    } else if (identifier.deviceToken) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.deviceToken, identifier.deviceToken));
    } else {
      console.warn('deletePushSubscription called without endpoint or deviceToken');
    }
  }

  // Session mood summary operations
  async createSessionMoodSummary(summary: InsertSessionMoodSummary): Promise<SessionMoodSummary> {
    const [moodSummary] = await db.insert(sessionMoodSummaries).values(summary).returning();
    return moodSummary;
  }

  async getSessionMoodSummary(sessionId: string): Promise<SessionMoodSummary | undefined> {
    const [summary] = await db.select().from(sessionMoodSummaries)
      .where(eq(sessionMoodSummaries.sessionId, sessionId));
    return summary;
  }

  async getSessionMoodSummariesByUser(userId: string): Promise<SessionMoodSummary[]> {
    // Get summaries where user is a participant
    const summaries = await db.select().from(sessionMoodSummaries);
    return summaries.filter(s => s.participants.includes(userId));
  }

  // Schedule template operations
  async getScheduleTemplates(userId?: string): Promise<ScheduleTemplate[]> {
    if (userId) {
      // Return public system templates + user's custom templates
      return await db.select().from(scheduleTemplates)
        .where(
          or(
            eq(scheduleTemplates.isPublic, true),
            eq(scheduleTemplates.createdBy, userId)
          )
        )
        .orderBy(desc(scheduleTemplates.createdAt));
    } else {
      // Return only public system templates
      return await db.select().from(scheduleTemplates)
        .where(eq(scheduleTemplates.isPublic, true))
        .orderBy(desc(scheduleTemplates.createdAt));
    }
  }

  async getScheduleTemplate(id: string): Promise<ScheduleTemplate | undefined> {
    const [template] = await db.select().from(scheduleTemplates)
      .where(eq(scheduleTemplates.id, id));
    return template;
  }

  async createScheduleTemplate(template: InsertScheduleTemplate): Promise<ScheduleTemplate> {
    const [newTemplate] = await db.insert(scheduleTemplates).values(template).returning();
    return newTemplate;
  }

  async deleteScheduleTemplate(id: string): Promise<void> {
    await db.delete(scheduleTemplates).where(eq(scheduleTemplates.id, id));
  }

  // Conch session operations
  async createConchSession(session: InsertConchSession): Promise<ConchSession> {
    const [newSession] = await db.insert(conchSessions).values(session).returning();
    console.log(`[Storage] Created Conch session: ${newSession.id} for partnership: ${newSession.partnershipId}`);
    return newSession;
  }

  async getConchSession(sessionId: string): Promise<ConchSession | undefined> {
    const [session] = await db.select().from(conchSessions)
      .where(eq(conchSessions.id, sessionId));
    return session;
  }

  async getActiveConchSession(partnershipId: string): Promise<ConchSession | undefined> {
    const [session] = await db.select().from(conchSessions)
      .where(and(
        eq(conchSessions.partnershipId, partnershipId),
        or(
          eq(conchSessions.status, 'pending'),
          eq(conchSessions.status, 'active')
        )
      ))
      .orderBy(desc(conchSessions.createdAt))
      .limit(1);
    return session;
  }

  async getAllConchSessions(): Promise<ConchSession[]> {
    // Get all sessions that are not ended (for cleanup purposes)
    const sessions = await db.select().from(conchSessions)
      .where(or(
        eq(conchSessions.status, 'pending'),
        eq(conchSessions.status, 'active')
      ))
      .orderBy(conchSessions.createdAt);
    return sessions;
  }

  async updateConchSession(sessionId: string, updates: Partial<ConchSession>): Promise<ConchSession> {
    const [updated] = await db.update(conchSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conchSessions.id, sessionId))
      .returning();
    return updated;
  }

  async endConchSession(sessionId: string): Promise<void> {
    await db.update(conchSessions)
      .set({ 
        status: 'ended', 
        endedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(conchSessions.id, sessionId));
    console.log(`[Storage] Ended Conch session: ${sessionId}`);
  }

  async addConchSessionParticipant(participant: InsertConchSessionParticipant): Promise<ConchSessionParticipant> {
    const [newParticipant] = await db.insert(conchSessionParticipants)
      .values(participant)
      .returning();
    console.log(`[Storage] User ${newParticipant.userId} joined Conch session: ${newParticipant.sessionId}`);
    return newParticipant;
  }

  async getConchSessionParticipants(sessionId: string): Promise<ConchSessionParticipant[]> {
    const participants = await db.select().from(conchSessionParticipants)
      .where(eq(conchSessionParticipants.sessionId, sessionId))
      .orderBy(conchSessionParticipants.joinedAt);
    return participants;
  }
  
  async getAdminStats() {
    // Use efficient COUNT queries instead of loading entire tables
    const [userCount] = await db.select({ value: count() }).from(users);
    const [partnershipCount] = await db.select({ value: count() }).from(partnerships);
    const [messageCount] = await db.select({ value: count() }).from(messages);
    
    // Count consent separately with WHERE clauses
    const [privacyCount] = await db.select({ value: count() })
      .from(users)
      .where(eq(users.privacyAccepted, true));
    const [aiMessageCount] = await db.select({ value: count() })
      .from(users)
      .where(eq(users.aiMessageConsent, true));
    const [aiCallCount] = await db.select({ value: count() })
      .from(users)
      .where(eq(users.aiCallConsent, true));
    
    const consentStats = {
      privacyAccepted: Number(privacyCount?.value || 0),
      aiMessageConsent: Number(aiMessageCount?.value || 0),
      aiCallConsent: Number(aiCallCount?.value || 0),
    };
    
    // Only select needed columns for recent signups
    const recentSignups = await db.select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      createdAt: users.createdAt,
      privacyAccepted: users.privacyAccepted,
      aiMessageConsent: users.aiMessageConsent,
      aiCallConsent: users.aiCallConsent,
    }).from(users)
      .orderBy(desc(users.createdAt))
      .limit(10);
    
    return {
      totalUsers: Number(userCount?.value || 0),
      totalPartnerships: Number(partnershipCount?.value || 0),
      totalMessages: Number(messageCount?.value || 0),
      consentStats,
      recentSignups,
    };
  }
  
  // Parenting tips operations
  async getParentingTips(childAgeMonths?: number, category?: string): Promise<ParentingTip[]> {
    const conditions = [];
    
    // Filter by child age if provided
    if (childAgeMonths !== undefined) {
      conditions.push(
        and(
          sql`CAST(${parentingTips.ageMinMonths} AS INTEGER) <= ${childAgeMonths}`,
          sql`CAST(${parentingTips.ageMaxMonths} AS INTEGER) >= ${childAgeMonths}`
        )
      );
    }
    
    // Filter by category if provided
    if (category) {
      conditions.push(eq(parentingTips.category, category));
    }
    
    // Build and execute query
    if (conditions.length > 0) {
      const tips = await db.select().from(parentingTips)
        .where(and(...conditions))
        .orderBy(desc(parentingTips.publishedAt));
      return tips;
    } else {
      const tips = await db.select().from(parentingTips)
        .orderBy(desc(parentingTips.publishedAt));
      return tips;
    }
  }
  
  async getParentingTip(id: string): Promise<ParentingTip | undefined> {
    const [tip] = await db.select().from(parentingTips).where(eq(parentingTips.id, id));
    return tip;
  }
  
  async createParentingTip(tip: InsertParentingTip): Promise<ParentingTip> {
    const [newTip] = await db.insert(parentingTips).values(tip).returning();
    return newTip;
  }
  
  // Weather activities operations
  async getWeatherActivities(childAgeMonths?: number, weatherCondition?: string): Promise<WeatherActivity[]> {
    const conditions = [];
    
    if (childAgeMonths !== undefined) {
      conditions.push(
        and(
          sql`CAST(${weatherActivities.ageMinMonths} AS INTEGER) <= ${childAgeMonths}`,
          sql`CAST(${weatherActivities.ageMaxMonths} AS INTEGER) >= ${childAgeMonths}`
        )
      );
    }
    
    if (weatherCondition) {
      conditions.push(sql`${weatherCondition} = ANY(${weatherActivities.weatherConditions})`);
    }
    
    if (conditions.length > 0) {
      const activities = await db.select().from(weatherActivities)
        .where(and(...conditions))
        .orderBy(weatherActivities.title);
      return activities;
    } else {
      const activities = await db.select().from(weatherActivities)
        .orderBy(weatherActivities.title);
      return activities;
    }
  }
  
  async createWeatherActivity(activity: InsertWeatherActivity): Promise<WeatherActivity> {
    const [newActivity] = await db.insert(weatherActivities).values(activity).returning();
    return newActivity;
  }
  
  // Storybooks operations
  async getStorybooks(partnershipId: string): Promise<Storybook[]> {
    const books = await db.select().from(storybooks)
      .where(eq(storybooks.partnershipId, partnershipId))
      .orderBy(desc(storybooks.updatedAt));
    return books;
  }
  
  async getStorybook(id: string): Promise<Storybook | undefined> {
    const [book] = await db.select().from(storybooks).where(eq(storybooks.id, id));
    return book;
  }
  
  async createStorybook(book: InsertStorybook): Promise<Storybook> {
    const [newBook] = await db.insert(storybooks).values(book).returning();
    return newBook;
  }
  
  async updateStorybook(id: string, updates: Partial<Storybook>): Promise<Storybook> {
    const [updated] = await db.update(storybooks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(storybooks.id, id))
      .returning();
    return updated;
  }
  
  async deleteStorybook(id: string): Promise<void> {
    await db.delete(storybooks).where(eq(storybooks.id, id));
  }
  
  async getStoryPages(storyId: string): Promise<StoryPage[]> {
    const pages = await db.select().from(storyPages)
      .where(eq(storyPages.storyId, storyId))
      .orderBy(storyPages.pageNumber);
    return pages;
  }
  
  async createStoryPage(page: InsertStoryPage): Promise<StoryPage> {
    const [newPage] = await db.insert(storyPages).values(page).returning();
    return newPage;
  }
  
  async updateStoryPage(id: string, updates: Partial<StoryPage>): Promise<StoryPage> {
    const [updated] = await db.update(storyPages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(storyPages.id, id))
      .returning();
    return updated;
  }
  
  async deleteStoryPage(id: string): Promise<void> {
    await db.delete(storyPages).where(eq(storyPages.id, id));
  }
  
  // Shopping lists operations
  async getShoppingLists(partnershipId: string): Promise<ShoppingList[]> {
    const lists = await db.select().from(shoppingLists)
      .where(eq(shoppingLists.partnershipId, partnershipId))
      .orderBy(desc(shoppingLists.updatedAt));
    return lists;
  }
  
  async getShoppingList(id: string): Promise<ShoppingList | undefined> {
    const [list] = await db.select().from(shoppingLists).where(eq(shoppingLists.id, id));
    return list;
  }
  
  async createShoppingList(list: InsertShoppingList): Promise<ShoppingList> {
    const [newList] = await db.insert(shoppingLists).values(list).returning();
    return newList;
  }
  
  async updateShoppingList(id: string, updates: Partial<ShoppingList>): Promise<ShoppingList> {
    const [updated] = await db.update(shoppingLists)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shoppingLists.id, id))
      .returning();
    return updated;
  }
  
  async deleteShoppingList(id: string): Promise<void> {
    await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
  }
  
  async getShoppingItems(listId: string): Promise<ShoppingItem[]> {
    const items = await db.select().from(shoppingItems)
      .where(eq(shoppingItems.listId, listId))
      .orderBy(shoppingItems.createdAt);
    return items;
  }
  
  async createShoppingItem(item: InsertShoppingItem): Promise<ShoppingItem> {
    const [newItem] = await db.insert(shoppingItems).values(item).returning();
    return newItem;
  }
  
  async updateShoppingItem(id: string, updates: Partial<ShoppingItem>): Promise<ShoppingItem> {
    const [updated] = await db.update(shoppingItems)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(shoppingItems.id, id))
      .returning();
    return updated;
  }
  
  async deleteShoppingItem(id: string): Promise<void> {
    await db.delete(shoppingItems).where(eq(shoppingItems.id, id));
  }

  // Beta feedback operations
  async createFeedback(feedbackData: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedback).values(feedbackData).returning();
    return newFeedback;
  }

  async getAllFeedback(): Promise<Feedback[]> {
    const allFeedback = await db.select().from(feedback)
      .orderBy(desc(feedback.createdAt));
    return allFeedback;
  }

  async getFeedbackByStatus(status: string): Promise<Feedback[]> {
    const feedbackList = await db.select().from(feedback)
      .where(eq(feedback.status, status))
      .orderBy(desc(feedback.createdAt));
    return feedbackList;
  }

  async updateFeedbackStatus(id: string, status: string, adminNotes?: string): Promise<Feedback> {
    const updates: any = { status };
    if (adminNotes !== undefined) {
      updates.adminNotes = adminNotes;
    }
    if (status === 'resolved') {
      updates.resolvedAt = new Date();
    }
    
    const [updated] = await db.update(feedback)
      .set(updates)
      .where(eq(feedback.id, id))
      .returning();
    return updated;
  }
  
  // Gamification operations
  // User stats
  async getUserStats(userId: string, partnershipId?: string): Promise<UserStats | undefined> {
    const conditions = partnershipId 
      ? and(eq(userStats.userId, userId), eq(userStats.partnershipId, partnershipId))
      : eq(userStats.userId, userId);
    const [stats] = await db.select().from(userStats).where(conditions);
    return stats;
  }
  
  async upsertUserStats(stats: InsertUserStats): Promise<UserStats> {
    // Build update object with only provided fields
    const updateFields: Record<string, any> = { updatedAt: new Date() };
    
    // Only include fields that are explicitly provided (not undefined)
    if (stats.totalMessagesSent !== undefined) updateFields.totalMessagesSent = stats.totalMessagesSent;
    if (stats.positiveMessagesSent !== undefined) updateFields.positiveMessagesSent = stats.positiveMessagesSent;
    if (stats.calendarEventsCreated !== undefined) updateFields.calendarEventsCreated = stats.calendarEventsCreated;
    if (stats.tasksCompleted !== undefined) updateFields.tasksCompleted = stats.tasksCompleted;
    if (stats.expensesLogged !== undefined) updateFields.expensesLogged = stats.expensesLogged;
    if (stats.conchSessionsCompleted !== undefined) updateFields.conchSessionsCompleted = stats.conchSessionsCompleted;
    if (stats.lastActivityDate !== undefined) updateFields.lastActivityDate = stats.lastActivityDate;
    
    const [result] = await db.insert(userStats)
      .values(stats)
      .onConflictDoUpdate({
        target: [userStats.userId, userStats.partnershipId],
        set: updateFields,
      })
      .returning();
    
    return result;
  }
  
  async incrementUserStat(userId: string, statName: string, amount: number = 1, partnershipId?: string): Promise<void> {
    // Validate statName to prevent SQL errors from typos
    const validStats = [
      'totalMessagesSent',
      'positiveMessagesSent',
      'calendarEventsCreated',
      'tasksCompleted',
      'expensesLogged',
      'conchSessionsCompleted',
    ];
    
    if (!validStats.includes(statName)) {
      throw new Error(`Invalid stat name: ${statName}. Must be one of: ${validStats.join(', ')}`);
    }
    
    // Use atomic increment with onConflictDoUpdate
    const baseStats: InsertUserStats = {
      userId,
      partnershipId,
      totalMessagesSent: 0,
      positiveMessagesSent: 0,
      calendarEventsCreated: 0,
      tasksCompleted: 0,
      expensesLogged: 0,
      conchSessionsCompleted: 0,
      lastActivityDate: new Date(),
    };
    
    // Set the specific stat to increment
    (baseStats as any)[statName] = amount;
    
    await db.insert(userStats)
      .values(baseStats)
      .onConflictDoUpdate({
        target: [userStats.userId, userStats.partnershipId],
        set: {
          [statName]: sql`${sql.raw(statName)} + ${amount}`,
          lastActivityDate: new Date(),
          updatedAt: new Date(),
        },
      });
  }
  
  // Streaks
  async getStreaks(userId: string, partnershipId?: string): Promise<Streak[]> {
    const conditions = partnershipId
      ? and(eq(streaks.userId, userId), eq(streaks.partnershipId, partnershipId))
      : eq(streaks.userId, userId);
    return await db.select().from(streaks).where(conditions);
  }
  
  async getStreak(userId: string, streakType: string, partnershipId?: string): Promise<Streak | undefined> {
    const conditions = partnershipId
      ? and(
          eq(streaks.userId, userId),
          eq(streaks.streakType, streakType),
          eq(streaks.partnershipId, partnershipId)
        )
      : and(eq(streaks.userId, userId), eq(streaks.streakType, streakType));
    const [streak] = await db.select().from(streaks).where(conditions);
    return streak;
  }
  
  async createStreak(streak: InsertStreak): Promise<Streak> {
    const [newStreak] = await db.insert(streaks).values(streak).returning();
    return newStreak;
  }
  
  async updateStreak(id: string, updates: Partial<Streak>): Promise<Streak> {
    const [updated] = await db.update(streaks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(streaks.id, id))
      .returning();
    return updated;
  }
  
  async incrementStreak(userId: string, streakType: string, partnershipId?: string): Promise<void> {
    const existing = await this.getStreak(userId, streakType, partnershipId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (existing) {
      const lastActivity = new Date(existing.lastActivityDate);
      lastActivity.setHours(0, 0, 0, 0);
      const daysSince = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSince === 0) {
        // Activity already logged today, no increment
        return;
      } else if (daysSince === 1) {
        // Consecutive day, increment streak
        const newStreak = existing.currentStreak + 1;
        await this.updateStreak(existing.id, {
          currentStreak: newStreak,
          longestStreak: Math.max(newStreak, existing.longestStreak),
          lastActivityDate: new Date(),
          isActive: true,
        });
      } else {
        // Streak broken, restart
        await this.updateStreak(existing.id, {
          currentStreak: 1,
          lastActivityDate: new Date(),
          streakStartDate: new Date(),
          isActive: true,
        });
      }
    } else {
      // Create new streak
      await this.createStreak({
        userId,
        partnershipId,
        streakType,
        currentStreak: 1,
        longestStreak: 1,
        lastActivityDate: new Date(),
        streakStartDate: new Date(),
        isActive: true,
      });
    }
  }
  
  async breakStreak(userId: string, streakType: string, partnershipId?: string): Promise<void> {
    const existing = await this.getStreak(userId, streakType, partnershipId);
    if (existing) {
      await this.updateStreak(existing.id, {
        isActive: false,
        currentStreak: 0,
      });
    }
  }
  
  // Achievements
  async getAchievements(): Promise<Achievement[]> {
    return await db.select().from(achievements);
  }
  
  async getAchievement(id: string): Promise<Achievement | undefined> {
    const [achievement] = await db.select().from(achievements).where(eq(achievements.id, id));
    return achievement;
  }
  
  async getAchievementByCode(code: string): Promise<Achievement | undefined> {
    const [achievement] = await db.select().from(achievements).where(eq(achievements.code, code));
    return achievement;
  }
  
  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const [newAchievement] = await db.insert(achievements).values(achievement).returning();
    return newAchievement;
  }
  
  // User achievements
  async getUserAchievements(userId: string, partnershipId?: string): Promise<any[]> {
    const conditions = partnershipId
      ? and(eq(userAchievements.userId, userId), eq(userAchievements.partnershipId, partnershipId))
      : eq(userAchievements.userId, userId);
    
    const results = await db.select({
      id: userAchievements.id,
      earnedAt: userAchievements.earnedAt,
      achievement: achievements,
    })
    .from(userAchievements)
    .innerJoin(achievements, eq(userAchievements.achievementId, achievements.id))
    .where(conditions)
    .orderBy(desc(userAchievements.earnedAt));
    
    return results;
  }
  
  async hasAchievement(userId: string, achievementCode: string, partnershipId?: string): Promise<boolean> {
    const achievement = await db.select().from(achievements)
      .where(eq(achievements.code, achievementCode))
      .limit(1);
    
    if (!achievement.length) return false;
    
    const conditions = partnershipId
      ? and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievement[0].id),
          eq(userAchievements.partnershipId, partnershipId)
        )
      : and(
          eq(userAchievements.userId, userId),
          eq(userAchievements.achievementId, achievement[0].id)
        );
    
    const existing = await db.select().from(userAchievements).where(conditions).limit(1);
    return existing.length > 0;
  }
  
  async awardAchievement(userId: string, achievementCode: string, partnershipId?: string): Promise<UserAchievement | null> {
    // Check if user already has this achievement
    const hasIt = await this.hasAchievement(userId, achievementCode, partnershipId);
    if (hasIt) return null;
    
    // Get achievement
    const [achievement] = await db.select().from(achievements)
      .where(eq(achievements.code, achievementCode))
      .limit(1);
    
    if (!achievement) return null;
    
    // Award achievement
    const [awarded] = await db.insert(userAchievements).values({
      userId,
      achievementId: achievement.id,
      partnershipId,
    }).returning();
    
    return awarded;
  }
  
  async checkAndAwardAchievements(userId: string, partnershipId?: string): Promise<UserAchievement[]> {
    const awarded: UserAchievement[] = [];
    const stats = await this.getUserStats(userId, partnershipId);
    
    if (!stats) return awarded;
    
    // Check message achievements
    if (stats.totalMessagesSent >= 1) {
      const result = await this.awardAchievement(userId, 'first_message', partnershipId);
      if (result) awarded.push(result);
    }
    if (stats.totalMessagesSent >= 10) {
      const result = await this.awardAchievement(userId, 'messages_10', partnershipId);
      if (result) awarded.push(result);
    }
    if (stats.totalMessagesSent >= 50) {
      const result = await this.awardAchievement(userId, 'messages_50', partnershipId);
      if (result) awarded.push(result);
    }
    if (stats.totalMessagesSent >= 100) {
      const result = await this.awardAchievement(userId, 'messages_100', partnershipId);
      if (result) awarded.push(result);
    }
    
    // Check positivity achievements
    if (stats.positiveMessagesSent >= 10) {
      const result = await this.awardAchievement(userId, 'positive_10', partnershipId);
      if (result) awarded.push(result);
    }
    if (stats.positiveMessagesSent >= 25) {
      const result = await this.awardAchievement(userId, 'positive_25', partnershipId);
      if (result) awarded.push(result);
    }
    if (stats.positiveMessagesSent >= 50) {
      const result = await this.awardAchievement(userId, 'positive_50', partnershipId);
      if (result) awarded.push(result);
    }
    
    // Check collaboration achievements
    if (stats.calendarEventsCreated >= 5) {
      const result = await this.awardAchievement(userId, 'calendar_5', partnershipId);
      if (result) awarded.push(result);
    }
    if (stats.tasksCompleted >= 5) {
      const result = await this.awardAchievement(userId, 'tasks_5', partnershipId);
      if (result) awarded.push(result);
    }
    if (stats.tasksCompleted >= 20) {
      const result = await this.awardAchievement(userId, 'tasks_20', partnershipId);
      if (result) awarded.push(result);
    }
    if (stats.expensesLogged >= 10) {
      const result = await this.awardAchievement(userId, 'expenses_10', partnershipId);
      if (result) awarded.push(result);
    }
    if (stats.conchSessionsCompleted >= 1) {
      const result = await this.awardAchievement(userId, 'conch_first', partnershipId);
      if (result) awarded.push(result);
    }
    if (stats.conchSessionsCompleted >= 5) {
      const result = await this.awardAchievement(userId, 'conch_5', partnershipId);
      if (result) awarded.push(result);
    }
    
    // Check streak achievements
    const userStreaks = await this.getStreaks(userId, partnershipId);
    for (const streak of userStreaks) {
      if (streak.streakType === 'communication') {
        if (streak.currentStreak >= 3) {
          const result = await this.awardAchievement(userId, 'streak_3', partnershipId);
          if (result) awarded.push(result);
        }
        if (streak.currentStreak >= 7) {
          const result = await this.awardAchievement(userId, 'streak_7', partnershipId);
          if (result) awarded.push(result);
        }
        if (streak.currentStreak >= 14) {
          const result = await this.awardAchievement(userId, 'streak_14', partnershipId);
          if (result) awarded.push(result);
        }
        if (streak.currentStreak >= 30) {
          const result = await this.awardAchievement(userId, 'streak_30', partnershipId);
          if (result) awarded.push(result);
        }
      } else if (streak.streakType === 'positive_tone' && streak.currentStreak >= 7) {
        const result = await this.awardAchievement(userId, 'positive_streak_7', partnershipId);
        if (result) awarded.push(result);
      }
    }
    
    return awarded;
  }

  // Safety Plan operations (with encryption)
  async getSafetyPlan(userId: string): Promise<SafetyPlanData | undefined> {
    const [plan] = await db
      .select()
      .from(safetyPlans)
      .where(eq(safetyPlans.userId, userId));
    
    if (!plan || !plan.encryptedData) {
      return undefined;
    }

    try {
      const encryption = getEncryptionService();
      const decryptedData = encryption.decrypt(plan.encryptedData, userId);
      return decryptedData as SafetyPlanData;
    } catch (error) {
      console.error('[Storage] Failed to decrypt safety plan:', error);
      throw new Error('Failed to decrypt safety plan data');
    }
  }

  async createSafetyPlan(userId: string, planData: SafetyPlanData): Promise<SafetyPlanData> {
    try {
      const encryption = getEncryptionService();
      const encryptedData = encryption.encrypt(planData, userId);

      const [newPlan] = await db
        .insert(safetyPlans)
        .values({
          userId,
          encryptedData,
        })
        .returning();

      return planData;
    } catch (error) {
      console.error('[Storage] Failed to create encrypted safety plan:', error);
      throw new Error('Failed to create safety plan');
    }
  }

  async updateSafetyPlan(userId: string, planData: SafetyPlanData): Promise<SafetyPlanData> {
    try {
      const encryption = getEncryptionService();
      const encryptedData = encryption.encrypt(planData, userId);

      const [updatedPlan] = await db
        .update(safetyPlans)
        .set({ encryptedData, updatedAt: new Date() })
        .where(eq(safetyPlans.userId, userId))
        .returning();

      if (!updatedPlan) {
        throw new Error('Safety plan not found');
      }

      return planData;
    } catch (error) {
      console.error('[Storage] Failed to update encrypted safety plan:', error);
      throw new Error('Failed to update safety plan');
    }
  }

  async deleteSafetyPlan(userId: string): Promise<void> {
    await db.delete(safetyPlans).where(eq(safetyPlans.userId, userId));
  }

  // Rogerian Active Listening operations
  async createMessageSummary(summary: InsertMessageSummary): Promise<MessageSummary> {
    const [created] = await db.insert(messageSummaries).values(summary).returning();
    return created;
  }

  async getMessageSummary(id: string): Promise<MessageSummary | undefined> {
    const [summary] = await db.select().from(messageSummaries).where(eq(messageSummaries.id, id));
    return summary;
  }

  async getMessageSummariesByUser(userId: string, limit: number = 50): Promise<MessageSummary[]> {
    return await db
      .select()
      .from(messageSummaries)
      .where(eq(messageSummaries.createdBy, userId))
      .orderBy(desc(messageSummaries.createdAt))
      .limit(limit);
  }

  async getMessageSummariesByPartnership(partnershipId: string, limit: number = 50): Promise<MessageSummary[]> {
    return await db
      .select()
      .from(messageSummaries)
      .where(eq(messageSummaries.partnershipId, partnershipId))
      .orderBy(desc(messageSummaries.createdAt))
      .limit(limit);
  }

  async getListeningSettings(userId: string): Promise<ListeningSettings | undefined> {
    const [settings] = await db.select().from(listeningSettings).where(eq(listeningSettings.userId, userId));
    return settings;
  }

  async upsertListeningSettings(settings: InsertListeningSettings): Promise<ListeningSettings> {
    const [result] = await db
      .insert(listeningSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: listeningSettings.userId,
        set: {
          enableConchModeSummary: settings.enableConchModeSummary,
          enableChatUnderstandingCheck: settings.enableChatUnderstandingCheck,
          emotionalMessageThreshold: settings.emotionalMessageThreshold,
          showUnderstandingStreak: settings.showUnderstandingStreak,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  // ============================================
  // AGENT MEMORY SYSTEM OPERATIONS
  // ============================================

  async createRelationshipMemory(memory: InsertRelationshipMemory): Promise<RelationshipMemory> {
    const [created] = await db.insert(relationshipMemories).values(memory).returning();
    return created;
  }

  async getRelationshipMemories(partnershipId: string): Promise<RelationshipMemory[]> {
    return await db
      .select()
      .from(relationshipMemories)
      .where(eq(relationshipMemories.partnershipId, partnershipId))
      .orderBy(desc(relationshipMemories.occurredAt));
  }

  async getRelationshipMemoriesByPattern(
    partnershipId: string,
    options: {
      dayOfWeek?: number;
      timeOfDay?: string;
      weekOfYear?: number;
      memoryType?: string;
      minConflictScore?: number;
    }
  ): Promise<RelationshipMemory[]> {
    const conditions = [eq(relationshipMemories.partnershipId, partnershipId)];
    
    if (options.dayOfWeek !== undefined) {
      conditions.push(eq(relationshipMemories.dayOfWeek, options.dayOfWeek));
    }
    if (options.timeOfDay) {
      conditions.push(eq(relationshipMemories.timeOfDay, options.timeOfDay));
    }
    if (options.weekOfYear !== undefined) {
      conditions.push(eq(relationshipMemories.weekOfYear, options.weekOfYear));
    }
    if (options.memoryType) {
      conditions.push(eq(relationshipMemories.memoryType, options.memoryType));
    }
    
    let results = await db
      .select()
      .from(relationshipMemories)
      .where(and(...conditions))
      .orderBy(desc(relationshipMemories.occurredAt));
    
    if (options.minConflictScore !== undefined) {
      results = results.filter(m => (m.conflictScore || 0) >= options.minConflictScore!);
    }
    
    return results;
  }

  async updateRelationshipMemoryRetrieval(memoryId: string): Promise<void> {
    await db
      .update(relationshipMemories)
      .set({
        lastRetrievedAt: new Date(),
        retrievalCount: sql`${relationshipMemories.retrievalCount} + 1`,
      })
      .where(eq(relationshipMemories.id, memoryId));
  }

  async deleteRelationshipMemory(memoryId: string): Promise<void> {
    await db.delete(relationshipMemories).where(eq(relationshipMemories.id, memoryId));
  }

  // Agent Intervention operations
  async createAgentIntervention(intervention: InsertAgentIntervention): Promise<AgentIntervention> {
    const [created] = await db.insert(agentInterventions).values(intervention).returning();
    return created;
  }

  async getAgentInterventions(partnershipId: string, limit: number = 50): Promise<AgentIntervention[]> {
    return await db
      .select()
      .from(agentInterventions)
      .where(eq(agentInterventions.partnershipId, partnershipId))
      .orderBy(desc(agentInterventions.createdAt))
      .limit(limit);
  }

  async updateAgentIntervention(id: string, updates: Partial<AgentIntervention>): Promise<AgentIntervention> {
    const [updated] = await db
      .update(agentInterventions)
      .set(updates)
      .where(eq(agentInterventions.id, id))
      .returning();
    return updated;
  }

  // Conflict Pattern operations
  async createConflictPattern(pattern: InsertConflictPattern): Promise<ConflictPattern> {
    const [created] = await db.insert(conflictPatterns).values(pattern).returning();
    return created;
  }

  async getConflictPatterns(partnershipId: string): Promise<ConflictPattern[]> {
    return await db
      .select()
      .from(conflictPatterns)
      .where(eq(conflictPatterns.partnershipId, partnershipId))
      .orderBy(desc(conflictPatterns.occurrenceCount));
  }

  async updateConflictPattern(id: string, updates: Partial<ConflictPattern>): Promise<ConflictPattern> {
    const [updated] = await db
      .update(conflictPatterns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conflictPatterns.id, id))
      .returning();
    return updated;
  }

  // Prep Chat operations
  async createPrepChatSession(session: InsertPrepChatSession): Promise<PrepChatSession> {
    const [created] = await db.insert(prepChatSessions).values(session).returning();
    return created;
  }

  async getPrepChatSession(sessionId: string): Promise<PrepChatSession | undefined> {
    const [session] = await db
      .select()
      .from(prepChatSessions)
      .where(eq(prepChatSessions.id, sessionId));
    return session;
  }

  async getPrepChatSessions(userId: string, limit: number = 20): Promise<PrepChatSession[]> {
    return await db
      .select()
      .from(prepChatSessions)
      .where(eq(prepChatSessions.userId, userId))
      .orderBy(desc(prepChatSessions.createdAt))
      .limit(limit);
  }

  async updatePrepChatSession(sessionId: string, updates: Partial<PrepChatSession>): Promise<PrepChatSession> {
    const [updated] = await db
      .update(prepChatSessions)
      .set(updates)
      .where(eq(prepChatSessions.id, sessionId))
      .returning();
    return updated;
  }

  // Agent Settings operations
  async getAgentSettings(userId: string): Promise<AgentSettings | undefined> {
    const [settings] = await db
      .select()
      .from(agentSettings)
      .where(eq(agentSettings.userId, userId));
    return settings;
  }

  async upsertAgentSettings(settings: InsertAgentSettings): Promise<AgentSettings> {
    const [result] = await db
      .insert(agentSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: agentSettings.userId,
        set: {
          enableProactiveNudges: settings.enableProactiveNudges,
          enablePredictiveAlerts: settings.enablePredictiveAlerts,
          enableDailySummary: settings.enableDailySummary,
          enableWeeklyReport: settings.enableWeeklyReport,
          enablePrepChatSuggestions: settings.enablePrepChatSuggestions,
          conflictAlertThreshold: settings.conflictAlertThreshold,
          nudgeFrequency: settings.nudgeFrequency,
          preferredChannel: settings.preferredChannel,
          quietHoursStart: settings.quietHoursStart,
          quietHoursEnd: settings.quietHoursEnd,
          dailySummaryTime: settings.dailySummaryTime,
          weeklyReportDay: settings.weeklyReportDay,
          allowPatternLearning: settings.allowPatternLearning,
          dataRetentionMonths: settings.dataRetentionMonths,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
