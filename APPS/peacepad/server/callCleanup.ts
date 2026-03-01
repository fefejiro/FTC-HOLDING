import { storage } from "./storage";
import { notifyCallEnded } from "./webrtc-signaling";
import type { Call } from "../shared/schema";

const TIMEOUT_SECONDS = 60; // 60 seconds timeout for ringing calls
const CLEANUP_INTERVAL_MS = 60 * 1000; // Run every 60 seconds
const CLEANUP_INTERVAL_BUILD_MS = 5 * 60 * 1000; // Run every 5 minutes in build mode to reduce overhead
const isBuildMode = process.env.BUILD_MODE === 'true' || process.env.PLAY_STORE_BUILD === 'true';

/**
 * Automatic cleanup service for stuck calls
 * Handles cases where frontend timeout doesn't fire (browser closed, connection lost, etc.)
 */
export function startCallCleanup() {
  const interval = isBuildMode ? CLEANUP_INTERVAL_BUILD_MS : CLEANUP_INTERVAL_MS;
  const intervalText = isBuildMode ? "5 minutes (build mode)" : "60 seconds";
  console.log(`[Call Cleanup] Starting call cleanup service (runs every ${intervalText})`);
  
  let isRunning = false; // Execution guard to prevent overlapping runs
  
  setInterval(async () => {
    // Guard: Skip if previous cleanup is still running
    if (isRunning) {
      console.log("[Call Cleanup] Previous cleanup still running, skipping this interval");
      return;
    }
    
    isRunning = true;
    
    try {
      const now = new Date();
      
      // Query DB for stuck ringing calls (filter pushed down to DB for performance)
      let stuckCalls: Call[] = [];
      try {
        stuckCalls = await storage.getStuckRingingCalls(TIMEOUT_SECONDS);
      } catch (dbError) {
        // Gracefully handle missing optional calls table or columns
        if ((dbError as any)?.code === '42P01' || (dbError as any)?.code === '42703' || (dbError as any)?.message?.includes('session_id')) {
          return; // Table or column doesn't exist yet, skip cleanup
        }
        throw dbError; // Re-throw if it's a different error
      }
      
      if (stuckCalls.length === 0) {
        return; // No stuck calls to cleanup
      }
      
      console.log(`[Call Cleanup] Found ${stuckCalls.length} stuck ringing calls to cleanup`);
      
      for (const call of stuckCalls) {
        console.log(`[Call Cleanup] Marking call ${call.id} as missed - Reason: ringing for ${TIMEOUT_SECONDS}+ seconds (created: ${call.createdAt.toISOString()})`);
        
        try {
          // Mark call as missed
          await storage.updateCall(call.id, {
            status: 'missed',
            endedAt: now,
          });
          
          // Notify both parties via WebSocket
          notifyCallEnded(call.callerId, call.id, 'timeout');
          notifyCallEnded(call.receiverId, call.id, 'timeout');
          
          console.log(`[Call Cleanup] ✅ Successfully marked call ${call.id} as missed and notified parties`);
        } catch (error) {
          console.error(`[Call Cleanup] ❌ Failed to cleanup call ${call.id}:`, error);
        }
      }
    } catch (error) {
      console.error("[Call Cleanup] Error during cleanup cycle:", error);
    } finally {
      isRunning = false; // Release execution guard
    }
  }, interval);
}
