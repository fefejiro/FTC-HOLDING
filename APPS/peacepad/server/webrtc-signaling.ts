import { WebSocketServer, WebSocket } from "ws";
import { type Server } from "http";
import { parse } from "url";
import { type IncomingMessage } from "http"; // Import IncomingMessage type
import type { RequestHandler } from "express";
import { resolveGuestIdentity, trackUsage } from "./softAuth";
import { sendPushNotification } from "./push-notifications";
import { storage } from "./storage";
import { CallEngineV2 } from "./call-engine-v2/CallEngineV2";
import {
  isLegacyCallingEnabled,
  isLegacyCallingMessageType,
} from "./lib/callingSecurity";
import { config } from "./config";

interface Client {
  ws: WebSocket;
  sessionId: string;
  userId: string;
  connectionId: string;
  callSessionCode?: string; // Track which call session the user is in
  pingInterval?: NodeJS.Timeout; // Keepalive ping timer
}

type SignalEnvelope = {
  type: "offer" | "answer" | "ice-candidate";
  from: string;
  to?: string;                 // legacy: userId
  toConnectionId?: string;     // new: precise socket
  payload: any;
  sessionCode?: string;
};

const clients = new Map<string, Client>();
const callSessions = new Map<string, Set<string>>(); // sessionCode -> Set of connectionIds

// Initialize V2 Call Engine
const callEngineV2 = new CallEngineV2(storage);

// Export for use in routes (registering legacy-created sessions)
export { callEngineV2 };

const sessionDebug = new Map<string, {
  offers: number; answers: number; candidates: number;
  lastTo: string[]; lastToConn: string[];
}>();

function bumpSessionDebug(code?: string, kind?: "offer"|"answer"|"ice-candidate", to?: string, toConn?: string) {
  if (!code) return;
  const s = sessionDebug.get(code) ?? {offers:0,answers:0,candidates:0,lastTo:[],lastToConn:[]};
  if (kind === "offer") s.offers++;
  if (kind === "answer") s.answers++;
  if (kind === "ice-candidate") s.candidates++;
  if (to) s.lastTo = [...s.lastTo.slice(-4), to];
  if (toConn) s.lastToConn = [...s.lastToConn.slice(-4), toConn];
  sessionDebug.set(code, s);
}

// Safe WebSocket send with error handling and retry
function safeSend(ws: WebSocket, payload: any, context: string, retryOnce: boolean = false): boolean {
  if (ws.readyState !== WebSocket.OPEN) {
    console.warn(`[safeSend] ${context}: WebSocket not open (state: ${ws.readyState})`);
    return false;
  }

  try {
    const data = JSON.stringify(payload);
    ws.send(data);
    console.log(`[safeSend] ${context}: Message sent successfully`);
    return true;
  } catch (error) {
    console.error(`[safeSend] ${context}: Send failed:`, error);
    
    // Retry once if requested
    if (retryOnce && ws.readyState === WebSocket.OPEN) {
      try {
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(payload));
            console.log(`[safeSend] ${context}: Retry successful`);
          }
        }, 100);
      } catch (retryError) {
        console.error(`[safeSend] ${context}: Retry failed:`, retryError);
      }
    }
    
    return false;
  }
}

export async function broadcastNewMessage(messageId: string, senderId: string, senderName: string, content: string, conversationId: string) {
  // CRITICAL: Only send to conversation members (privacy/security)
  const members = await storage.getConversationMembers(conversationId);
  const memberUserIds = new Set(members.map(m => m.userId));

  clients.forEach((client) => {
    // Only send to clients who are members of this conversation
    if (memberUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ 
        type: "new-message",
        messageId,
        senderId,
        senderName,
        content,
        conversationId,
      }));
    }
  });
}

export function notifyPartnershipJoin(userId: string, partnerName: string) {
  console.log(`[notifyPartnershipJoin] Notifying user ${userId} about partnership with ${partnerName}`);
  console.log(`[notifyPartnershipJoin] Active WebSocket clients: ${clients.size}`);
  
  let notified = false;
  clients.forEach((client) => {
    console.log(`[notifyPartnershipJoin] Checking client: ${client.userId} (state: ${client.ws.readyState})`);
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      console.log(`[notifyPartnershipJoin] ✅ Sending notification to ${userId}`);
      client.ws.send(JSON.stringify({
        type: "partnership-joined",
        partnerName: partnerName
      }));
      notified = true;
    }
  });
  
  if (!notified) {
    console.log(`[notifyPartnershipJoin] ⚠️ User ${userId} not found in active WebSocket clients`);
  }
}

export function notifyPartnershipDeleted(userId: string, partnershipId: string, deletedByName: string) {
  console.log(`[notifyPartnershipDeleted] Notifying user ${userId} about partnership ${partnershipId} deletion by ${deletedByName}`);
  console.log(`[notifyPartnershipDeleted] Active WebSocket clients: ${clients.size}`);
  
  let notified = false;
  clients.forEach((client) => {
    console.log(`[notifyPartnershipDeleted] Checking client: ${client.userId} (state: ${client.ws.readyState})`);
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      console.log(`[notifyPartnershipDeleted] ✅ Sending notification to ${userId}`);
      client.ws.send(JSON.stringify({
        type: "partnership-deleted",
        partnershipId: partnershipId,
        deletedByName: deletedByName
      }));
      notified = true;
    }
  });
  
  if (!notified) {
    console.log(`[notifyPartnershipDeleted] ⚠️ User ${userId} not found in active WebSocket clients`);
  }
}

