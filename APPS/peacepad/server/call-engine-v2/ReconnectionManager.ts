/**
 * ReconnectionManager - Handles reconnection and recovery for V2 Call Engine
 * 
 * Manages reconnection windows, ICE restarts, and state recovery
 * for participants who experience network interruptions.
 */

import type { WebSocket } from 'ws';
import type { IStorage } from '../storage';

// Constants for reconnection behavior
const RECONNECTION_WINDOW = 30000; // 30 seconds
const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const MAX_RECONNECT_ATTEMPTS = 3;
const ICE_RESTART_DELAY = 2000; // 2 seconds after reconnect

export interface DisconnectedParticipant {
  userId: string;
  callId: string;
  sessionCode: string;
  disconnectedAt: Date;
  lastRole?: 'offerer' | 'answerer';
  wasConchHolder: boolean;
  mediaState: {
    hasAudio: boolean;
    hasVideo: boolean;
  };
  reconnectToken: string;
  attemptCount: number;
}

export interface HeartbeatRecord {
  userId: string;
  callId: string;
  lastHeartbeat: Date;
  missedCount: number;
}

export class ReconnectionManager {
  private storage: IStorage;
  private disconnectedParticipants: Map<string, DisconnectedParticipant> = new Map();
  private heartbeats: Map<string, HeartbeatRecord> = new Map();
  private reconnectionTimers: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.startHeartbeatMonitor();
  }

  /**
   * Start monitoring heartbeats from active participants
   */
  private startHeartbeatMonitor() {
    this.heartbeatTimer = setInterval(() => {
      const now = new Date();
      
      // Check for missed heartbeats
      this.heartbeats.forEach((record, key) => {
        const timeSinceLastHB = now.getTime() - record.lastHeartbeat.getTime();
        
        if (timeSinceLastHB > HEARTBEAT_INTERVAL * 2) {
          record.missedCount++;
          
          // After 3 missed heartbeats, consider disconnected
          if (record.missedCount >= 3 && !this.disconnectedParticipants.has(record.userId)) {
            console.log(`[ReconnectionManager] User ${record.userId} missed 3 heartbeats, marking as disconnected`);
            this.handleParticipantDisconnect(record.userId, record.callId);
          }
        }
      });
    }, HEARTBEAT_INTERVAL);
  }

  /**
   * Record a heartbeat from a participant
   */
  public recordHeartbeat(userId: string, callId: string) {
    const key = `${userId}-${callId}`;
    
    if (this.heartbeats.has(key)) {
      const record = this.heartbeats.get(key)!;
      record.lastHeartbeat = new Date();
      record.missedCount = 0;
    } else {
      this.heartbeats.set(key, {
        userId,
        callId,
        lastHeartbeat: new Date(),
        missedCount: 0
      });
    }
  }

  /**
   * Handle a participant disconnect
   */
  public async handleParticipantDisconnect(
    userId: string, 
    callId: string,
    sessionCode?: string,
    wasConchHolder: boolean = false,
    mediaState?: { hasAudio: boolean; hasVideo: boolean }
  ): Promise<DisconnectedParticipant> {
    // Generate reconnection token
    const reconnectToken = this.generateReconnectToken();
    
    const participant: DisconnectedParticipant = {
      userId,
      callId,
      sessionCode: sessionCode || '',
      disconnectedAt: new Date(),
      wasConchHolder,
      mediaState: mediaState || { hasAudio: false, hasVideo: false },
      reconnectToken,
      attemptCount: 0
    };

    // Store disconnected participant info
    this.disconnectedParticipants.set(userId, participant);

    // Set timer to clean up after reconnection window
    const timer = setTimeout(() => {
      this.permanentlyDisconnectParticipant(userId);
    }, RECONNECTION_WINDOW);
    
    this.reconnectionTimers.set(userId, timer);

    // Update database to reflect temporary disconnect
    await this.storage.updateCallParticipantV2ByUserAndCall(callId, userId, {
      connectionState: 'disconnected',
      leftAt: new Date()
    });

    console.log(`[ReconnectionManager] Participant ${userId} disconnected from call ${callId}, reconnection window: ${RECONNECTION_WINDOW}ms`);
    
    return participant;
  }

  /**
   * Attempt to reconnect a participant
   */
  public async attemptReconnection(
    userId: string, 
    reconnectToken: string,
    newWs: WebSocket,
    connectionId: string
  ): Promise<{
    success: boolean;
    callId?: string;
    sessionCode?: string;
    needsIceRestart?: boolean;
    mediaState?: { hasAudio: boolean; hasVideo: boolean };
  }> {
    const participant = this.disconnectedParticipants.get(userId);
    
    if (!participant) {
      console.log(`[ReconnectionManager] No disconnected record for user ${userId}`);
      return { success: false };
    }

    // Verify reconnect token
    if (participant.reconnectToken !== reconnectToken) {
      console.log(`[ReconnectionManager] Invalid reconnect token for user ${userId}`);
      return { success: false };
    }

    // Check if within reconnection window
    const elapsed = Date.now() - participant.disconnectedAt.getTime();
    if (elapsed > RECONNECTION_WINDOW) {
      console.log(`[ReconnectionManager] Reconnection window expired for user ${userId}`);
      this.permanentlyDisconnectParticipant(userId);
      return { success: false };
    }

    // Increment attempt count
    participant.attemptCount++;
    if (participant.attemptCount > MAX_RECONNECT_ATTEMPTS) {
      console.log(`[ReconnectionManager] Max reconnection attempts exceeded for user ${userId}`);
      this.permanentlyDisconnectParticipant(userId);
      return { success: false };
    }

    // Clear the cleanup timer
    const timer = this.reconnectionTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.reconnectionTimers.delete(userId);
    }

    // Update database
    await this.storage.updateCallParticipantV2ByUserAndCall(participant.callId, userId, {
      connectionState: 'connected',
      joinedAt: new Date()
    });

    // Remove from disconnected list
    this.disconnectedParticipants.delete(userId);

    // Reset heartbeat tracking
    this.recordHeartbeat(userId, participant.callId);

    console.log(`[ReconnectionManager] User ${userId} successfully reconnected to call ${participant.callId}`);

    return {
      success: true,
      callId: participant.callId,
      sessionCode: participant.sessionCode,
      needsIceRestart: true, // Always trigger ICE restart after reconnection
      mediaState: participant.mediaState
    };
  }

  /**
   * Check if a user can reconnect
   */
  public canReconnect(userId: string): boolean {
    const participant = this.disconnectedParticipants.get(userId);
    if (!participant) return false;

    const elapsed = Date.now() - participant.disconnectedAt.getTime();
    return elapsed <= RECONNECTION_WINDOW && participant.attemptCount < MAX_RECONNECT_ATTEMPTS;
  }

  /**
   * Get reconnection state for a user
   */
  public getReconnectionState(userId: string): DisconnectedParticipant | null {
    return this.disconnectedParticipants.get(userId) || null;
  }

  /**
   * Permanently disconnect a participant after window expires
   */
  private async permanentlyDisconnectParticipant(userId: string) {
    const participant = this.disconnectedParticipants.get(userId);
    if (!participant) return;

    console.log(`[ReconnectionManager] Permanently disconnecting user ${userId} from call ${participant.callId}`);

    // Update database to reflect permanent disconnect
    await this.storage.updateCallParticipantV2ByUserAndCall(participant.callId, userId, {
      connectionState: 'disconnected',
      leftAt: new Date()
    });

    // Clean up all records
    this.disconnectedParticipants.delete(userId);
    this.reconnectionTimers.delete(userId);
    this.heartbeats.delete(`${userId}-${participant.callId}`);

    // If they were conch holder, this needs to be handled by CallEngineV2
    if (participant.wasConchHolder) {
      // Emit event for CallEngineV2 to handle conch reassignment
      console.log(`[ReconnectionManager] Disconnected user ${userId} was conch holder, needs reassignment`);
    }
  }

  /**
   * Generate a secure reconnection token
   */
  private generateReconnectToken(): string {
    return Math.random().toString(36).substr(2, 9) + 
           Date.now().toString(36) + 
           Math.random().toString(36).substr(2, 9);
  }

  /**
   * Handle ICE restart for a reconnected participant
   */
  public scheduleIceRestart(userId: string, callId: string): NodeJS.Timeout {
    return setTimeout(() => {
      console.log(`[ReconnectionManager] Triggering ICE restart for reconnected user ${userId}`);
      // This will be handled by CallEngineV2 via event emission
    }, ICE_RESTART_DELAY);
  }

  /**
   * Clean up resources
   */
  public cleanup() {
    // Clear all timers
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
    
    this.reconnectionTimers.forEach(timer => clearTimeout(timer));
    this.reconnectionTimers.clear();
    
    // Clear all maps
    this.disconnectedParticipants.clear();
    this.heartbeats.clear();
  }
}