/**
 * CallEngineV2 - Server-authoritative call and conch management system
 * 
 * This replaces the current buggy peer-to-peer WebRTC implementation
 * with a server-orchestrated approach that prevents negotiation errors.
 */

import { randomUUID } from 'crypto';
import type { WebSocket } from 'ws';
import type { 
  CallSessionV2, 
  CallParticipantV2, 
  ConchStateV2,
  ConchTurnV2,
  CallEventV2,
  User,
  InsertCallSessionV2,
  InsertCallParticipantV2,
  InsertConchStateV2,
  InsertConchTurnV2,
  InsertCallEventV2
} from '@shared/schema';
import type { IStorage } from '../storage';
import { ReconnectionManager } from './ReconnectionManager';

// Constants from V2 spec
const CONCH_DEFAULT_DURATION = 30; // seconds
const CONCH_GRACE_PERIOD = 5; // seconds
const CONCH_COOLDOWN = 5; // seconds
const RECONNECTION_WINDOW = 30000; // 30 seconds in ms

// V2 Event Types
export type CallV2EventType = 
  // Client → Server
  | 'call:create'
  | 'call:accept'
  | 'call:decline'
  | 'call:end'
  | 'call:update-media'
  | 'call:sync'
  | 'call:join-session'
  | 'call:leave-session'
  // Server → Client
  | 'call:incoming'
  | 'call:ringing'
  | 'call:accepted'
  | 'call:declined'
  | 'call:updated'
  | 'call:ended'
  | 'session:users'
  | 'peer:joined'
  | 'peer:left'
  // WebRTC Signaling (Server-arbitrated)
  | 'webrtc:offer'
  | 'webrtc:answer'
  | 'webrtc:ice-candidate'
  | 'webrtc:negotiate'
  // Conch Events
  | 'conch:request'
  | 'conch:release'
  | 'conch:host-transfer'
  | 'conch:host-extend'
  | 'conch:host-force-release'
  | 'conch:granted'
  | 'conch:updated'
  | 'conch:denied'
  | 'conch:tick' // Timer countdown
  // V2 Media control events
  | 'v2:toggle_video'
  | 'v2:toggle_audio';

// V2 Event Payload Interfaces
export interface CallV2Event {
  type: CallV2EventType;
  payload: any;
  sequenceId?: number;
  timestamp?: number;
}

// Client connections mapped by userId
interface ClientConnection {
  ws: WebSocket;
  userId: string;
  connectionId: string;
  joinedSessions: Set<string>; // Session codes they're in
  lastHeartbeat?: Date; // CRITICAL FIX: Track last heartbeat for stale connection detection
  heartbeatTimer?: NodeJS.Timeout; // Timer for checking heartbeat timeout
}

// Active call sessions in memory (for real-time state)
interface ActiveCallSession {
  callId: string;
  sessionCode: string;
  status: string;
  hostId: string;
  participants: Map<string, CallParticipantConnection>;
  conchState: ConchRuntimeState | null;
  sequenceCounter: number;
  createdAt: Date;
}

interface CallParticipantConnection {
  userId: string;
  role: 'host' | 'participant';
  connectionId: string;
  isMuted: boolean;
  hasVideo: boolean;
  negotiationRole?: 'offerer' | 'answerer';
  joinedAt: Date;
}

interface ConchRuntimeState {
  state: 'idle' | 'held' | 'grace' | 'cooldown';
  holderUserId?: string;
  expiresAt?: Date;
  cooldownUntil?: Date;
  requestQueue: string[];
  timer?: NodeJS.Timeout;
  graceTimer?: NodeJS.Timeout;
}

// Event name mapping from legacy to v2 format
const EVENT_ALIAS = {
  // Call lifecycle
  'call:ringing': 'v2:call_ringing',
  'call:accepted': 'v2:call_accepted',
  'call:reconnected': 'v2:call_reconnected',
  'call:incoming': 'v2:call_incoming',
  'call:ended': 'v2:call_ended',
  'call:connected': 'v2:call_connected',
  'call:failed': 'v2:call_failed',
  'call:rejected': 'v2:call_rejected',
  'call:declined': 'v2:call_declined',
  'call:updated': 'v2:call_updated',
  'call:update-media': 'v2:call_update_media',
  
  // Peer/participant events
  'peer:reconnected': 'v2:peer_reconnected',
  'peer:disconnected': 'v2:peer_disconnected',
  'peer:joined': 'v2:participant_joined',
  'peer:connected': 'v2:peer_connected',
  'peer:left': 'v2:peer_left',
  'participant:joined': 'v2:participant_joined',
  'participant:left': 'v2:participant_left',
  'participant:video_toggled': 'v2:participant_video_toggled',
  'participant:audio_toggled': 'v2:participant_audio_toggled',
  
  // Session events
  'session:users': 'v2:session_joined',
  'session:created': 'v2:call_initiated',
  'session:ended': 'v2:session_ended',
  'session:updated': 'v2:session_updated',
  
  // Conch events
  'conch:updated': 'v2:conch_state',
  'conch:granted': 'v2:conch_granted',
  'conch:denied': 'v2:conch_denied',
  'conch:error': 'v2:conch_error',
  'conch:extended': 'v2:conch_extended',
  'conch:tick': 'v2:conch_tick',
  'conch:released': 'v2:conch_released',
  'conch:requested': 'v2:conch_requested',
  'conch:expired': 'v2:conch_expired',
  'conch:request': 'v2:conch_request',
  'conch:release': 'v2:conch_release',
  'conch:host-transfer': 'v2:conch_host_transfer',
  'conch:host-extend': 'v2:conch_host_extend',
  'conch:host-force-release': 'v2:conch_host_force_release',
  
  // Negotiation events
  'negotiation:required': 'v2:negotiation_required',
  'offer:received': 'v2:offer_received',
  'answer:received': 'v2:answer_received',
  'ice:candidate': 'v2:ice_candidate',
  'webrtc:offer': 'v2:webrtc_offer',
  'webrtc:answer': 'v2:webrtc_answer',
  'webrtc:ice_candidate': 'v2:webrtc_ice_candidate',
  'webrtc:ice-candidate': 'v2:webrtc_ice_candidate',
  'webrtc:negotiation_needed': 'v2:webrtc_negotiation_needed',
  'webrtc:negotiate': 'v2:webrtc_negotiate',
  
  // Track events
  'track:enabled': 'v2:track_enabled',
  'track:disabled': 'v2:track_disabled',
  'toggle_video': 'v2:toggle_video',
  'toggle_audio': 'v2:toggle_audio',
  
  // Other events
  'prepare_for_connections': 'v2:prepare_for_connections',
  
  // Error events
  'error': 'v2:error'
} as const;

