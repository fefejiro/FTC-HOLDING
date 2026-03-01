import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import { pool } from "./db";

export function getSession() {
  const sessionTtl = 14 * 24 * 60 * 60 * 1000; // 14 days
  const pgStore = connectPg(session);
  
  // Create session store with error handling
  const sessionStore = new pgStore({
    pool: pool, // Use the existing pool from db.ts with retry logic
    createTableIfMissing: true, // Auto-create sessions table in production
    ttl: sessionTtl,
    tableName: "sessions",
    errorLog: (error) => {
      // Log session store errors without crashing the app
      if (error.message?.includes('disabled') || error.message?.includes('suspended')) {
        console.warn('[Session Store] Database suspended - sessions may not persist until database wakes');
      } else {
        console.error('[Session Store] Error:', error.message);
      }
    },
  });
  
  // Handle connection errors without blocking app startup
  sessionStore.on?.('error', (error) => {
    console.error('[Session Store] Store error:', error.message);
  });
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: true,
    name: 'peacepad.sid',
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: sessionTtl,
      path: '/',
    },
  });
}

// Helper to create demo partnership with sample messages for guests and new authenticated users
export async function createDemoPartnership(userId: string, userType: 'guest' | 'authenticated' = 'guest') {
  try {
    // Create a demo "co-parent" user
    const { user: demoParent } = await storage.upsertUser({
      displayName: "Demo Co-Parent",
      isGuest: true,
      guestId: `demo_${nanoid(4)}`,
    });

    // Create demo partnership
    const partnership = await storage.createPartnership({
      user1Id: userId,
      user2Id: demoParent.id,
      inviteCode: await storage.generateInviteCode(),
    });

    // Create demo conversation
    const conversation = await storage.createConversation({
      type: 'direct',
      createdBy: userId,
    });

    // Add both users to conversation
    await storage.addConversationMember({
      conversationId: conversation.id,
      userId: userId,
    });
    await storage.addConversationMember({
      conversationId: conversation.id,
      userId: demoParent.id,
    });

    // Seed demo messages showing tone analysis spectrum and new chat UI
    const DEMO_MESSAGES = [
      { content: "Hi there! How's everything going?", tone: "cooperative", senderId: 1 },
      { content: "Doing well, thanks for asking! Ready to coordinate this week.", tone: "cooperative", senderId: 2 },
      { content: "Can we discuss the pickup time for this weekend?", tone: "neutral", senderId: 1 },
      { content: "Sure! I'm thinking Saturday at 2 PM works best. Does that work for you?", tone: "neutral", senderId: 2 },
      { content: "That's perfect! I really appreciate your flexibility with scheduling.", tone: "calm", senderId: 1 },
      { content: "Of course - the kids' needs come first. Let me know if anything changes.", tone: "calm", senderId: 2 },
    ];

    for (const msg of DEMO_MESSAGES) {
      const senderId = msg.senderId === 1 ? userId : demoParent.id;
      await storage.createMessage({
        conversationId: conversation.id,
        content: msg.content,
        senderId,
        tone: msg.tone,
      });
    }

    // Create demo events for calendar with different types
    const now = new Date();
    const demoEvents = [
      {
        title: "Sarah's Birthday",
        type: "birthday",
        startDate: new Date(now.getFullYear(), now.getMonth(), 15),
        createdBy: userId,
      },
      {
        title: "School Pickup",
        type: "custody",
        startDate: new Date(now.getFullYear(), now.getMonth(), 10, 15, 0),
        createdBy: demoParent.id,
      },
      {
        title: "Doctor Appointment",
        type: "shared_event",
        startDate: new Date(now.getFullYear(), now.getMonth(), 20, 14, 0),
        createdBy: userId,
      },
    ];

    for (const event of demoEvents) {
      await storage.createEvent(event);
    }

    // Set demo partnership as active
    await storage.upsertUser({
      id: userId,
      activePartnershipId: partnership.id,
    });

    console.log(`[${userType === 'authenticated' ? 'Auth' : 'Guest'}] Created demo partnership ${partnership.id} for user ${userId}`);
  } catch (error) {
    console.error("[Demo Partnership] Failed to create:", error);
    // Don't throw - user should still work even without demo setup
  }
}

