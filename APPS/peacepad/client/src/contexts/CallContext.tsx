/**
 * Call Context
 * 
 * Provides call state management via the call FSM.
 * This is the single source of truth for all call state.
 */

import { createContext, useContext, useReducer, useCallback, ReactNode, useMemo, useRef, useEffect } from 'react';
import { 
  CallState, 
  CallAction, 
  CallPhase, 
  CallData, 
  initialCallState, 
  reduceCall 
} from '@/call/callFsm';

interface CallContextType {
  // State
  callState: CallState;
  phase: CallPhase;
  call: CallData | null;
  
  // Actions
  incomingCall: (call: CallData) => void;
  outgoingCall: (call: CallData) => void;
  acceptCall: (sessionCode?: string) => void;
  activateCall: () => void;
  endCall: (reason?: string, options?: {
    isRemoteEnd?: boolean;
    callId?: string;
    skipApi?: boolean;
  }) => Promise<void>;
  declineCall: () => void;
  missCall: () => void;
  failCall: (error: string) => void;
  resetCall: () => void;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const [callState, dispatch] = useReducer(reduceCall, initialCallState);
  
  // Debounce protection: Track end call execution status
  const endCallInProgressRef = useRef<boolean>(false);
  const lastEndCallTimeRef = useRef<number>(0);
  const lastEndCallIdRef = useRef<string | null>(null);
  const endCallDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Action creators
  const incomingCall = useCallback((call: CallData) => {
    console.log('[CallContext] Incoming call:', call.callId);
    dispatch({ type: 'INCOMING_CALL', call });
  }, []);

  const outgoingCall = useCallback((call: CallData) => {
    console.log('[CallContext] Outgoing call:', call.callId);
    dispatch({ type: 'OUTGOING_CALL', call });
  }, []);

  const acceptCall = useCallback((sessionCode?: string) => {
    console.log('[CallContext] Accepting call', sessionCode ? `with sessionCode ${sessionCode}` : '');
    dispatch({ type: 'CALL_ACCEPTED', sessionCode });
  }, []);

  const activateCall = useCallback(() => {
    console.log('[CallContext] Activating call');
    dispatch({ type: 'CALL_ACTIVE' });
  }, []);

  // Centralized end call logic with API coordination and debounce protection
  // Only the initiator calls the API, preventing duplicate 400 errors
  const endCall = useCallback(async (reason?: string, options?: {
    isRemoteEnd?: boolean;  // True when responding to remote end signal
    callId?: string;        // Database call ID for API
    skipApi?: boolean;      // Force skip API call (for errors)
  }) => {
    const { isRemoteEnd = false, callId, skipApi = false } = options || {};
    const now = Date.now();
    
    // DEBOUNCE PROTECTION #1: Check if we're already processing an endCall
    if (endCallInProgressRef.current) {
      console.log('[CallContext] ⏭️ DEBOUNCE: endCall already in progress, skipping duplicate call', {
        reason,
        callId,
        isRemoteEnd
      });
      return;
    }
    
    // DEBOUNCE PROTECTION #2: Check for rapid successive calls (within 500ms)
    const timeSinceLastCall = now - lastEndCallTimeRef.current;
    if (timeSinceLastCall < 500 && lastEndCallIdRef.current === callId) {
      console.log('[CallContext] ⏭️ DEBOUNCE: Ignoring rapid successive endCall', {
        timeSinceLastCall,
        callId,
        reason
      });
      return;
    }
    
    // DEBOUNCE PROTECTION #3: Check if call is already in ended state
    if (callState.phase === 'idle' || callState.phase === 'ended') {
      console.log('[CallContext] ⏭️ DEBOUNCE: Call already in ended/idle state', {
        currentPhase: callState.phase,
        reason,
        callId
      });
      return;
    }
    
    // Clear any pending debounce timeout
    if (endCallDebounceTimeoutRef.current) {
      clearTimeout(endCallDebounceTimeoutRef.current);
      endCallDebounceTimeoutRef.current = null;
    }
    
    // Mark that we're processing the endCall
    endCallInProgressRef.current = true;
    lastEndCallTimeRef.current = now;
    lastEndCallIdRef.current = callId || null;
    
    console.log('[CallContext] ✅ Processing endCall:', {
      reason: reason || 'user hangup',
      isRemoteEnd,
      callId,
      skipApi,
      timeSinceLastCall
    });
    
    try {
      // Update state immediately
      dispatch({ type: 'CALL_ENDED', reason });
      
      // Only call backend API if:
      // 1. This is a local-initiated end (not remote)
      // 2. We have a callId
      // 3. We're not explicitly skipping the API
      if (callId && !isRemoteEnd && !skipApi) {
        try {
          console.log('[CallContext] Making API call to end call:', callId);
          const response = await fetch(`/api/calls/${callId}/end`, {
            method: 'PATCH',
            credentials: 'include',
          });
          
          if (response.ok) {
            console.log('[CallContext] ✅ API call successful - backend will notify other party');
          } else if (response.status === 400) {
            // 400 = call already ended (race condition with remote)
            console.log('[CallContext] ⚠️ Call already ended (likely by remote peer) - this is OK');
          } else {
            console.error('[CallContext] ❌ API returned unexpected status:', response.status);
          }
        } catch (error) {
          console.error('[CallContext] Failed to end call via API:', error);
          // Still proceed with local cleanup even if API fails
        }
      } else {
        if (isRemoteEnd) {
          console.log('[CallContext] Skipping API - responding to remote end signal');
        } else if (skipApi) {
          console.log('[CallContext] Skipping API - explicitly requested');
        } else if (!callId) {
          console.log('[CallContext] Skipping API - no callId available');
        }
      }
    } finally {
      // Reset the in-progress flag after a short delay to allow for any cleanup
      // This delay ensures that any immediate follow-up calls are still debounced
      endCallDebounceTimeoutRef.current = setTimeout(() => {
        endCallInProgressRef.current = false;
        endCallDebounceTimeoutRef.current = null;
        console.log('[CallContext] endCall debounce protection reset');
      }, 1000); // 1 second cooldown
    }
  }, [callState.phase]);