export class CallEngineV2 {
  private storage: IStorage;
  private reconnectionManager: ReconnectionManager;
  private connections: Map<string, ClientConnection> = new Map();
  private activeSessions: Map<string, ActiveCallSession> = new Map();
  private sessionsByCode: Map<string, string> = new Map(); // sessionCode → callId
  private heartbeatInterval: NodeJS.Timeout | null = null; // CRITICAL FIX: Global heartbeat check interval
  private readonly HEARTBEAT_TIMEOUT = 10000; // 10 seconds timeout
  private readonly HEARTBEAT_CHECK_INTERVAL = 5000; // Check every 5 seconds

  constructor(storage: IStorage) {
    this.storage = storage;
    this.reconnectionManager = new ReconnectionManager(storage);
    console.log('[CallEngineV2] ✅ Initialized with ReconnectionManager');
    
    // CRITICAL FIX: Start heartbeat monitoring for all connections
    this.startHeartbeatMonitoring();
  }
  
  /**
   * CRITICAL FIX: Start monitoring all connections for heartbeat timeouts
   */
  private startHeartbeatMonitoring() {
    this.heartbeatInterval = setInterval(() => {
      this.checkStaleConnections();
    }, this.HEARTBEAT_CHECK_INTERVAL);
    console.log('[CallEngineV2] 💓 Heartbeat monitoring started');
  }
  
  /**
   * CRITICAL FIX: Check for stale connections that haven't sent heartbeat
   */
  private async checkStaleConnections() {
    const now = new Date();
    const staleConnections: string[] = [];
    
    for (const [connectionId, connection] of this.connections.entries()) {
      // Check if connection has sent a heartbeat recently
      if (connection.lastHeartbeat) {
        const timeSinceHeartbeat = now.getTime() - connection.lastHeartbeat.getTime();
        
        if (timeSinceHeartbeat > this.HEARTBEAT_TIMEOUT) {
          console.log(`[CallEngineV2] ⚠️ Stale connection detected: ${connectionId} (${connection.userId}) - last heartbeat ${timeSinceHeartbeat}ms ago`);
          staleConnections.push(connectionId);
        }
      } else if (connection.joinedSessions.size > 0) {
        // Connection is in active calls but never sent a heartbeat
        const timeSinceJoin = now.getTime() - (connection.lastHeartbeat || now).getTime();
        if (timeSinceJoin > this.HEARTBEAT_TIMEOUT) {
          console.log(`[CallEngineV2] ⚠️ Connection in calls but no heartbeat: ${connectionId} (${connection.userId})`);
          staleConnections.push(connectionId);
        }
      }
    }
    
    // Handle stale connections by disconnecting them
    for (const connectionId of staleConnections) {
      console.log(`[CallEngineV2] 🔴 Disconnecting stale connection: ${connectionId}`);
      await this.handleStaleConnection(connectionId);
    }
  }
  
  /**
   * CRITICAL FIX: Handle a stale connection by ending their active calls
   */
  private async handleStaleConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;
    
    console.log(`[CallEngineV2] Handling stale connection for ${connection.userId}`);
    