export async function setupSoftAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Guest entry endpoint
  app.post("/api/auth/guest", async (req: any, res) => {
    try {
      const { displayName, profileImageUrl, sessionId: clientSessionId, hasAcceptedConsent } = req.body;

      // Check if session already exists
      if (clientSessionId) {
        const existingSession = await storage.getGuestSession(clientSessionId);
        if (existingSession && new Date(existingSession.expiresAt) > new Date()) {
          await storage.updateGuestSessionActivity(clientSessionId);
          const user = await storage.getUser(existingSession.userId);
          req.session.userId = existingSession.userId;
          req.session.sessionId = clientSessionId;
          return res.json({
            success: true,
            user,
            sessionId: clientSessionId,
            message: `Welcome back, ${user?.displayName || 'Guest'}!`,
          });
        }
      }

      // Create new guest user and session
      const guestId = nanoid(6);
      const sessionId = clientSessionId || nanoid(16);
      const finalDisplayName = displayName || `Guest${guestId}`;

      console.log(`[Auth] Creating new guest user: ${finalDisplayName}`);
      const { user } = await storage.upsertUser({
        displayName: finalDisplayName,
        isGuest: true,
        guestId,
        profileImageUrl: profileImageUrl || undefined,
        // If user already accepted consent during onboarding, mark terms as accepted
        termsAcceptedAt: hasAcceptedConsent ? new Date() : undefined,
      });
      console.log(`[Auth] User created with ID: ${user.id}, Invite Code: ${user.inviteCode}, Terms accepted: ${hasAcceptedConsent}`);

      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      await storage.createGuestSession({
        sessionId,
        userId: user.id,
        displayName: finalDisplayName,
        lastActive: new Date(),
        expiresAt,
      });

      await storage.createUsageMetric({
        sessionId,
        userId: user.id,
        messagesSent: "0",
        toneAnalyzed: "0",
        therapistSearches: "0",
        callActivity: "0",
      });

      req.session.userId = user.id;
      req.session.sessionId = sessionId;

      // Create demo partnership for guest so they can see sample messages with tone analysis
      createDemoPartnership(user.id, 'guest').catch(err => console.error("[Guest] Demo setup failed:", err));

      res.json({
        success: true,
        user,
        sessionId,
        message: `Welcome, ${finalDisplayName}!`,
      });
    } catch (error: any) {
      console.error("Guest auth error:", error);
      res.status(500).json({ message: "Failed to authenticate", error: error.message });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", async (req: any, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      let user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Ensure user has an invite code (for legacy users with null or empty codes)
      if (!user.inviteCode || user.inviteCode.trim() === '') {
        const newCode = await storage.generateInviteCode();
        const result = await storage.upsertUser({
          ...user,
          inviteCode: newCode,
        });
        user = result.user;
      }

      res.json({ user, sessionId: req.session.sessionId });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        console.error("Session destroy error:", err);
      }
      const isProduction = process.env.NODE_ENV === "production";
      // Clear all possible session cookies explicitly
      const cookieOptions = {
        path: "/",
        httpOnly: true,
        secure: isProduction,
        sameSite: (isProduction ? "none" : "lax") as const,
      };
      res.clearCookie("connect.sid", cookieOptions);
      res.clearCookie("peacepad.sid", cookieOptions);
      res.json({ success: true });
    });
  });
}

export const isSoftAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (!req.session.userId || !req.session.sessionId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const session = await storage.getGuestSession(req.session.sessionId);
    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ message: "Session expired" });
    }

    await storage.updateGuestSessionActivity(req.session.sessionId);
    req.user = { id: req.session.userId, sessionId: req.session.sessionId };
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

// Helper to get userId from either auth system
export function getUserId(req: any): string | null {
  // Check for Replit Auth first
  if (req.user?.claims?.sub) {
    return req.user.claims.sub;
  }
  // Check for guest auth
  if (req.user?.id) {
    return req.user.id;
  }
  // Fallback to session userId (for guest)
  if (req.session?.userId) {
    return req.session.userId;
  }
  return null;
}

// Combined middleware that accepts both Replit Auth and Guest Auth
export const isAuthenticatedEither: RequestHandler = async (req: any, res, next) => {
  // First, try Replit Auth
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.expires_at) {
    // User is authenticated via Replit Auth
    return next();
  }

  // If not Replit Auth, try Guest Auth
  if (req.session?.userId && req.session?.sessionId) {
    try {
      const session = await storage.getGuestSession(req.session.sessionId);
      if (session && new Date(session.expiresAt) > new Date()) {
        await storage.updateGuestSessionActivity(req.session.sessionId);
        req.user = { id: req.session.userId, sessionId: req.session.sessionId };
        return next();
      }
    } catch (error) {
      console.error("[Auth] Guest auth check failed:", error);
    }
  }

  // Neither auth method worked
  return res.status(401).json({ message: "Unauthorized" });
};

// Usage tracking helper
export async function trackUsage(sessionId: string, metric: string, increment: number = 1) {
  try {
    const existing = await storage.getUsageMetrics(sessionId);
    if (existing) {
      const currentValue = parseInt(existing[metric as keyof typeof existing] as string || "0");
      await storage.updateUsageMetric(sessionId, {
        [metric]: String(currentValue + increment),
      });
    }
  } catch (error) {
    console.error("Usage tracking error:", error);
  }
}