  const declineCall = useCallback(() => {
    console.log('[CallContext] Declining call');
    dispatch({ type: 'CALL_DECLINED' });
  }, []);

  const missCall = useCallback(() => {
    console.log('[CallContext] Call missed');
    dispatch({ type: 'CALL_MISSED' });
  }, []);

  const failCall = useCallback((error: string) => {
    console.log('[CallContext] Call failed:', error);
    dispatch({ type: 'CALL_FAILED', error });
  }, []);

  const resetCall = useCallback(() => {
    console.log('[CallContext] Resetting call');
    // Clear any pending debounce timeouts
    if (endCallDebounceTimeoutRef.current) {
      clearTimeout(endCallDebounceTimeoutRef.current);
      endCallDebounceTimeoutRef.current = null;
    }
    // Reset debounce state
    endCallInProgressRef.current = false;
    lastEndCallTimeRef.current = 0;
    lastEndCallIdRef.current = null;
    dispatch({ type: 'RESET' });
  }, []);

  // CRITICAL FIX: Listen for network disconnect events to immediately end active calls
  // This prevents UI inconsistency where one party stays "on call" while other disconnects
  useEffect(() => {
    const handleNetworkDisconnect = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[CallContext] 🔴 Network disconnect detected:', customEvent.detail);
      
      // If we're in an active call, immediately end it locally
      if (callState.phase !== 'idle' && callState.phase !== 'ended') {
        console.log('[CallContext] ⚠️ Active call detected during network disconnect - ending call immediately');
        
        // End call with network disconnect reason, skip API call since we're disconnected
        endCall('Network connection lost', {
          isRemoteEnd: false,
          callId: callState.call?.callId,
          skipApi: true  // Don't try API call when network is down
        });
      }
    };
    
    const handleNetworkFailure = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[CallContext] 🔴 Network failure (max retries reached):', customEvent.detail);
      
      // If still in a call after max retries, definitely end it
      if (callState.phase !== 'idle' && callState.phase !== 'ended') {
        console.log('[CallContext] ⚠️ Network permanently failed - ending call');
        endCall('Network connection failed', {
          isRemoteEnd: false,
          callId: callState.call?.callId,
          skipApi: true
        });
      }
    };
    
    // Listen for network disconnect events from WebSocket hook
    window.addEventListener('network-disconnect', handleNetworkDisconnect);
    window.addEventListener('network-failure', handleNetworkFailure);
    
    return () => {
      window.removeEventListener('network-disconnect', handleNetworkDisconnect);
      window.removeEventListener('network-failure', handleNetworkFailure);
    };
  }, [callState.phase, callState.call, endCall]);

  const contextValue = useMemo<CallContextType>(() => ({
    callState,
    phase: callState.phase,
    call: callState.call,
    incomingCall,
    outgoingCall,
    acceptCall,
    activateCall,
    endCall,
    declineCall,
    missCall,
    failCall,
    resetCall,
  }), [
    callState,
    incomingCall,
    outgoingCall,
    acceptCall,
    activateCall,
    endCall,
    declineCall,
    missCall,
    failCall,
    resetCall,
  ]);

  return (
    <CallContext.Provider value={contextValue}>
      {children}
    </CallContext.Provider>
  );
}

export function useCallContext() {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCallContext must be used within a CallProvider');
  }
  return context;
}