export async function broadcastNoteUpdate(partnershipId: string, action: 'created' | 'updated' | 'deleted', actorId: string, noteTitle?: string) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) return;
  
  const actor = await storage.getUser(actorId);
  const actorName = actor?.displayName || 'Your co-parent';
  
  const userIds = [partnership.user1Id, partnership.user2Id];
  
  clients.forEach((client) => {
    if (userIds.includes(client.userId) && client.userId !== actorId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "note-updated",
        action,
        actorName,
        noteTitle: noteTitle || 'a note'
      }));
    }
  });
}

export async function broadcastSafetyPlanUpdate(userId: string, action: 'created' | 'updated' | 'deleted') {
  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "safety-plan-updated",
        action
      }));
    }
  });
}

export async function broadcastProfileUpdate(partnershipId: string, actorId: string, changes: { displayName?: string; profileImageUrl?: string }) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) return;
  
  const actor = await storage.getUser(actorId);
  const actorName = actor?.displayName || 'Your co-parent';
  
  const userIds = [partnership.user1Id, partnership.user2Id];
  
  clients.forEach((client) => {
    if (userIds.includes(client.userId) && client.userId !== actorId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "profile-updated",
        actorId,
        actorName,
        changes
      }));
    }
  });
}

export async function broadcastCalendarConflict(partnershipId: string, actorId: string, conflictDetails: { eventTitle: string; conflictsWith: string }) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) return;
  
  const userIds = [partnership.user1Id, partnership.user2Id];
  
  clients.forEach((client) => {
    if (userIds.includes(client.userId) && client.userId !== actorId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "calendar-conflict",
        ...conflictDetails
      }));
    }
  });
}

// Notify caller that their call was successfully created (V2 engine needs this)
export async function notifyCallerAccepted(callerId: string, callId: string, sessionCode: string) {
  console.log(`[notifyCallerAccepted] ======================================`);
  console.log("[notifyCallerAccepted] Sending accepted-call notification");
  
  let notified = false;
  clients.forEach((client) => {
    if (client.userId === callerId && client.ws.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'call-accepted',
        callId,
        sessionCode,
        role: 'caller'
      };
      
      console.log(`[notifyCallerAccepted] Sending call-accepted to ${client.connectionId}`);
      safeSend(client.ws, payload, client.connectionId);
      notified = true;
    }
  });
  
  if (notified) {
    console.log(`[notifyCallerAccepted] ✅ Notified caller ${callerId}`);
  } else {
    console.log(`[notifyCallerAccepted] ⚠️ Could not notify caller ${callerId} - no active connections`);
  }
  
  return notified;
}

// Direct calling system notifications
export async function notifyIncomingCall(receiverId: string, callId: string, callerId: string, callType: 'audio' | 'video', isScheduled: boolean = false) {
  console.log(`[notifyIncomingCall] ======================================`);
  console.log(`[notifyIncomingCall] Attempting to notify ${receiverId} of call ${callId} from ${callerId}`);
  console.log(`[notifyIncomingCall] Total active WebSocket clients: ${clients.size}`);
  let notified = false;

  // Get caller info
  const caller = await storage.getUser(callerId);
  const callerName = caller?.displayName || caller?.firstName || 'Someone';
  const callerProfileImageUrl = caller?.profileImageUrl;

  // Get call details (reason, isEmergency, sessionCode)
  const call = await storage.getCall(callId);
  const reason = call?.reason;
  const isEmergency = call?.isEmergency || false;
  
  // Fetch sessionCode from linked CallSession (critical for WebRTC join)
  let sessionCode: string | undefined;
  if (call?.sessionId) {
    const session = await storage.getCallSessionById(call.sessionId);
    sessionCode = session?.sessionCode;
    console.log("[notifyIncomingCall] Call session resolved");
  } else {
    console.warn("[notifyIncomingCall] Incoming call has no session (legacy call)");
  }

  // Notify all active connections for the receiver
  let activeConnections = 0;
  clients.forEach((client) => {
    if (client.userId === receiverId) {
      activeConnections++;
      console.log("[notifyIncomingCall] Found receiver connection");
      
      const notificationPayload = {
        type: "incoming-call",
        callId,
        callerId,
        callerName,
        callerProfileImageUrl,
        callType,
        isScheduled,
        reason,
        isEmergency,
        sessionCode  // Critical: enables callee to join WebRTC session before answering
      };
      
      const sent = safeSend(
        client.ws,
        notificationPayload,
        `incoming-call to ${receiverId} (${client.connectionId})`,
        true // retry once
      );
      
      if (sent) {
        console.log("[notifyIncomingCall] Sent realtime incoming-call notification");
        notified = true;
      } else {
        console.log("[notifyIncomingCall] Failed to send realtime incoming-call notification");
      }
    }
  });

  console.log(
    `[notifyIncomingCall] Active receiver connections: ${activeConnections}; notified: ${notified}`,
  );

  // Always send push notification for incoming calls (rings phone even if app is in background)
  try {
    console.log("[notifyIncomingCall] Sending generic push notification");
    await sendPushNotification(receiverId, {
      title: isEmergency ? 'Emergency PeacePad call' : 'Incoming PeacePad call',
      body: "Open PeacePad to review the incoming call.",
      channel: 'conch', // High priority channel for calls
      data: {
        type: 'incoming-call',
        callId,
        callerId,
        callType,
        isEmergency,
        sessionCode,  // Critical: enables callee to join WebRTC session from push notification
      },
    });
  } catch (error) {
    console.error('Failed to send push notification for incoming call:', error);
  }
}

