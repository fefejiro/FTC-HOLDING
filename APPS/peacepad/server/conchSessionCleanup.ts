import { storage } from "./storage";
import { broadcastConchSessionEnded, notifyCallEnded } from "./webrtc-signaling";

const TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds (extended for Play Store testing - prevent session timeout)
const CLEANUP_INTERVAL_MS = 60 * 1000; // Run every 60 seconds
const CLEANUP_INTERVAL_BUILD_MS = 5 * 60 * 1000; // Run every 5 minutes in build mode to reduce overhead
const isBuildMode = process.env.BUILD_MODE === 'true' || process.env.PLAY_STORE_BUILD === 'true';

export function startConchSessionCleanup() {
  const interval = isBuildMode ? CLEANUP_INTERVAL_BUILD_MS : CLEANUP_INTERVAL_MS;
  const intervalText = isBuildMode ? "5 minutes (build mode)" : "60 seconds";
  console.log(`[Conch Cleanup] Starting session cleanup service (runs every ${intervalText})`);
  
  setInterval(async () => {
    try {
      const now = new Date();
      const timeoutThreshold = new Date(now.getTime() - TIMEOUT_MS);
      
      // Get all non-ended sessions
      let sessions = [];
      try {
        sessions = await storage.getAllConchSessions();
      } catch (dbError) {
        // Gracefully handle missing optional conch_sessions table
        if ((dbError as any)?.code === '42P01' || (dbError as any)?.message?.includes('conch_sessions')) {
          return; // Table doesn't exist yet, skip cleanup
        }
        throw dbError; // Re-throw if it's a different error
      }
      
      if (sessions.length === 0) {
        return; // No sessions to check
      }
      
      if (isBuildMode) {
        console.log(`[Conch Cleanup] Build mode: Checking ${sessions.length} active/pending sessions for expiration`);
      }
      
      for (const session of sessions) {
        let shouldEnd = false;
        let reason = "";
        
        // Check 1: Pending sessions older than timeout threshold (2 hours for testing, production can adjust)
        if (session.status === 'pending' && session.createdAt) {
          if (session.createdAt < timeoutThreshold) {
            shouldEnd = true;
            reason = "pending session expired (2+ hours old)";
          }
        }
        
        // Check 2: Active sessions where turn timer expired 2+ hours ago
        if (session.status === 'active' && session.currentTurnEndsAt) {
          if (session.currentTurnEndsAt < timeoutThreshold) {
            shouldEnd = true;
            reason = "active session abandoned (turn expired 2+ hours ago)";
          }
        }
        
        // End the session if it meets cleanup criteria
        if (shouldEnd) {
          console.log(`[Conch Cleanup] Ending session ${session.id} - Reason: ${reason}`);
          
          try {
            // End the associated call if one exists (always, even if partnership unavailable)
            if (session.callId) {
              try {
                await storage.updateCall(session.callId, {
                  status: 'ended',
                  endedAt: new Date(),
                });
                console.log(`[Conch Cleanup] Ended associated call ${session.callId} for session ${session.id}`);
                
                // Notify both users via WebSocket if partnership is available
                const partnership = await storage.getPartnership(session.partnershipId);
                if (partnership) {
                  notifyCallEnded(partnership.user1Id, session.callId, 'auto-cleanup');
                  notifyCallEnded(partnership.user2Id, session.callId, 'auto-cleanup');
                } else {
                  console.warn(`[Conch Cleanup] Partnership ${session.partnershipId} not found - call ended but WebSocket notifications skipped`);
                }
              } catch (callError) {
                console.error(`[Conch Cleanup] Failed to end call ${session.callId}:`, callError);
                // Continue with session cleanup even if call update fails
              }
            }

            // End the session in storage
            await storage.endConchSession(session.id);
            
            // Broadcast to all clients in this partnership
            await broadcastConchSessionEnded(session.id, session.partnershipId);
            
            console.log(`[Conch Cleanup] ✅ Successfully cleaned up session ${session.id}`);
          } catch (error) {
            console.error(`[Conch Cleanup] ❌ Failed to end session ${session.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("[Conch Cleanup] Error during cleanup cycle:", error);
    }
  }, interval);
}