    // Force disconnect - treat as network failure
    try {
      // Close the WebSocket if still open
      if (connection.ws.readyState === 1 /* OPEN */) {
        // Use 1001 (Going Away) for stale connections - 1006 is reserved and cannot be sent
        connection.ws.close(1001, 'Heartbeat timeout - connection considered lost');
      }
      
      // Trigger same cleanup as unregisterConnection
      await this.unregisterConnection(connectionId);
    } catch (error) {
      console.error(`[CallEngineV2] Error handling stale connection:`, error);
    }
  }
  
  /**
   * Update heartbeat timestamp for a connection
   */
  public updateHeartbeat(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastHeartbeat = new Date();
    }
  }

  /**
   * Register a session created by the legacy API
   * This allows the V2 engine to handle join-session requests for legacy-created calls
   * CRITICAL FIX: Made idempotent - won't overwrite existing session with connected participants
   */
  public registerLegacySession(sessionCode: string, callId: string, hostId: string) {
    console.log(`[CallEngineV2] Registering legacy session: ${sessionCode} → ${callId} (host: ${hostId})`);
    
    // CRITICAL FIX: Check if session already exists to preserve participant state
    const existingSession = this.activeSessions.get(callId);
    if (existingSession) {
      console.log(`[CallEngineV2] ℹ️ Session ${callId} already registered with ${existingSession.participants.size} participants - skipping re-init`);
      
      // Update sessionsByCode mapping in case it's missing (defensive)
      if (!this.sessionsByCode.has(sessionCode)) {
        this.sessionsByCode.set(sessionCode, callId);
        console.log(`[CallEngineV2] ✅ Added missing sessionCode mapping: ${sessionCode} → ${callId}`);
      }
      return; // Skip initialization to preserve participant state
    }
    
    // Map sessionCode to callId for lookup
    this.sessionsByCode.set(sessionCode, callId);
    
    // Initialize active session so join-session can find it
    const activeSession: ActiveCallSession = {
      callId,
      sessionCode,
      status: 'ringing',
      hostId,
      participants: new Map(),
      conchState: null,
      sequenceCounter: 0,
      createdAt: new Date()
    };
    
    this.activeSessions.set(callId, activeSession);
    console.log(`[CallEngineV2] ✅ Active session initialized for ${callId}`);
  }

  /**
   * Helper to emit V2-formatted events with sequence tracking
   */
  private emitV2(
    target: 'user' | 'session',
    targetId: string,
    eventType: string,
    payload?: any,
    excludeUserId?: string
  ) {
    // Translate legacy event name to v2 format
    const v2EventType = EVENT_ALIAS[eventType as keyof typeof EVENT_ALIAS] || eventType;
    
    // Get sequence ID for the session if applicable
    let sequenceId: number | undefined;
    if (target === 'session') {
      const callId = this.sessionsByCode.get(targetId);
      const session = callId ? this.activeSessions.get(callId) : null;
      if (session) {
        sequenceId = ++session.sequenceCounter;
      }
    }
    
    const message = {
      type: v2EventType,
      payload: payload || {},
      ...(sequenceId !== undefined && { sequence: sequenceId })
    };
    
    if (target === 'user') {
      this.sendToUser(targetId, message);
    } else {
      const excludeUsers = excludeUserId ? [excludeUserId] : [];
      this.broadcastToSession(targetId, message, excludeUsers);
    }
    
    console.log(`[CallEngineV2] Emitted ${v2EventType} to ${target} ${targetId}`);
  }

  /**
   * Register a WebSocket connection for a user
   */
  public async registerConnection(userId: string, ws: WebSocket, connectionId: string) {
    // Check if this is a reconnection
    const reconnectState = this.reconnectionManager.getReconnectionState(userId);
    
    if (reconnectState && this.reconnectionManager.canReconnect(userId)) {
      console.log(`[CallEngineV2] User ${userId} attempting to reconnect`);
      
      // Attempt reconnection with the saved token (in production, token should be validated)
      const reconnectResult = await this.reconnectionManager.attemptReconnection(
        userId,
        reconnectState.reconnectToken, // In production, get this from client
        ws,
        connectionId
      );
      
      if (reconnectResult.success && reconnectResult.callId) {
        // Restore connection to active session
        const session = this.activeSessions.get(reconnectResult.callId);
        if (session) {
          // Re-add to participants
          const participant: CallParticipantConnection = {
            userId,
            role: session.hostId === userId ? 'host' : 'participant',
            connectionId,
            isMuted: !reconnectResult.mediaState?.hasAudio,
            hasVideo: reconnectResult.mediaState?.hasVideo || false,
            joinedAt: new Date()
          };
          session.participants.set(userId, participant);
          
          // Create connection record
          const connection: ClientConnection = {
            ws,
            userId,
            connectionId,
            joinedSessions: new Set([reconnectResult.sessionCode || ''])
          };
          this.connections.set(connectionId, connection);
          
          // Notify all participants of reconnection
          this.emitV2('session', reconnectResult.sessionCode!, 'peer_reconnected', {
            userId,
            needsIceRestart: reconnectResult.needsIceRestart
          });
          
          // Send session state to reconnected user
          this.emitV2('user', userId, 'call:reconnected', {
            callId: reconnectResult.callId,
            sessionCode: reconnectResult.sessionCode,
            participants: Array.from(session.participants.values()),
            conchState: session.conchState
          });
          
          // Trigger ICE restart if needed
          if (reconnectResult.needsIceRestart) {
            this.reconnectionManager.scheduleIceRestart(userId, reconnectResult.callId);
            // Trigger negotiation needed event
            this.emitV2('user', userId, 'negotiation:required', {
              reason: 'ice-restart',
              role: participant.negotiationRole || 'answerer'
            });
          }
          
          console.log(`[CallEngineV2] User ${userId} successfully reconnected`);
          return;
        }
      }
    }
    
    // Normal new connection
    const connection: ClientConnection = {
      ws,
      userId,
      connectionId,
      joinedSessions: new Set(),
      lastHeartbeat: new Date() // CRITICAL FIX: Initialize heartbeat timestamp
    };
    this.connections.set(connectionId, connection);
    console.log(`[CallEngineV2] User ${userId} connected (${connectionId})`);
  }

  /**
   * Unregister a WebSocket connection
   * CRITICAL FIX: Properly end calls when participants disconnect
   */
  public async unregisterConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      // Check if user is in active calls and handle disconnection
      const sessionCodes = Array.from(connection.joinedSessions);
      for (const sessionCode of sessionCodes) {
        const callId = this.sessionsByCode.get(sessionCode);
        if (callId) {
          const session = this.activeSessions.get(callId);
          if (session) {
            const participant = session.participants.get(connection.userId);
            const wasConchHolder = session.conchState?.holderUserId === connection.userId;
            
            // CRITICAL FIX: Check if this is the last participant in a 1-on-1 call
            const remainingParticipants = Array.from(session.participants.values())
              .filter(p => p.userId !== connection.userId && p.connectionId);
            
            if (remainingParticipants.length === 1) {
              // Only one participant left after this disconnection - end the call
              console.log(`[CallEngineV2] ⚠️ Only 1 participant left after disconnection - ending call ${callId}`);
              
              // Notify the remaining participant that call ended due to disconnection
              const remainingParticipant = remainingParticipants[0];
              this.emitV2('user', remainingParticipant.userId, 'call:ended', {
                callId,
                reason: 'Network disconnection - other party lost connection',
                endedBy: 'system'
              });
              
              // Update database to mark call as ended
              try {
                await this.storage.updateCallSessionV2(callId, {
                  status: 'ended',
                  endedAt: new Date(),
                  endReason: 'network_disconnect'
                });
              } catch (error) {
                console.error(`[CallEngineV2] Failed to update call status in database:`, error);
              }
              
              // Clean up the active session
              this.activeSessions.delete(callId);
              this.sessionsByCode.delete(sessionCode);
              
              console.log(`[CallEngineV2] Call ${callId} ended due to network disconnection`);
            } else if (remainingParticipants.length === 0) {
              // No participants left - clean up the session
              console.log(`[CallEngineV2] No participants left in call ${callId} - cleaning up`);
              
              // Update database
              try {
                await this.storage.updateCallSessionV2(callId, {
                  status: 'ended',
                  endedAt: new Date(),
                  endReason: 'all_disconnected'
                });
              } catch (error) {
                console.error(`[CallEngineV2] Failed to update call status in database:`, error);
              }
              
              // Clean up the active session
              this.activeSessions.delete(callId);
              this.sessionsByCode.delete(sessionCode);
            } else {
              // Multi-party call with more than 1 participant remaining
              // Register with reconnection manager for graceful reconnection
              await this.reconnectionManager.handleParticipantDisconnect(
                connection.userId,
                callId,
                sessionCode,
                wasConchHolder,
                {
                  hasAudio: participant?.isMuted === false,
                  hasVideo: participant?.hasVideo || false
                }
              );
              
              // Notify other participants of temporary disconnect
              this.emitV2('session', sessionCode, 'peer:disconnected', {
                userId: connection.userId,
                canReconnect: true,
                reconnectionWindow: 30000
              }, connection.userId);
              
              console.log(`[CallEngineV2] User ${connection.userId} disconnected from multi-party call - ${remainingParticipants.length} participants remain`);
            }
          }
        }
      }
      
      this.connections.delete(connectionId);
      console.log(`[CallEngineV2] Connection ${connectionId} disconnected`);
    }
  }

  /**
   * Handle incoming V2 event from client
   */
  public async handleEvent(event: CallV2Event, userId: string, connectionId: string) {
    console.log(`[CallEngineV2] Event from ${userId}: ${event.type}`, event.payload);

    try {
      switch (event.type) {
        // Call lifecycle
        case 'call:create':
          await this.handleCreateCall(event.payload, userId);
          break;
        case 'call:accept':
          await this.handleAcceptCall(event.payload, userId);
          break;
        case 'call:decline':
          await this.handleDeclineCall(event.payload, userId);
          break;
        case 'call:end':
          await this.handleEndCall(event.payload, userId);
          break;
        case 'call:update-media':
          await this.handleUpdateMedia(event.payload, userId);
          break;
        case 'call:sync':
          await this.handleSyncCall(event.payload, userId, connectionId);
          break;
        case 'call:join-session':
          await this.handleJoinSession(event.payload, userId, connectionId);
          break;
        case 'call:leave-session':
          await this.handleLeaveSession(userId, event.payload.sessionCode);
          break;

        // Media control events
        case 'v2:toggle_video':
          await this.handleToggleVideo(event.payload, userId);
          break;
        case 'v2:toggle_audio':
          await this.handleToggleAudio(event.payload, userId);
          break;

        // WebRTC signaling (server-arbitrated)
        case 'webrtc:offer':
        case 'webrtc:answer':
        case 'webrtc:ice-candidate':
          await this.handleWebRTCSignal(event, userId);
          break;

        // Conch control
        case 'conch:request':
          await this.handleConchRequest(event.payload, userId);
          break;
        case 'conch:release':
          await this.handleConchRelease(event.payload, userId);
          break;
        case 'conch:host-transfer':
          await this.handleConchHostTransfer(event.payload, userId);
          break;
        case 'conch:host-extend':
          await this.handleConchHostExtend(event.payload, userId);
          break;
        case 'conch:host-force-release':
          await this.handleConchHostForceRelease(event.payload, userId);
          break;

        default:
          console.warn(`[CallEngineV2] Unknown event type: ${event.type}`);
      }

      // Log event to audit table
      await this.logEvent(event, userId);
    } catch (error) {
      console.error(`[CallEngineV2] Error handling ${event.type}:`, error);
      this.sendToUser(userId, {
        type: 'error',
        payload: { 
          message: `Failed to process ${event.type}`,
          originalEvent: event.type
        }
      });
    }
  }

  /**
   * Create a new call session
   */
  private async handleCreateCall(payload: any, userId: string) {
    const { callType, participantIds, conchEnabled, partnershipId } = payload;

    // Generate unique session code
    const sessionCode = this.generateSessionCode();

    // Create database record
    const callSession = await this.storage.createCallSessionV2({
      createdByUserId: userId,
      sessionCode,
      type: callType,
      status: 'initiated',
      conchEnabled: conchEnabled || false,
      partnershipId
    });

    // Create in-memory session
    const activeSession: ActiveCallSession = {
      callId: callSession.id,
      sessionCode,
      status: 'ringing',
      hostId: userId,
      participants: new Map(),
      conchState: conchEnabled ? this.initializeConchState() : null,
      sequenceCounter: 0,
      createdAt: new Date()
    };

    this.activeSessions.set(callSession.id, activeSession);
    this.sessionsByCode.set(sessionCode, callSession.id);

    // Add host as first participant
    await this.storage.createCallParticipantV2({
      callId: callSession.id,
      userId,
      role: 'host'
    });

    // Update status to ringing
    await this.storage.updateCallSessionV2(callSession.id, { status: 'ringing' });

    // Notify all invited participants
    const notificationPromises = participantIds.map((participantId: string) =>
      this.notifyIncomingCall(participantId, callSession, userId)
    );
    await Promise.all(notificationPromises);

    // Send confirmation to caller
    this.emitV2('user', userId, 'call:ringing', {
      call: callSession,
      sessionCode
    });

    console.log(`[CallEngineV2] Call created: ${callSession.id} (${sessionCode})`);
  }

  /**
   * Accept an incoming call
   */
  private async handleAcceptCall(payload: any, userId: string) {
    const { callId } = payload;
    
    const session = this.activeSessions.get(callId);
    if (!session) {
      throw new Error('Call session not found');
    }

    // Update participant record
    await this.storage.updateCallParticipantV2ByUserAndCall(callId, userId, {
      joinedAt: new Date()
    });

    // Update call status if first to accept
    if (session.status === 'ringing') {
      session.status = 'connecting';
      await this.storage.updateCallSessionV2(callId, {
        status: 'connecting',
        startedAt: new Date()
      });
    }

    // Broadcast to all participants
    this.emitV2('session', session.sessionCode, 'call:accepted', {
      callId,
      byUserId: userId
    });

    console.log(`[CallEngineV2] Call ${callId} accepted by ${userId}`);
  }

  /**
   * Join a call session (after accepting)
   */
  private async handleJoinSession(payload: any, userId: string, connectionId: string) {
    const { sessionCode } = payload;
    
    const callId = this.sessionsByCode.get(sessionCode);
    if (!callId) {
      throw new Error('Invalid session code');
    }

    const session = this.activeSessions.get(callId);
    if (!session) {
      throw new Error('Session not active');
    }

    // Add to session participants
    const participant: CallParticipantConnection = {
      userId,
      role: userId === session.hostId ? 'host' : 'participant',
      connectionId,
      isMuted: false,
      hasVideo: false,
      joinedAt: new Date()
    };
    session.participants.set(userId, participant);

    // Track session membership
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.joinedSessions.add(sessionCode);
    }

    // Assign negotiation roles for WebRTC (multi-party mesh support)
    if (session.participants.size === 2) {
      // For 1:1 calls, assign offerer/answerer roles
      const participants = Array.from(session.participants.values());
      participants[0].negotiationRole = 'offerer';
      participants[1].negotiationRole = 'answerer';
      
      // CRITICAL FIX: Send WebRTC coordination messages to trigger handshake
      const offerer = participants[0];
      const answerer = participants[1];
      
      console.log(`[CallEngineV2] 📡 Triggering WebRTC handshake for 1:1 call:`);
      console.log(`  - Offerer: ${offerer.userId}`);
      console.log(`  - Answerer: ${answerer.userId}`);
      
      // Tell offerer to create an offer for the answerer
      this.sendToUser(offerer.userId, {
        type: 'v2:initiate_connection',
        payload: {
          targetUserId: answerer.userId,
          sessionCode,
          role: 'offerer'
        }
      });
      
      // Tell answerer to prepare for incoming offer from offerer
      this.sendToUser(answerer.userId, {
        type: 'v2:initiate_connection',
        payload: {
          targetUserId: offerer.userId,
          sessionCode,
          role: 'answerer'
        }
      });
      
      console.log(`[CallEngineV2] ✅ WebRTC coordination messages sent`);
    } else if (session.participants.size > 2) {
      // For multi-party calls (3+ participants), new joiner is answerer to all existing
      participant.negotiationRole = 'answerer';
      
      // Notify all existing participants to initiate offers to the new joiner
      const existingParticipants = Array.from(session.participants.values())
        .filter(p => p.userId !== userId);
      
      for (const existing of existingParticipants) {
        this.sendToUser(existing.userId, {
          type: 'v2:initiate_connection',
          payload: {
            targetUserId: userId,
            sessionCode,
            role: 'offerer' // Existing participants are offerers
          }
        });
      }
      
      // Notify new joiner to prepare for incoming offers
      this.emitV2('user', userId, 'prepare_for_connections', {
        sessionCode,
        expectedConnections: existingParticipants.map(p => p.userId),
        role: 'answerer' // New joiner is answerer
      });
    }

    // Update session status to live if enough participants
    if (session.status === 'connecting' && session.participants.size >= 2) {
      session.status = 'live';
      await this.storage.updateCallSessionV2(callId, { status: 'live' });
    }

    // Send current session state to new joiner
    this.emitV2('user', userId, 'session:users', {
      sessionCode,
      users: Array.from(session.participants.values()).map(p => ({
        userId: p.userId,
        role: p.role,
        isMuted: p.isMuted,
        hasVideo: p.hasVideo,
        negotiationRole: p.negotiationRole
      }))
    });

    // Notify others of new participant
    this.emitV2('session', sessionCode, 'peer:joined', {
      userId,
      role: participant.role,
      negotiationRole: participant.negotiationRole
    }, userId); // Exclude the joiner

    // Send current conch state if enabled
    if (session.conchState) {
      this.emitV2('user', userId, 'conch:updated', {
        callId,
        state: session.conchState.state,
        holderUserId: session.conchState.holderUserId,
        expiresAt: session.conchState.expiresAt,
        cooldownUntil: session.conchState.cooldownUntil
      });
    }

    console.log(`[CallEngineV2] User ${userId} joined session ${sessionCode}`);
  }

  /**
   * Handle WebRTC signaling with server arbitration
   */
  private async handleWebRTCSignal(event: CallV2Event, userId: string) {
    const { targetUserId, sessionCode, sdp, candidate } = event.payload;

    const callId = this.sessionsByCode.get(sessionCode);
    if (!callId) {
      throw new Error('Invalid session code');
    }

    const session = this.activeSessions.get(callId);
    if (!session) {
      throw new Error('Session not active');
    }

    // Verify sender is in the session
    const senderParticipant = session.participants.get(userId);
    if (!senderParticipant) {
      throw new Error('User not in session');
    }

    // Server-authoritative negotiation logic
    if (event.type === 'webrtc:offer') {
      // Only offerer can send offers
      if (senderParticipant.negotiationRole !== 'offerer') {
        throw new Error('Unauthorized: Only designated offerer can send offers');
      }
      
      // Verify target exists and is answerer
      const targetParticipant = session.participants.get(targetUserId);
      if (!targetParticipant || targetParticipant.negotiationRole !== 'answerer') {
        throw new Error('Invalid target for offer');
      }

      // Log to database for audit
      await this.logWebRTCEvent(callId, userId, targetUserId, 'offer', sdp);
    }
    
    if (event.type === 'webrtc:answer') {
      // Only answerer can send answers
      if (senderParticipant.negotiationRole !== 'answerer') {
        throw new Error('Unauthorized: Only designated answerer can send answers');
      }
      
      // Verify target is the offerer
      const targetParticipant = session.participants.get(targetUserId);
      if (!targetParticipant || targetParticipant.negotiationRole !== 'offerer') {
        throw new Error('Invalid target for answer');
      }

      // Log to database for audit
      await this.logWebRTCEvent(callId, userId, targetUserId, 'answer', sdp);
    }

    // Increment sequence counter for ordering
    const sequenceId = ++session.sequenceCounter;

    // Server-controlled relay with validation
    // Convert the event type to the legacy format for emitV2
    const legacyEventType = Object.entries(EVENT_ALIAS).find(([_, v2]) => v2 === event.type)?.[0] || event.type.replace('v2:', '');
    this.emitV2('user', targetUserId, legacyEventType, {
      ...event.payload,
      fromUserId: userId,
      sequenceId,
      serverValidated: true // Indicates server has authorized this signal
    });

    console.log(`[CallEngineV2] WebRTC ${event.type} authorized and relayed: ${userId} → ${targetUserId} (seq: ${sequenceId})`);
  }

  /**
   * Handle conch request
   */
  private async handleConchRequest(payload: any, userId: string) {
    const { callId } = payload;

    const session = this.activeSessions.get(callId);
    if (!session || !session.conchState) {
      throw new Error('Conch not enabled for this call');
    }

    const conch = session.conchState;

    // Check if user is in cooldown
    if (conch.cooldownUntil && conch.cooldownUntil > new Date()) {
      this.emitV2('user', userId, 'conch:denied', {
        callId,
        reason: 'cooldown'
      });
      return;
    }

    // Grant conch if idle
    if (conch.state === 'idle') {
      await this.grantConch(session, userId);
    } else {
      // Add to queue
      if (!conch.requestQueue.includes(userId)) {
        conch.requestQueue.push(userId);
        console.log(`[CallEngineV2] User ${userId} queued for conch (position: ${conch.requestQueue.length})`);
      }
    }
  }

  /**
   * Grant conch to a user
   */
  private async grantConch(session: ActiveCallSession, userId: string) {
    if (!session.conchState) return;

    const conch = session.conchState;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CONCH_DEFAULT_DURATION * 1000);

    // Update state
    conch.state = 'held';
    conch.holderUserId = userId;
    conch.expiresAt = expiresAt;

    // Clear any existing timers
    if (conch.timer) clearTimeout(conch.timer);
    if (conch.graceTimer) clearTimeout(conch.graceTimer);

    // Set expiration timer
    conch.timer = setTimeout(() => {
      this.handleConchExpiration(session);
    }, CONCH_DEFAULT_DURATION * 1000);

    // Save to database
    await this.storage.upsertConchStateV2({
      callId: session.callId,
      state: 'held',
      holderUserId: userId,
      expiresAt,
      requestQueue: conch.requestQueue
    });

    // Record turn start
    await this.storage.createConchTurnV2({
      callId: session.callId,
      userId,
      startedAt: now
    });

    // Broadcast to all participants
    this.emitV2('session', session.sessionCode, 'conch:granted', {
      callId: session.callId,
      holderUserId: userId,
      state: 'held',
      expiresAt
    });

    // Start countdown ticker
    this.startConchTicker(session);

    console.log(`[CallEngineV2] Conch granted to ${userId} until ${expiresAt.toISOString()}`);
  }

  /**
   * Handle conch timer expiration
   */
  private async handleConchExpiration(session: ActiveCallSession) {
    if (!session.conchState) return;

    const conch = session.conchState;
    const now = new Date();

    // Enter grace period
    conch.state = 'grace';
    const graceEndsAt = new Date(now.getTime() + CONCH_GRACE_PERIOD * 1000);

    // Broadcast grace state
    this.emitV2('session', session.sessionCode, 'conch:updated', {
      callId: session.callId,
      state: 'grace',
      holderUserId: conch.holderUserId,
      expiresAt: graceEndsAt
    });

    // Set grace timer
    conch.graceTimer = setTimeout(async () => {
      await this.releaseConch(session, 'timer');
    }, CONCH_GRACE_PERIOD * 1000);

    console.log(`[CallEngineV2] Conch entered grace period`);
  }

  /**
   * Release the conch
   */
  private async releaseConch(session: ActiveCallSession, reason: string) {
    if (!session.conchState) return;

    const conch = session.conchState;
    const previousHolder = conch.holderUserId;

    // Clear timers
    if (conch.timer) clearTimeout(conch.timer);
    if (conch.graceTimer) clearTimeout(conch.graceTimer);

    // Update turn history
    if (previousHolder) {
      await this.storage.completeConchTurnV2(
        session.callId,
        previousHolder,
        reason
      );
    }

    // Set cooldown for previous holder
    if (previousHolder) {
      conch.cooldownUntil = new Date(Date.now() + CONCH_COOLDOWN * 1000);
    }

    // Reset state
    conch.state = 'idle';
    conch.holderUserId = undefined;
    conch.expiresAt = undefined;

    // Check queue for next holder
    const nextUserId = conch.requestQueue.shift();
    if (nextUserId) {
      // Grant to next in queue
      await this.grantConch(session, nextUserId);
    } else {
      // Broadcast idle state
      this.emitV2('session', session.sessionCode, 'conch:updated', {
        callId: session.callId,
        state: 'idle',
        holderUserId: null,
        expiresAt: null,
        cooldownUntil: conch.cooldownUntil
      });

      // Update database
      await this.storage.upsertConchStateV2({
        callId: session.callId,
        state: 'idle',
        cooldownUntil: conch.cooldownUntil,
        requestQueue: []
      });
    }

    console.log(`[CallEngineV2] Conch released (reason: ${reason})`);
  }

  /**
   * Send countdown ticks to participants
   */
  private startConchTicker(session: ActiveCallSession) {
    if (!session.conchState || !session.conchState.expiresAt) return;

    const tickInterval = setInterval(() => {
      if (!session.conchState || session.conchState.state !== 'held') {
        clearInterval(tickInterval);
        return;
      }

      const remaining = Math.max(0, 
        Math.floor((session.conchState.expiresAt!.getTime() - Date.now()) / 1000)
      );

      this.emitV2('session', session.sessionCode, 'conch:tick', {
        callId: session.callId,
        remainingSeconds: remaining
      });

      if (remaining === 0) {
        clearInterval(tickInterval);
      }
    }, 1000);
  }

  // Helper methods

  private initializeConchState(): ConchRuntimeState {
    return {
      state: 'idle',
      requestQueue: []
    };
  }

  private generateSessionCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Log WebRTC signaling events to database
   */
  private async logWebRTCEvent(
    callId: string,
    fromUserId: string,
    toUserId: string,
    eventType: string,
    payload?: any
  ) {
    try {
      // This would be implemented with callEventsV2 table
      // await this.storage.createCallEventV2({
      //   callId,
      //   eventType: `webrtc:${eventType}`,
      //   fromUserId,
      //   toUserId,
      //   payload: JSON.stringify(payload || {})
      // });
      console.log(`[CallEngineV2] WebRTC event logged: ${eventType} from ${fromUserId} to ${toUserId}`);
    } catch (error) {
      console.error('[CallEngineV2] Failed to log WebRTC event:', error);
    }
  }

  private sendToUser(userId: string, event: any) {
    const connectionsArray = Array.from(this.connections.values());
    for (const connection of connectionsArray) {
      if (connection.userId === userId && connection.ws.readyState === 1) {
        connection.ws.send(JSON.stringify(event));
      }
    }
  }

  private broadcastToSession(sessionCode: string, event: any, excludeUsers: string[] = []) {
    const callId = this.sessionsByCode.get(sessionCode);
    if (!callId) return;

    const session = this.activeSessions.get(callId);
    if (!session) return;

    session.participants.forEach(participant => {
      if (!excludeUsers.includes(participant.userId)) {
        this.sendToUser(participant.userId, event);
      }
    });
  }

  private async notifyIncomingCall(userId: string, call: CallSessionV2, fromUserId: string) {
    // Get caller info
    const caller = await this.storage.getUser(fromUserId);
    
    // Create participant record
    await this.storage.createCallParticipantV2({
      callId: call.id,
      userId,
      role: 'participant'
    });

    // Send notification
    this.emitV2('user', userId, 'call:incoming', {
      call,
      fromUser: {
        id: fromUserId,
        displayName: caller?.displayName || 'Unknown'
      }
    });
  }

  private async logEvent(event: CallV2Event, userId: string) {
    // Implementation would log to callEventsV2 table
    // Skipping for now to focus on core functionality
  }

  // Additional stub methods for remaining handlers
  private async handleDeclineCall(payload: any, userId: string) {
    // TODO: Implement
  }

  private async handleEndCall(payload: any, userId: string) {
    // TODO: Implement
  }

  private async handleUpdateMedia(payload: any, userId: string) {
    // TODO: Implement
  }

  private async handleSyncCall(payload: any, userId: string, connectionId: string) {
    // TODO: Implement reconnection sync
  }

  private async handleLeaveSession(userId: string, sessionCode: string) {
    // TODO: Implement
  }

  private async handleConchRelease(payload: any, userId: string) {
    const { callId } = payload;
    
    const session = this.activeSessions.get(callId);
    if (!session || !session.conchState) {
      throw new Error('Conch not enabled for this call');
    }

    const conch = session.conchState;
    
    // Verify user is the current conch holder
    if (conch.holderUserId !== userId) {
      this.sendToUser(userId, {
        type: 'conch:error',
        payload: {
          callId,
          error: 'You are not the current conch holder'
        }
      });
      return;
    }

    // Release the conch
    await this.releaseConch(session, 'voluntary');
    console.log(`[CallEngineV2] User ${userId} voluntarily released conch`);
  }

  private async handleConchHostTransfer(payload: any, userId: string) {
    const { callId, targetUserId } = payload;
    
    const session = this.activeSessions.get(callId);
    if (!session || !session.conchState) {
      throw new Error('Conch not enabled for this call');
    }

    // Verify user is the host
    if (session.hostId !== userId) {
      this.sendToUser(userId, {
        type: 'conch:error',
        payload: {
          callId,
          error: 'Only the host can transfer conch'
        }
      });
      return;
    }

    // Release current conch if held
    if (session.conchState.state !== 'idle') {
      await this.releaseConch(session, 'host-transfer');
    }

    // Remove target user from queue if present to prevent duplicates
    const conch = session.conchState;
    conch.requestQueue = conch.requestQueue.filter(id => id !== targetUserId);

    // Grant to target user immediately
    await this.grantConch(session, targetUserId);
    console.log(`[CallEngineV2] Host transferred conch to ${targetUserId}`);
  }

  private async handleConchHostExtend(payload: any, userId: string) {
    const { callId, additionalSeconds } = payload;
    
    const session = this.activeSessions.get(callId);
    if (!session || !session.conchState) {
      throw new Error('Conch not enabled for this call');
    }

    const conch = session.conchState;
    
    // Verify user is the host
    if (session.hostId !== userId) {
      this.sendToUser(userId, {
        type: 'conch:error',
        payload: {
          callId,
          error: 'Only the host can extend conch time'
        }
      });
      return;
    }

    // Verify conch is held
    if (conch.state !== 'held' || !conch.holderUserId) {
      this.sendToUser(userId, {
        type: 'conch:error',
        payload: {
          callId,
          error: 'No active conch to extend'
        }
      });
      return;
    }

    // Clear existing timers
    if (conch.timer) {
      clearTimeout(conch.timer);
    }
    if (conch.graceTimer) {
      clearTimeout(conch.graceTimer);
    }

    // Set new extended timer
    const extension = Math.min(additionalSeconds || 30, 60); // Max 60 seconds extension
    conch.expiresAt = new Date(Date.now() + extension * 1000);
    
    conch.timer = setTimeout(() => {
      this.handleConchExpiration(session);
    }, extension * 1000);

    // Broadcast extension
    this.broadcastToSession(session.sessionCode, {
      type: 'conch:extended',
      payload: {
        callId,
        holderUserId: conch.holderUserId,
        additionalSeconds: extension,
        newExpiresAt: conch.expiresAt
      }
    });

    console.log(`[CallEngineV2] Host extended conch by ${extension} seconds`);
  }

  private async handleConchHostForceRelease(payload: any, userId: string) {
    const { callId } = payload;
    
    const session = this.activeSessions.get(callId);
    if (!session || !session.conchState) {
      throw new Error('Conch not enabled for this call');
    }

    // Verify user is the host
    if (session.hostId !== userId) {
      this.sendToUser(userId, {
        type: 'conch:error',
        payload: {
          callId,
          error: 'Only the host can force-release conch'
        }
      });
      return;
    }

    // Force release the conch
    await this.releaseConch(session, 'host-forced');
    console.log(`[CallEngineV2] Host force-released conch`);
  }

  /**
   * Handle video toggle for a participant
   */
  private async handleToggleVideo(payload: any, userId: string) {
    const { callId, enabled } = payload;
    
    const session = this.activeSessions.get(callId);
    if (!session) {
      throw new Error('Session not found');
    }

    const participant = session.participants.get(userId);
    if (!participant) {
      throw new Error('Participant not found in session');
    }

    // Update participant's video state
    participant.hasVideo = enabled;

    // Update database
    await this.storage.updateCallParticipantV2ByUserAndCall(userId, callId, {
      hasVideo: enabled
    });

    // Notify all participants
    this.broadcastToSession(session.sessionCode, {
      type: 'participant:video_toggled',
      payload: {
        userId,
        callId,
        hasVideo: enabled
      }
    });

    console.log(`[CallEngineV2] User ${userId} toggled video: ${enabled}`);
  }

  /**
   * Handle audio toggle for a participant
   */
  private async handleToggleAudio(payload: any, userId: string) {
    const { callId, enabled } = payload;
    
    const session = this.activeSessions.get(callId);
    if (!session) {
      throw new Error('Session not found');
    }

    const participant = session.participants.get(userId);
    if (!participant) {
      throw new Error('Participant not found in session');
    }

    // Update participant's audio state
    participant.isMuted = !enabled;

    // Update database
    await this.storage.updateCallParticipantV2ByUserAndCall(userId, callId, {
      isMuted: !enabled
    });

    // Notify all participants
    this.broadcastToSession(session.sessionCode, {
      type: 'participant:audio_toggled',
      payload: {
        userId,
        callId,
        isMuted: !enabled
      }
    });

    console.log(`[CallEngineV2] User ${userId} toggled audio: ${enabled}`);
  }
}