export function notifyCallAccepted(call: any) {
  const callerId = call.callerId;
  const calleeId = call.receiverId;
  const { id: callId, sessionCode } = call;

  console.log('[notifyCallAccepted] ======================================');
  console.log('[notifyCallAccepted] Broadcasting call-accepted to BOTH users:', {
    callId,
    callerId,
    calleeId,
    sessionCode
  });
  console.log(`[notifyCallAccepted] Total active clients: ${clients.size}`);

  let notifiedCaller = 0;
  let notifiedCallee = 0;

  clients.forEach((client) => {
    if (client.ws.readyState !== WebSocket.OPEN) return;

    if (client.userId === callerId || client.userId === calleeId) {
      const message = {
        type: "call-accepted",
        callId,
        sessionCode,
        acceptedBy: calleeId,
      };

      const result = safeSend(
        client.ws,
        message,
        `call-accepted to ${client.userId} (${client.connectionId})`,
        true // retry once
      );

      if (result) {
        if (client.userId === callerId) {
          notifiedCaller++;
          console.log(`[notifyCallAccepted] ✅ Notified CALLER ${callerId} (${client.connectionId})`);
        }
        if (client.userId === calleeId) {
          notifiedCallee++;
          console.log(`[notifyCallAccepted] ✅ Notified CALLEE ${calleeId} (${client.connectionId})`);
        }
      }
    }
  });

  console.log(`[notifyCallAccepted] Notified caller connections: ${notifiedCaller}`);
  console.log(`[notifyCallAccepted] Notified callee connections: ${notifiedCallee}`);
  
  if (notifiedCaller === 0) {
    console.warn(`[notifyCallAccepted] ⚠️ Failed to notify caller ${callerId}`);
  }
  if (notifiedCallee === 0) {
    console.warn(`[notifyCallAccepted] ⚠️ Failed to notify callee ${calleeId}`);
  }
}

export function notifyCallDeclined(callerId: string, callId: string, receiverId: string, reason?: string) {
  clients.forEach((client) => {
    if (client.userId === callerId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "call-declined",
        callId,
        receiverId,
        reason
      }));
    }
  });
}

export function notifyCallEnded(userId: string, callId: string, endedBy: string) {
  clients.forEach((client) => {
    if (client.userId === userId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "call-ended",
        callId,
        endedBy
      }));
    }
  });
}

// Message delivery status notifications (WhatsApp-style)
export function broadcastMessageDelivered(messageId: string, recipientId: string) {
  clients.forEach((client) => {
    if (client.userId === recipientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ 
        type: "message-delivered",
        messageId,
      }));
    }
  });
}

export function broadcastMessageRead(messageId: string, senderId: string) {
  clients.forEach((client) => {
    if (client.userId === senderId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ 
        type: "message-read",
        messageId,
      }));
    }
  });
}

export async function broadcastMessageToneUpdate(
  messageId: string, 
  conversationId: string,
  toneData: {
    tone: string;
    toneSummary: string;
    toneEmoji: string | null;
    rewordingSuggestion: string | null;
  }
) {
  const members = await storage.getConversationMembers(conversationId);
  const memberUserIds = new Set(members.map(m => m.userId));

  clients.forEach((client) => {
    if (memberUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ 
        type: "message-tone-updated",
        messageId,
        conversationId,
        ...toneData,
      }));
    }
  });
}

// Real-time sync notifications for tasks, expenses, and schedule
export function broadcastTaskUpdate(actorId?: string) {
  clients.forEach((client) => {
    // Skip the actor who made the change to avoid echo
    if (client.userId !== actorId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type: "task-updated" }));
    }
  });
}

export function broadcastExpenseUpdate(actorId?: string) {
  clients.forEach((client) => {
    if (client.userId !== actorId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type: "expense-updated" }));
    }
  });
}

export function broadcastScheduleUpdate(actorId?: string) {
  clients.forEach((client) => {
    if (client.userId !== actorId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({ type: "schedule-updated" }));
    }
  });
}

// Conch Mode session broadcasting functions
export async function broadcastConchSessionCreated(sessionId: string, partnershipId: string, initiatorUserId: string) {
  // Get partnership members for scoped filtering
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastConchSessionCreated] Partnership ${partnershipId} not found`);
    return;
  }

  const partnershipUserIds = new Set([partnership.user1Id, partnership.user2Id]);
  
  // Get initiator info for notification
  const initiator = await storage.getUser(initiatorUserId);
  const initiatorName = initiator?.displayName || 'Your co-parent';
  const initiatorProfileImage = initiator?.profileImageUrl || null;

  clients.forEach((client) => {
    if (partnershipUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:session_created",
        sessionId,
        initiatorUserId,
        initiatorName,
        initiatorProfileImage,
        partnershipId,
      }));
    }
  });
  
  // Send push notification to partner with Accept/Decline actions
  const partnerId = partnership.user1Id === initiatorUserId ? partnership.user2Id : partnership.user1Id;
  await sendPushNotification(partnerId, {
    title: 'Conch Session Invitation',
    body: "Open PeacePad to review a structured-conversation invitation.",
    channel: 'conch', // High priority channel for Conch Mode
    data: {
      url: '/conch-mode',
      sessionId,
      partnershipId,
      initiatorUserId,
      type: 'conch_session_invitation',
    },
    actions: [
      { action: 'accept_conch', title: 'Accept' },
      { action: 'decline_conch', title: 'Decline' }
    ],
  });
}

export async function broadcastConchSessionJoined(sessionId: string, partnershipId: string, joinerUserId: string) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastConchSessionJoined] Partnership ${partnershipId} not found`);
    return;
  }

  const partnershipUserIds = new Set([partnership.user1Id, partnership.user2Id]);

  clients.forEach((client) => {
    if (partnershipUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:session_joined",
        sessionId,
        joinerUserId,
      }));
    }
  });
}

