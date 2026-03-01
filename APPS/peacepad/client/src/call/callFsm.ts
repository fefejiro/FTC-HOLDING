/**
 * Call State Machine (FSM)
 * 
 * Deterministic call state management with integrated ringtone control.
 * The FSM is the ONLY place that controls ringtones - no timers, no UI state.
 */

import { startRingtone, stopRingtone, startDialTone, stopDialTone, stopAllAudio, vibrateIncomingCall } from './audio';

/**
 * Call phases (states)
 */
export type CallPhase = 
  | 'idle'         // No active call
  | 'ringing'      // Incoming call ringing
  | 'dialing'      // Outgoing call dialing
  | 'connecting'   // Call accepted, establishing connection
  | 'active'       // Call connected and active
  | 'ended'        // Call ended normally
  | 'missed'       // Incoming call not answered
  | 'declined'     // Call explicitly declined
  | 'failed';      // Call failed to connect

/**
 * Call role - determines WebRTC negotiation behavior
 */
export type CallRole = 'caller' | 'callee' | null;

/**
 * Call data
 */
export interface CallData {
  callId: string;
  callerId?: string;
  calleeId?: string;
  callerName?: string;
  callType: 'audio' | 'video';
  sessionCode?: string;
  autoAccepted?: boolean;
  callRole?: CallRole; // CRITICAL: determines who creates offer vs answer in WebRTC
}

/**
 * Call state
 */
export interface CallState {
  phase: CallPhase;
  call: CallData | null;
  error?: string;
}

/**
 * Call actions
 */
export type CallAction =
  | { type: 'INCOMING_CALL'; call: CallData }
  | { type: 'OUTGOING_CALL'; call: CallData }
  | { type: 'CALL_ACCEPTED'; sessionCode?: string }
  | { type: 'CALL_ACTIVE' }
  | { type: 'CALL_ENDED'; reason?: string }
  | { type: 'CALL_DECLINED' }
  | { type: 'CALL_MISSED' }
  | { type: 'CALL_FAILED'; error: string }
  | { type: 'RESET' };

/**
 * Initial call state
 */
export const initialCallState: CallState = {
  phase: 'idle',
  call: null,
};

/**
 * Call state reducer with integrated ringtone control
 * 
 * CRITICAL: This reducer is the ONLY place that starts/stops ringtones.
 * All state transitions automatically manage audio lifecycle.
 */
export function reduceCall(state: CallState, action: CallAction): CallState {
  console.log('[CallFSM] Action:', action.type, 'Current phase:', state.phase);
  
  switch (action.type) {
    case 'INCOMING_CALL':
      // Start ringtone for incoming call
      startRingtone();
      vibrateIncomingCall();
      console.log('[CallFSM] → ringing (incoming), role=callee');
      
      return {
        ...state,
        phase: 'ringing',
        call: { ...action.call, callRole: 'callee' }, // CRITICAL: callee receives incoming call
        error: undefined,
      };

    case 'OUTGOING_CALL':
      // Start dial tone for outgoing call
      startDialTone();
      console.log('[CallFSM] → dialing (outgoing), role=caller');
      
      return {
        ...state,
        phase: 'dialing',
        call: { ...action.call, callRole: 'caller' }, // CRITICAL: caller initiates outgoing call
        error: undefined,
      };

    case 'CALL_ACCEPTED':
      // Stop all audio when call is accepted
      stopAllAudio();
      console.log('[CallFSM] → connecting', action.sessionCode ? `with sessionCode ${action.sessionCode}` : '');
      
      return {
        ...state,
        phase: 'connecting',
        call: action.sessionCode ? { ...state.call!, sessionCode: action.sessionCode } : state.call,
        error: undefined,
      };

    case 'CALL_ACTIVE':
      // Ensure all ringtones are stopped when call becomes active
      stopAllAudio();
      console.log('[CallFSM] → active');
      
      return {
        ...state,
        phase: 'active',
        error: undefined,
      };

    case 'CALL_ENDED':
      // Stop all audio when call ends
      stopAllAudio();
      console.log('[CallFSM] → ended', action.reason || '');
      
      return {
        ...state,
        phase: 'ended',
        error: undefined,
      };

    case 'CALL_DECLINED':
      // Stop all audio when call is declined
      stopAllAudio();
      console.log('[CallFSM] → declined');
      
      return {
        ...state,
        phase: 'declined',
        error: undefined,
      };

    case 'CALL_MISSED':
      // Stop all audio when call is missed
      stopAllAudio();
      console.log('[CallFSM] → missed');
      
      return {
        ...state,
        phase: 'missed',
        error: undefined,
      };

    case 'CALL_FAILED':
      // Stop all audio when call fails
      stopAllAudio();
      console.log('[CallFSM] → failed:', action.error);
      
      return {
        ...state,
        phase: 'failed',
        error: action.error,
      };

    case 'RESET':
      // Reset to idle state, stop all audio
      stopAllAudio();
      console.log('[CallFSM] → idle (reset)');
      
      return {
        ...initialCallState,
      };

    default:
      console.warn('[CallFSM] Unknown action:', (action as any).type);
      return state;
  }
}

/**
 * Helper to check if call is in progress
 */
export function isCallActive(phase: CallPhase): boolean {
  return ['ringing', 'dialing', 'connecting', 'active'].includes(phase);
}

/**
 * Helper to check if call is terminal (ended)
 */
export function isCallTerminal(phase: CallPhase): boolean {
  return ['ended', 'missed', 'declined', 'failed'].includes(phase);
}

/**
 * Helper to get human-readable phase name
 */
export function getPhaseLabel(phase: CallPhase): string {
  switch (phase) {
    case 'idle': return 'No Call';
    case 'ringing': return 'Incoming Call';
    case 'dialing': return 'Calling...';
    case 'connecting': return 'Connecting...';
    case 'active': return 'In Call';
    case 'ended': return 'Call Ended';
    case 'missed': return 'Missed Call';
    case 'declined': return 'Call Declined';
    case 'failed': return 'Call Failed';
    default: return phase;
  }
}