export async function broadcastConchStateSync(
  sessionId: string,
  partnershipId: string,
  state: { conchHolderUserId: string; currentTurnEndsAt: Date; status: string }
) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastConchStateSync] Partnership ${partnershipId} not found`);
    return;
  }

  const partnershipUserIds = new Set([partnership.user1Id, partnership.user2Id]);

  clients.forEach((client) => {
    if (partnershipUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:state_sync",
        sessionId,
        conchHolderUserId: state.conchHolderUserId,
        currentTurnEndsAt: state.currentTurnEndsAt,
        status: state.status,
      }));
    }
  });
}

export async function broadcastConchPassed(sessionId: string, partnershipId: string, newHolderUserId: string, currentTurnEndsAt: Date) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastConchPassed] Partnership ${partnershipId} not found`);
    return;
  }

  const partnershipUserIds = new Set([partnership.user1Id, partnership.user2Id]);

  clients.forEach((client) => {
    if (partnershipUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:pass",
        sessionId,
        newHolderUserId,
        currentTurnEndsAt,
      }));
    }
  });
  
  // Send push notification to new holder (your turn!)
  await sendPushNotification(newHolderUserId, {
    title: 'Your Turn in Conch Mode',
    body: 'The conch has been passed to you. It\'s your turn to speak.',
    channel: 'conch', // High priority for turn notifications
    data: {
      url: '/conch-mode',
      sessionId,
      partnershipId,
      type: 'conch_your_turn',
    },
  });
}

export async function broadcastConchStrikeApplied(
  sessionId: string,
  partnershipId: string,
  targetUserId: string,
  strikeCount: number
) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastConchStrikeApplied] Partnership ${partnershipId} not found`);
    return;
  }

  const partnershipUserIds = new Set([partnership.user1Id, partnership.user2Id]);

  clients.forEach((client) => {
    if (partnershipUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:strike_applied",
        sessionId,
        targetUserId,
        strikeCount,
      }));
    }
  });
}

export async function broadcastConchExtraTimeRequest(
  sessionId: string,
  partnershipId: string,
  requesterUserId: string,
  seconds: number
) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastConchExtraTimeRequest] Partnership ${partnershipId} not found`);
    return;
  }

  const partnershipUserIds = new Set([partnership.user1Id, partnership.user2Id]);

  clients.forEach((client) => {
    if (partnershipUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:extra_time_request",
        sessionId,
        requesterUserId,
        seconds,
      }));
    }
  });
  
  // Send push notification to partner (the one who can approve)
  const partnerId = partnership.user1Id === requesterUserId ? partnership.user2Id : partnership.user1Id;
  await sendPushNotification(partnerId, {
    title: 'Extra Time Requested',
    body: "Open PeacePad to review a structured-conversation request.",
    channel: 'conch', // Conch Mode notifications
    data: {
      url: '/conch-mode',
      sessionId,
      partnershipId,
      type: 'conch_extra_time_request',
    },
  });
}

export async function broadcastConchExtraTimeResponse(sessionId: string, partnershipId: string, approved: boolean, seconds: number = 0) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastConchExtraTimeResponse] Partnership ${partnershipId} not found`);
    return;
  }

  const partnershipUserIds = new Set([partnership.user1Id, partnership.user2Id]);

  clients.forEach((client) => {
    if (partnershipUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:extra_time_response",
        sessionId,
        approved,
        seconds,
      }));
    }
  });
}

export async function broadcastConchReaction(sessionId: string, partnershipId: string, emoji: string, senderName: string, senderId: string) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastConchReaction] Partnership ${partnershipId} not found`);
    return;
  }

  const partnershipUserIds = new Set([partnership.user1Id, partnership.user2Id]);

  clients.forEach((client) => {
    if (partnershipUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:reaction",
        sessionId,
        emoji,
        senderName,
        senderId,
      }));
    }
  });
}

export async function broadcastAIIntervention(
  sessionId: string,
  partnershipId: string,
  interventionType: 'tone_alert' | 'empathy_nudge' | 'conflict_detected' | 'communication_tip',
  message: string,
  suggestion?: string,
  severity?: 'low' | 'medium' | 'high',
  targetUserId?: string
) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastAIIntervention] Partnership ${partnershipId} not found`);
    return;
  }

  const partnershipUserIds = new Set([partnership.user1Id, partnership.user2Id]);

  clients.forEach((client) => {
    // Send to target user only, or both if no target specified
    const shouldSend = targetUserId 
      ? client.userId === targetUserId 
      : partnershipUserIds.has(client.userId);

    if (shouldSend && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:ai_intervention",
        sessionId,
        interventionType,
        message,
        suggestion,
        severity,
      }));
    }
  });
}

export async function broadcastTurnSummary(
  sessionId: string,
  partnershipId: string,
  speakerUserId: string,
  summary: {
    keyPoints: string[];
    unaddressedConcerns: string[];
    overallSentiment: string;
    counselorNote: string;
  }
) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastTurnSummary] Partnership ${partnershipId} not found`);
    return;
  }

  const partnershipUserIds = new Set([partnership.user1Id, partnership.user2Id]);

  clients.forEach((client) => {
    if (partnershipUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:turn_summary",
        sessionId,
        speakerUserId,
        summary,
      }));
    }
  });
}

export async function broadcastConchSessionEnded(sessionId: string, partnershipId: string) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastConchSessionEnded] Partnership ${partnershipId} not found`);
    return;
  }

  const partnershipUserIds = new Set([partnership.user1Id, partnership.user2Id]);

  clients.forEach((client) => {
    if (partnershipUserIds.has(client.userId) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:session_ended",
        sessionId,
      }));
    }
  });
}

export async function broadcastConchInviteDeclined(sessionId: string, partnershipId: string, initiatorUserId: string, declinerName: string) {
  const partnership = await storage.getPartnership(partnershipId);
  if (!partnership) {
    console.warn(`[broadcastConchInviteDeclined] Partnership ${partnershipId} not found`);
    return;
  }

  // Only notify the initiator
  clients.forEach((client) => {
    if (client.userId === initiatorUserId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify({
        type: "conch:invite_declined",
        sessionId,
        declinerName,
      }));
    }
  });

  // Also send push notification to initiator
  await sendPushNotification(initiatorUserId, {
    title: 'Conch Invite Declined',
    body: "Open PeacePad to review a structured-conversation update.",
    channel: 'conch', // Conch Mode notifications
    data: {
      type: 'conch_invite_declined',
      sessionId,
    },
  });
}

type RealtimeRequest = IncomingMessage & {
  session?: {
    userId?: string;
    sessionId?: string;
    passport?: {
      user?: unknown;
    };
  };
  sessionID?: string;
  user?: unknown;
  realtimeIdentity?: {
    userId: string;
    sessionId: string;
  };
};

function readSessionUserId(request: RealtimeRequest): string | null {
  const directUserId = request.session?.userId;
  if (typeof directUserId === "string" && directUserId.length > 0) {
    return directUserId;
  }

  const passportUser = request.session?.passport?.user;
  if (typeof passportUser === "string" && passportUser.length > 0) {
    return passportUser;
  }
  if (passportUser && typeof passportUser === "object") {
    const candidate = passportUser as {
      id?: unknown;
      claims?: { sub?: unknown };
    };
    if (typeof candidate.claims?.sub === "string" && candidate.claims.sub.length > 0) {
      return candidate.claims.sub;
    }
    if (typeof candidate.id === "string" && candidate.id.length > 0) {
      return candidate.id;
    }
  }

  return null;
}

function isAllowedRealtimeOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return process.env.NODE_ENV !== "production";
  }

  try {
    const normalized = new URL(origin).origin.toLowerCase();
    return config.cors.allowedOrigins.some((allowedOrigin) => {
      if (!allowedOrigin || allowedOrigin === "*") {
        return allowedOrigin === "*" && process.env.NODE_ENV !== "production";
      }
      try {
        return new URL(allowedOrigin).origin.toLowerCase() === normalized;
      } catch {
        return allowedOrigin.toLowerCase() === normalized;
      }
    });
  } catch {
    return false;
  }
}

async function resolveRealtimeIdentity(
  request: RealtimeRequest,
  sessionMiddleware: RequestHandler | undefined,
): Promise<{ userId: string; sessionId: string } | null> {
  if (!sessionMiddleware) {
    return null;
  }

  const sessionLoaded = await new Promise<boolean>((resolve) => {
    const responseShim = {
      getHeader: () => undefined,
      setHeader: () => undefined,
      end: () => undefined,
    };
    sessionMiddleware(request as any, responseShim as any, (error?: unknown) => {
      resolve(!error);
    });
  });
  if (!sessionLoaded) {
    return null;
  }

  const guestIdentity = await resolveGuestIdentity(request, { allowExpired: false });
  const userId = guestIdentity?.session?.userId || readSessionUserId(request);
  if (typeof userId !== "string" || userId.length === 0) {
    return null;
  }

  const sessionId =
    guestIdentity?.session?.sessionId ||
    request.session?.sessionId ||
    request.sessionID ||
    userId;
  return { userId, sessionId };
}

export function setupWebRTCSignaling(
  server: Server,
  options: { sessionMiddleware?: RequestHandler } = {},
) {
  const wss = new WebSocketServer({
    server,
    path: '/ws/signaling',
    // Signaling messages are small. A narrow limit reduces memory-exhaustion
    // risk and prevents this channel from becoming an upload transport.
    maxPayload: 64 * 1024,
    clientTracking: true,
    verifyClient: (info, done) => {
      const request = info.req as RealtimeRequest;
      if (!isAllowedRealtimeOrigin(info.origin)) {
        done(false, 403, "Origin not allowed");
        return;
      }

      resolveRealtimeIdentity(request, options.sessionMiddleware)
        .then((identity) => {
          if (!identity) {
            done(false, 401, "Authentication required");
            return;
          }
          request.realtimeIdentity = identity;
          done(true);
        })
        .catch(() => done(false, 401, "Authentication required"));
    },
  });

  // Connection limit per user to prevent leaks
  const userConnectionCount = new Map<string, number>();
  const MAX_CONNECTIONS_PER_USER = 3;
  let connectionCount = 0; // Track total active connections

  wss.on("connection", (ws: WebSocket, request: IncomingMessage) => {
    connectionCount++;
    console.log(`[WS] New connection (total: ${connectionCount})`);

    const identity = (request as RealtimeRequest).realtimeIdentity;
    const sessionId = identity?.sessionId;
    const userId = identity?.userId;

    if (!sessionId || !userId) {
      ws.close(1008, "Authentication required");
      return;
    }

    // Enforce connection limit per user
    const currentCount = userConnectionCount.get(userId) || 0;
    if (currentCount >= MAX_CONNECTIONS_PER_USER) {
      console.warn(`User ${userId} exceeded connection limit (${MAX_CONNECTIONS_PER_USER})`);
      ws.close(1008, 'Too many connections');
      return;
    }
    userConnectionCount.set(userId, currentCount + 1);

    // Use unique connection ID to allow multiple connections per user
    const connectionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const client: Client = { ws, sessionId, userId, connectionId };
    clients.set(connectionId, client);

    console.log(`WebRTC client connected: ${userId} (${connectionId})`);
    
    // Register with V2 Call Engine
    callEngineV2.registerConnection(userId, ws, connectionId);

    // Keepalive ping/pong to prevent mobile network timeouts
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 30000); // Ping every 30 seconds
    client.pingInterval = pingInterval;

    // Handle pong responses
    ws.on('pong', () => {
      // Connection is alive - no action needed, just log for debugging
      console.log(`[Keepalive] Pong received from ${userId} (${connectionId})`);
    });

    // Track recent messages to prevent duplicate processing
    const recentMessages = new Map<string, number>();
    const MESSAGE_DEDUP_WINDOW = 1000; // 1 second deduplication window
    
    ws.on("message", async (data: Buffer) => {
      try {
        const rawMessage = data.toString();
        
        // Validate message size
        if (rawMessage.length > 1024 * 1024) { // 1MB limit per message
          console.error(`[WS] Message too large from ${userId}: ${rawMessage.length} bytes`);
          return;
        }
        
        let message;
        try {
          message = JSON.parse(rawMessage);
        } catch (parseError) {
          console.error(`[WS] Invalid JSON from ${userId}:`, parseError);
          ws.send(JSON.stringify({ 
            type: 'error', 
            error: 'Invalid JSON format' 
          }));
          return;
        }
        
        // Validate message structure
        if (!message || typeof message !== 'object') {
          console.error(`[WS] Invalid message structure from ${userId}`);
          return;
        }
        
        const { type, to, payload, sessionCode: msgSessionCode } = message;
        
        // Validate message type
        if (!type || typeof type !== 'string') {
          console.error(`[WS] Missing or invalid message type from ${userId}`);
          return;
        }

        if (!isLegacyCallingEnabled() && isLegacyCallingMessageType(type)) {
          ws.send(JSON.stringify({
            type: "feature-unavailable",
            feature: "calls",
          }));
          return;
        }
        
        // Check for duplicate messages (especially important for offer/answer)
        if (type === 'offer' || type === 'answer' || type === 'ice-candidate') {
          const messageHash = `${type}-${to || 'broadcast'}-${JSON.stringify(payload || {})}`;
          const lastSent = recentMessages.get(messageHash);
          const now = Date.now();
          
          if (lastSent && now - lastSent < MESSAGE_DEDUP_WINDOW) {
            console.warn(`[WS] Duplicate ${type} ignored from ${userId} (within ${MESSAGE_DEDUP_WINDOW}ms window)`);
            return;
          }
          
          recentMessages.set(messageHash, now);
          
          // Clean up old message hashes periodically
          if (recentMessages.size > 100) {
            Array.from(recentMessages.entries()).forEach(([hash, timestamp]) => {
              if (now - timestamp > MESSAGE_DEDUP_WINDOW * 2) {
                recentMessages.delete(hash);
              }
            });
          }
        }

        // CRITICAL FIX: Handle heartbeat messages to detect stale connections
        if (type === 'heartbeat' || type === 'ping') {
          // Update heartbeat timestamp in CallEngineV2
          callEngineV2.updateHeartbeat(connectionId);
          // Send heartbeat response
          ws.send(JSON.stringify({ type: 'heartbeat-ack', timestamp: Date.now() }));
          return;
        }

        // Handle V2 messages separately
        if (type.startsWith('v2:')) {
          console.log(`[WS] ✉️  V2 message received: ${type} from ${userId} (${connectionId})`);
          // Update heartbeat on any V2 message
          callEngineV2.updateHeartbeat(connectionId);
          
          // Strip the v2: prefix before passing to CallEngineV2
          const v2Message = {
            ...message,
            type: type.substring(3) // Remove 'v2:' prefix
          };
          
          // Route V2 messages to the CallEngineV2
          callEngineV2.handleEvent(v2Message, userId, connectionId);
          return;
        }

        // Log ALL non-V2, non-heartbeat messages for debugging
        console.log(`[WS] 📨 Message received: type="${type}" from userId=${userId} connectionId=${connectionId}`);

        switch (type) {
          case "join-session":
            console.log("[WS] Processing authenticated call-session join");
            // User joins a call session
            const callSessionCode = payload.sessionCode;
            client.callSessionCode = callSessionCode;

            if (!callSessions.has(callSessionCode)) {
              callSessions.set(callSessionCode, new Set());
            }
            callSessions.get(callSessionCode)!.add(connectionId);

            console.log(`User ${userId} joined call session ${callSessionCode}`);

            // Notify all other users in the session
            const sessionClients = callSessions.get(callSessionCode);
            console.log(`[JOIN-SESSION] 👥 Session ${callSessionCode} has ${sessionClients?.size || 0} total users`);
            
            let peerJoinedSent = 0;
            if (sessionClients) {
              sessionClients.forEach((clientId) => {
                const otherClient = clients.get(clientId);
                console.log(`[JOIN-SESSION] 🔍 Checking client ${clientId}: exists=${!!otherClient}, isNotMe=${otherClient?.connectionId !== connectionId}, readyState=${otherClient?.ws.readyState}`);
                
                if (otherClient && otherClient.connectionId !== connectionId && otherClient.ws.readyState === WebSocket.OPEN) {
                  const peerJoinedMsg = {
                    type: "peer-joined",
                    from: userId,
                    payload: { userId },
                  };
                  otherClient.ws.send(JSON.stringify(peerJoinedMsg));
                  peerJoinedSent++;
                  console.log(`[JOIN-SESSION] ✅ Sent peer-joined to ${otherClient.userId} (${otherClient.connectionId})`);
                }
              });
            }
            console.log(`[JOIN-SESSION] 📤 Total peer-joined messages sent: ${peerJoinedSent}`);

            // Send list of existing users in session to the new joiner
            if (sessionClients) {
              const existingUsers = Array.from(sessionClients)
                .map(id => clients.get(id))
                .filter(c => c && c.connectionId !== connectionId)
                .map(c => ({ userId: c!.userId, connectionId: c!.connectionId }));

              console.log(`[JOIN-SESSION] 📋 Sending session-users to NEW joiner ${userId}. Existing users:`, existingUsers);
              
              const sessionUsersMsg = {
                type: "session-users",
                payload: { users: existingUsers },
              };
              ws.send(JSON.stringify(sessionUsersMsg));
              console.log(`[JOIN-SESSION] ✅ Sent session-users message to ${userId}`);
            }
            console.log(`[Session] ${userId} joined ${callSessionCode}. Now in room: ${Array.from(callSessions.get(callSessionCode) ?? []).length}`);
            break;

          case "offer":
          case "answer":
          case "ice-candidate":
          {
            const msg = message as SignalEnvelope;
            const targetConnId = msg.toConnectionId;
            const targetUserId  = msg.to;
            const code = msg.sessionCode ?? client.callSessionCode;

            bumpSessionDebug(code, type, targetUserId, targetConnId);

            // Prefer connection-directed delivery (exact socket)
            let delivered = 0;
            if (targetConnId) {
              const t = clients.get(targetConnId);
              if (t && t.ws.readyState === WebSocket.OPEN) {
                t.ws.send(JSON.stringify({ type, from: client.userId, payload: msg.payload, sessionCode: code }));
                delivered++;
              }
            }

            // Fallback: deliver to all of target user's sockets *in the same session*
            if (!delivered && targetUserId) {
              clients.forEach((c) => {
                if (
                  c.userId === targetUserId &&
                  c.ws.readyState === WebSocket.OPEN &&
                  (!code || c.callSessionCode === code)
                ) {
                  c.ws.send(JSON.stringify({ type, from: client.userId, payload: msg.payload, sessionCode: code }));
                  delivered++;
                }
              });
            }

            console.log(`[Signal][${type}] ${client.userId} -> ${targetConnId ?? targetUserId ?? "?"} (session ${code ?? "n/a"}), delivered=${delivered}`);
            if (delivered === 0) {
              console.warn(`[Signal][${type}] DROPPED: no live target (code=${code}, toConn=${targetConnId}, toUser=${targetUserId})`);
            }
            break;
          }

          case "call-start":
            await trackUsage(sessionId, "callsInitiated", 1);

            // DEPRECATED: This legacy "call-start" WebSocket message is no longer used for incoming-call notifications
            // The canonical incoming-call notification is now sent via notifyIncomingCall() from /api/calls POST endpoint
            // This ensures proper callId and sessionCode are always included
            
            // Renamed legacy signal for internal WebRTC coordination only (not for UI notifications)
            if (to) {
              const caller = await storage.getUser(userId);
              const callerName = caller?.displayName || caller?.firstName || 'Someone';
              const callerProfileImageUrl = caller?.profileImageUrl;

              clients.forEach((client) => {
                if (client.userId === to && client.ws.readyState === WebSocket.OPEN) {
                  // Renamed to avoid conflict with canonical incoming-call message
                  client.ws.send(JSON.stringify({
                    type: "webrtc:call-start",
                    from: userId,
                    callType: payload.callType,
                    callerName,
                    callerProfileImageUrl,
                  }));
                  console.log(`[WebRTC] Sent webrtc:call-start signal to ${to} from ${callerName}`);
                }
              });

              // Note: Push notification is handled by notifyIncomingCall() in /api/calls endpoint
              // This ensures sessionCode and callId are included
            }
            break;

          case "call-end":
            // Broadcast call-ended to all session members (symmetric hang-up)
            if (client.callSessionCode) {
              const sessionClients = callSessions.get(client.callSessionCode);
              if (sessionClients) {
                console.log(`[call-end] Broadcasting to ${sessionClients.size} session members`);
                sessionClients.forEach((clientId) => {
                  const otherClient = clients.get(clientId);
                  if (otherClient && otherClient.ws.readyState === WebSocket.OPEN) {
                    otherClient.ws.send(JSON.stringify({
                      type: "call-ended",
                      from: userId,
                      sessionCode: client.callSessionCode,
                    }));
                  }
                });
              }
            }
            // Fallback for 1:1 calls without session (legacy)
            else if (to) {
              clients.forEach((client) => {
                if (client.userId === to && client.ws.readyState === WebSocket.OPEN) {
                  client.ws.send(JSON.stringify({
                    type: "call-ended",
                    from: userId,
                  }));
                }
              });
            }
            break;

          case "leave-session":
            // User leaves a call session
            if (client.callSessionCode) {
              const sessionClients = callSessions.get(client.callSessionCode);
              if (sessionClients) {
                sessionClients.delete(connectionId);

                // Notify others in session
                sessionClients.forEach((clientId) => {
                  const otherClient = clients.get(clientId);
                  if (otherClient && otherClient.ws.readyState === WebSocket.OPEN) {
                    otherClient.ws.send(JSON.stringify({
                      type: "peer-left",
                      from: userId,
                    }));
                  }
                });

                // Clean up empty sessions
                if (sessionClients.size === 0) {
                  callSessions.delete(client.callSessionCode);
                }
              }
              client.callSessionCode = undefined;
            }
            break;

          case "ai-consent":
            // Broadcast AI listening consent status to all users in the same call session
            if (client.callSessionCode) {
              const sessionClients = callSessions.get(client.callSessionCode);
              if (sessionClients) {
                sessionClients.forEach((clientId) => {
                  const otherClient = clients.get(clientId);
                  // Send to all OTHER clients in the session (not the sender)
                  if (otherClient && otherClient.connectionId !== connectionId && otherClient.ws.readyState === WebSocket.OPEN) {
                    otherClient.ws.send(JSON.stringify({
                      type: "ai-consent",
                      from: userId,
                      payload: payload,
                    }));
                  }
                });
              }
            }
            break;

          default:
            // Route v2: prefixed messages to CallEngineV2
            if (type?.startsWith('v2:')) {
              console.log(`[WS] Routing v2 message to CallEngineV2: ${type}`);
              try {
                await callEngineV2.handleEvent(
                  { type: type as any, payload },
                  userId,
                  connectionId
                );
              } catch (v2Error) {
                console.error('[CallEngineV2] Error handling message:', v2Error);
              }
            } else {
              console.log("Unknown message type:", type);
            }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", async () => {
      console.log(`WebRTC client disconnected: ${userId} (${connectionId})`);
      
      // CRITICAL FIX: Check if user was in active call and end it for ALL participants
      // This prevents the other party staying "on call" when one disconnects
      if (client.callSessionCode) {
        console.log(`[WS_CLOSE] ⚠️ User ${userId} disconnected from active call session ${client.callSessionCode}`);
        
        const sessionClients = callSessions.get(client.callSessionCode);
        if (sessionClients) {
          sessionClients.delete(connectionId);
          
          // If this was a 1-on-1 call and only 1 participant remains, end the call
          if (sessionClients.size === 1) {
            console.log(`[WS_CLOSE] 📵 Only 1 participant left in call - ending call for all`);
            
            // Find the remaining client and notify them the call ended
            sessionClients.forEach((clientId) => {
              const otherClient = clients.get(clientId);
              if (otherClient && otherClient.ws.readyState === WebSocket.OPEN) {
                // Send call-ended notification with network disconnect reason
                otherClient.ws.send(JSON.stringify({
                  type: "call-ended",
                  from: userId,
                  reason: "Network disconnection - other party lost connection",
                  sessionCode: client.callSessionCode,
                }));
                console.log(`[WS_CLOSE] Notified ${otherClient.userId} that call ended due to disconnection`);
              }
            });
            
            // Try to update call status in database (if accessible)
            try {
              // Find call by sessionCode and mark as ended
              const sessions = await storage.getAllCalls();
              const activeCall = sessions.find((s) => s.sessionId && s.status === 'active' && s.sessionId === client.callSessionCode);
              if (activeCall) {
                await storage.updateCall(activeCall.id, {
                  status: 'ended',
                  endedAt: new Date(),
                });
                console.log(`[WS_CLOSE] Updated call ${activeCall.id} status to ended in database`);
              }
            } catch (error) {
              console.error(`[WS_CLOSE] Failed to update call status in database:`, error);
            }
          } else if (sessionClients.size > 1) {
            // Multi-party call - just notify others that peer left
            sessionClients.forEach((clientId) => {
              const otherClient = clients.get(clientId);
              if (otherClient && otherClient.ws.readyState === WebSocket.OPEN) {
                otherClient.ws.send(JSON.stringify({
                  type: "peer-left",
                  from: userId,
                }));
              }
            });
          }
          
          // Clean up empty sessions
          if (sessionClients.size === 0) {
            callSessions.delete(client.callSessionCode);
            console.log(`[WS_CLOSE] Removed empty call session ${client.callSessionCode}`);
          }
        }
      }
      
      // Unregister from V2 Call Engine (will handle V2 call cleanup)
      callEngineV2.unregisterConnection(connectionId);

      // Clear keepalive ping interval
      if (client.pingInterval) {
        clearInterval(client.pingInterval);
        client.pingInterval = undefined;
      }

      // Decrement connection count
      const count = userConnectionCount.get(userId) || 0;
      if (count > 0) {
        userConnectionCount.set(userId, count - 1);
      }

      clients.delete(connectionId);
      connectionCount--;
      console.log(`[WS] User ${userId} disconnected (total: ${connectionCount})`);
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      
      // Unregister from V2 Call Engine
      callEngineV2.unregisterConnection(connectionId);

      // Clear keepalive ping interval
      if (client.pingInterval) {
        clearInterval(client.pingInterval);
        client.pingInterval = undefined;
      }

      // Decrement connection count
      const count = userConnectionCount.get(userId) || 0;
      if (count > 0) {
        userConnectionCount.set(userId, count - 1);
      }

      // Clean up from call session if user was in one
      if (client.callSessionCode) {
        const sessionClients = callSessions.get(client.callSessionCode);
        if (sessionClients) {
          sessionClients.delete(connectionId);
          if (sessionClients.size === 0) {
            callSessions.delete(client.callSessionCode);
          }
        }
      }

      clients.delete(connectionId);
      connectionCount--;
      console.log(`[WS] User ${userId} error (total: ${connectionCount})`);
    });
  });

  console.log("WebRTC signaling server initialized");

  // Periodic health stats logging
  setInterval(() => {
    const summary = Array.from(sessionDebug.entries()).map(([code, s]) =>
      `${code}: O=${s.offers} A=${s.answers} C=${s.candidates}`
    ).join(" | ");
    console.log(`[SignalStats] ${summary || "no sessions"}`);
  }, 60000);
}
