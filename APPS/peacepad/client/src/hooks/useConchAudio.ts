import { useEffect, useRef, useState, useCallback } from "react";
import { useWebRTC } from "@/contexts/WebRTCContext";
import { useToast } from "@/hooks/use-toast";
import { bindRemoteTrack } from "@/call/remoteAudioManager";

interface ConchAudioOptions {
  sessionCode: string; // CRITICAL: Use sessionCode (not callId) for WebRTC session joining
  partnerId: string;
  enabled: boolean; // Only connect when session is active
  videoEnabled?: boolean; // Enable video camera (default: true)
  audioOnly?: boolean; // Audio-only mode (disables video track)
}

// WebRTC media configuration constants
const MEDIA_MAX_BITRATE = 500000; // 500kbps bitrate cap
const VIDEO_RESOLUTION = { width: 640, height: 360 }; // 360p
const VIDEO_FRAMERATE = 24; // 24fps

/**
 * Background WebRTC audio/video handler for Conch mode
 * Manages peer-to-peer audio and video connection
 */
export function useConchAudio({ sessionCode, partnerId, enabled, videoEnabled = true, audioOnly = false }: ConchAudioOptions) {
  const { sendSignal, joinSession, leaveSession } = useWebRTC();
  const { toast } = useToast();
  
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(true); // Camera starts OFF for privacy/safety
  const [isAudioOnly, setIsAudioOnly] = useState(audioOnly);
  const [localAudioLevel, setLocalAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  
  // Log initialization
  useEffect(() => {
    if (enabled && sessionCode && partnerId) {
      console.log('[ConchMedia] Initializing authenticated call media');
      console.log(`[ConchMedia] bitrateCap=${MEDIA_MAX_BITRATE / 1000}kbps fps=${VIDEO_FRAMERATE}`);
      console.log(`[ConchMedia] audioOnly=${isAudioOnly}`);
    }
  }, [enabled, sessionCode, partnerId, isAudioOnly]);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [localVideoElement, setLocalVideoElement] = useState<HTMLVideoElement | null>(null);
  const [remoteVideoElement, setRemoteVideoElement] = useState<HTMLVideoElement | null>(null);
  const isInitializedRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const statsIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    console.log('[ConchAudio] Effect triggered with:', {
      enabled,
      sessionCode,
      partnerId,
      isInitialized: isInitializedRef.current
    });
    
    if (!enabled || !sessionCode || !partnerId) {
      console.log('[ConchAudio] Not enabled or missing params - cleaning up');
      cleanup();
      return;
    }

    // Prevent duplicate initialization
    if (isInitializedRef.current) {
      console.log('[ConchAudio] Already initialized - skipping');
      return;
    }

    console.log('[ConchAudio] Initializing audio connection');
    initializeAudio();

    return () => {
      console.log('[ConchAudio] Effect cleanup');
      cleanup();
    };
  }, [enabled, sessionCode, partnerId]);

  // Helper function to bind local video
  const bindLocalVideo = useCallback(() => {
    if (localVideoElement && localStreamRef.current && videoEnabled) {
      console.log('[ConchAudio] Binding local video stream to element');
      localVideoElement.srcObject = localStreamRef.current;
      localVideoElement.play().catch(err => {
        console.error('[ConchAudio] Failed to play local video:', err);
      });
    }
  }, [localVideoElement, videoEnabled]);

  // Helper function to bind remote video
  const bindRemoteVideo = useCallback(() => {
    if (remoteVideoElement && remoteStreamRef.current) {
      console.log('[ConchAudio] Binding remote video stream to element');
      remoteVideoElement.srcObject = remoteStreamRef.current;
      remoteVideoElement.play().catch(err => {
        console.error('[ConchAudio] Failed to play remote video:', err);
      });
    }
  }, [remoteVideoElement]);

  // Effect to bind local video when element becomes available
  useEffect(() => {
    bindLocalVideo();
  }, [bindLocalVideo]);

  // Effect to bind remote video when element becomes available
  useEffect(() => {
    bindRemoteVideo();
  }, [bindRemoteVideo]);

  const initializeAudio = async () => {
    try {
      // 1. Get microphone and camera access with optimized constraints
      // Always request video if videoEnabled (even if starting in audio-only mode)
      // This ensures video track exists for toggleAudioOnly to work after reconnection
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 },
          channelCount: { ideal: 1 },
        },
        video: videoEnabled ? {
          facingMode: { ideal: facingMode },
          width: { ideal: VIDEO_RESOLUTION.width },
          height: { ideal: VIDEO_RESOLUTION.height },
          frameRate: { ideal: VIDEO_FRAMERATE, max: VIDEO_FRAMERATE },
        } : false,
      };

      console.log('[ConchAudio] Requesting media access with constraints:', JSON.stringify(constraints));
      
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        console.warn('[ConchAudio] Primary getUserMedia failed, retrying with audio only:', err.name || err.message);
        // Fallback: If video failed (common on some Android browsers/WebView), try audio only
        if (videoEnabled) {
          stream = await navigator.mediaDevices.getUserMedia({ 
            audio: constraints.audio 
          });
          console.log('[ConchAudio] Audio-only fallback successful');
        } else {
          throw err;
        }
      }
      
      // Camera starts OFF by default (isCameraOff=true) for privacy/safety
      // Always disable video track initially - user can enable with camera toggle button
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = false;
        console.log('[ConchMedia] Video track disabled (camera starts OFF for privacy)');
      }
      
      localStreamRef.current = stream;
      setLocalStream(stream); // Update state to trigger re-renders
      console.log('[ConchAudio] Media access granted:', {
        audio: true,
        video: videoEnabled,
        videoEnabled: !isAudioOnly,
      });

      // Bind local video if element is ready
      bindLocalVideo();

      // 2. Join WebRTC session using sessionCode (CRITICAL: not callId)
      joinSession(sessionCode);

      // 4. Listen for WebRTC signals
      window.addEventListener('webrtc-signal', handleWebRTCSignal);
      
      // 5. Setup audio level detection
      setupAudioLevelDetection();
      
      // Mark as initialized AFTER successful setup
      isInitializedRef.current = true;
      
    } catch (error) {
      console.error('[ConchAudio] Failed to initialize audio:', error);
      
      // Reset initialization flag so user can retry (e.g., after granting permissions)
      isInitializedRef.current = false;
      
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone for Conch mode",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const setupAudioLevelDetection = () => {
    if (!localStreamRef.current) return;
    
    try {
      // Create audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioContext = audioContextRef.current;
      
      // Setup local stream analyzer
      const localSource = audioContext.createMediaStreamSource(localStreamRef.current);
      localAnalyserRef.current = audioContext.createAnalyser();
      localAnalyserRef.current.fftSize = 256;
      localSource.connect(localAnalyserRef.current);
      
      // Start monitoring audio levels
      monitorAudioLevels();
      
      console.log('[ConchAudio] Audio level detection initialized');
    } catch (error) {
      console.error('[ConchAudio] Failed to setup audio level detection:', error);
    }
  };

  const monitorAudioLevels = () => {
    const updateLevels = () => {
      // Local audio level
      if (localAnalyserRef.current) {
        const dataArray = new Uint8Array(localAnalyserRef.current.frequencyBinCount);
        localAnalyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setLocalAudioLevel(Math.min(100, (average / 255) * 100));
      }
      
      // Remote audio level - using global audio element
      if (remoteStreamRef.current && audioContextRef.current) {
        if (!remoteAnalyserRef.current) {
          try {
            const remoteSource = audioContextRef.current.createMediaStreamSource(remoteStreamRef.current);
            remoteAnalyserRef.current = audioContextRef.current.createAnalyser();
            remoteAnalyserRef.current.fftSize = 256;
            remoteSource.connect(remoteAnalyserRef.current);
          } catch (e) {
            // Ignore if already connected
          }
        }
        
        if (remoteAnalyserRef.current) {
          const dataArray = new Uint8Array(remoteAnalyserRef.current.frequencyBinCount);
          remoteAnalyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setRemoteAudioLevel(Math.min(100, (average / 255) * 100));
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(updateLevels);
    };
    
    updateLevels();
  };

  const startStatsMonitoring = () => {
    // Collect WebRTC quality metrics every 5 seconds
    const interval = window.setInterval(async () => {
      if (!peerConnectionRef.current) return;
      
      try {
        const stats = await peerConnectionRef.current.getStats();
        const metrics: any = {
          timestamp: Date.now(),
          connectionState: peerConnectionRef.current.connectionState,
          iceConnectionState: peerConnectionRef.current.iceConnectionState,
        };
        
        stats.forEach((report: any) => {
          // Track inbound audio (receiving)
          if (report.type === 'inbound-rtp' && report.kind === 'audio') {
            metrics.inbound = {
              bytesReceived: report.bytesReceived,
              packetsReceived: report.packetsReceived,
              packetsLost: report.packetsLost,
              jitter: report.jitter,
              audioLevel: report.audioLevel,
            };
          }
          
          // Track outbound audio (sending)
          if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            metrics.outbound = {
              bytesSent: report.bytesSent,
              packetsSent: report.packetsSent,
            };
          }
          
          // Track candidate pair (connection quality)
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            metrics.connection = {
              currentRoundTripTime: report.currentRoundTripTime,
              availableOutgoingBitrate: report.availableOutgoingBitrate,
              totalRoundTripTime: report.totalRoundTripTime,
              responsesSent: report.responsesSent,
            };
          }
        });
        
        // Log metrics to console for debugging
        console.log('[ConchAudio] Quality Metrics:', {
          state: metrics.connectionState,
          packetsLost: metrics.inbound?.packetsLost || 0,
          jitter: metrics.inbound?.jitter ? (metrics.inbound.jitter * 1000).toFixed(2) + 'ms' : 'N/A',
          rtt: metrics.connection?.currentRoundTripTime ? (metrics.connection.currentRoundTripTime * 1000).toFixed(2) + 'ms' : 'N/A',
        });
        
        // Send to test monitor API
        fetch('/api/test-monitor/webrtc-stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionCode, metrics }),
        }).catch(err => {
          // Silent fail - test monitor is optional
          console.debug('[ConchAudio] Failed to send stats to test monitor:', err);
        });
        
      } catch (error) {
        console.error('[ConchAudio] Failed to collect stats:', error);
      }
    }, 5000); // Every 5 seconds
    
    statsIntervalRef.current = interval;
    console.log('[ConchAudio] Stats monitoring started');
  };

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
      console.log('[ConchAudio] Mute toggled:', !audioTrack.enabled);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCameraOff(!videoTrack.enabled);
      console.log('[ConchAudio] Camera toggled:', !videoTrack.enabled ? 'OFF' : 'ON');
    }
  }, []);

  const toggleAudioOnly = useCallback(() => {
    if (!localStreamRef.current) return;
    
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      const newAudioOnly = !isAudioOnly;
      videoTrack.enabled = !newAudioOnly;
      setIsAudioOnly(newAudioOnly);
      console.log('[ConchMedia] audioOnly=' + newAudioOnly);
    }
  }, [isAudioOnly]);

  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current || !videoEnabled) return;
    
    try {
      // Stop current video track
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.stop();
      }
      
      // Switch facing mode
      const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(newFacingMode);
      
      console.log('[ConchAudio] Switching camera to:', newFacingMode);
      
      // Get new video stream with new facing mode
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { exact: newFacingMode },
          width: { ideal: VIDEO_RESOLUTION.width },
          height: { ideal: VIDEO_RESOLUTION.height },
          frameRate: { ideal: VIDEO_FRAMERATE, max: VIDEO_FRAMERATE },
        }
      });
      
      const newVideoTrack = newStream.getVideoTracks()[0];
      
      // Replace video track in existing stream
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      localStreamRef.current = new MediaStream([audioTrack, newVideoTrack]);
      
      // Update peer connection with new video track
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
          
          // Reapply bitrate cap
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) {
            params.encodings = [{}];
          }
          params.encodings[0].maxBitrate = MEDIA_MAX_BITRATE;
          await sender.setParameters(params);
        }
      }
      
      // Bind new stream to video element
      bindLocalVideo();
      
      toast({
        title: `Switched to ${newFacingMode === 'user' ? 'front' : 'back'} camera`,
        duration: 2000,
      });
      
    } catch (error) {
      console.error('[ConchAudio] Failed to switch camera:', error);
      toast({
        title: "Camera switch failed",
        description: "Could not switch to the other camera",
        variant: "destructive",
        duration: 3000,
      });
    }
  }, [facingMode, videoEnabled, bindLocalVideo, toast]);

  const handleWebRTCSignal = async (event: Event) => {
    const customEvent = event as CustomEvent;
    const message = customEvent.detail;

    switch (message.type) {
      case "session-users":
        // Partner is already in session, create connection
        const existingUsers = message.payload.users || [];
        console.log('[ConchAudio] Existing users:', existingUsers);
        for (const peer of existingUsers) {
          if (peer.userId !== partnerId) continue;
          await createPeerConnection(false); // Wait for offer
        }
        break;

      case "peer-joined":
        // Partner just joined, initiate connection
        if (message.payload.userId === partnerId || message.from === partnerId) {
          console.log('[ConchAudio] Partner joined, creating offer');
          await createPeerConnection(true); // Create offer
        }
        break;

      case "offer":
        if (message.from === partnerId) {
          await handleOffer(message.payload);
        }
        break;

      case "answer":
        if (message.from === partnerId) {
          await handleAnswer(message.payload);
        }
        break;

      case "ice-candidate":
        if (message.from === partnerId) {
          await handleIceCandidate(message.payload);
        }
        break;
    }
  };

  const createPeerConnection = async (shouldOffer: boolean) => {
    if (!localStreamRef.current) {
      console.warn('[ConchAudio] Local stream not ready');
      return;
    }

    if (peerConnectionRef.current) {
      console.log('[ConchAudio] Peer connection already exists');
      return;
    }

    try {
      // Fetch ICE servers (TURN/STUN) from backend for reliable mobile connections
      // Always start with STUN fallback
      const stunFallback = [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ];
      
      let configuration = { iceServers: stunFallback };

      try {
        const iceResponse = await fetch('/api/webrtc/ice-servers', { credentials: 'include' });
        if (iceResponse.ok) {
          const { iceServers } = await iceResponse.json();
          if (iceServers && iceServers.length > 0) {
            configuration = { iceServers };
            console.log('[ConchMedia] Using ICE servers from backend:', iceServers.length, 'servers');
          } else {
            console.log('[ConchMedia] Backend returned empty ICE servers, using STUN fallback');
          }
        }
      } catch (error) {
        console.warn('[ConchMedia] Failed to fetch ICE servers, using STUN fallback:', error);
      }

      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;

      // Handle incoming audio/video tracks
      pc.ontrack = (event) => {
        console.log('[ConchAudio] 🎵 Received remote track:', event.track.kind);
        
        if (event.streams[0]) {
          // Store remote stream for both audio and video
          remoteStreamRef.current = event.streams[0];
          
          // Use unified manager for audio tracks
          if (event.track.kind === 'audio') {
            console.log('[ConchAudio] 🔊 Audio track received - setting up remote audio playback');
            bindRemoteTrack(event.track, event.streams[0], 'audio');
            
            // Show success toast to confirm audio is connected
            toast({
              title: "Audio connected",
              description: "You can now hear your partner",
              duration: 3000,
            });
          }
          
          // Video track - bind if element is ready
          if (event.track.kind === 'video') {
            console.log('[ConchAudio] 📹 Video track received');
            bindRemoteVideo();
          }
        }
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({
            type: "ice-candidate",
            sessionId: sessionCode,
            candidate: event.candidate,
            payload: { to: partnerId },
          });
        }
      };

      // Handle connection state with auto-recovery
      pc.onconnectionstatechange = () => {
        console.log('[ConchAudio] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          console.log('[ConchAudio] ✅ Peer connection established successfully');
          // Start collecting quality metrics
          startStatsMonitoring();
        } else if (pc.connectionState === 'connecting') {
          console.log('[ConchAudio] 🔄 Connecting to partner...');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn('[ConchAudio] ⚠️ Connection failed/disconnected - attempting recovery');
          
          toast({
            title: "Connection lost",
            description: "Trying to reconnect...",
            variant: "destructive",
            duration: 2000,
          });
          
          // Clean up failed connection
          cleanup();
          
          // Retry connection after a short delay
          setTimeout(() => {
            if (enabled && sessionCode && partnerId) {
              console.log('[ConchAudio] 🔄 Retrying connection...');
              initializeAudio();
            }
          }, 2000);
        }
      };

      // Add local audio and video tracks to connection
      localStreamRef.current.getTracks().forEach(track => {
        if (localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current);
        }
      });

      // Apply bitrate cap to video sender if video is enabled
      if (videoEnabled && !isAudioOnly) {
        const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (videoSender) {
          try {
            const params = videoSender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}];
            }
            params.encodings[0].maxBitrate = MEDIA_MAX_BITRATE;
            await videoSender.setParameters(params);
            console.log(`[ConchMedia] Video bitrate capped at ${MEDIA_MAX_BITRATE / 1000}kbps`);
          } catch (error) {
            console.error('[ConchMedia] Failed to set bitrate cap:', error);
          }
        }
      }

      // Create offer if we're the initiator
      if (shouldOffer) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        sendSignal({
          type: "offer",
          sessionId: sessionCode,
          payload: { ...offer, to: partnerId },
        });
        console.log('[ConchAudio] Offer sent to partner');
      }

    } catch (error) {
      console.error('[ConchAudio] Failed to create peer connection:', error);
    }
  };

  const handleOffer = async (offer: RTCSessionDescriptionInit) => {
    let pc = peerConnectionRef.current;
    
    // Lazily create peer connection if offer arrives before session-users/user-joined (race condition)
    if (!pc) {
      console.log('[ConchAudio] Offer arrived before peer connection created - creating now');
      await createPeerConnection(false);
      pc = peerConnectionRef.current;
      
      if (!pc) {
        console.error('[ConchAudio] Failed to create peer connection for offer');
        return;
      }
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal({
        type: "answer",
        sessionId: sessionCode,
        payload: { ...answer, to: partnerId },
      });
      console.log('[ConchAudio] Answer sent to partner');
    } catch (error) {
      console.error('[ConchAudio] Failed to handle offer:', error);
    }
  };

  const handleAnswer = async (answer: RTCSessionDescriptionInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('[ConchAudio] Answer received from partner');
    } catch (error) {
      console.error('[ConchAudio] Failed to handle answer:', error);
    }
  };

  const handleIceCandidate = async (candidate: RTCIceCandidateInit) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.warn('[ConchAudio] No peer connection for ICE candidate');
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
      console.log('[ConchAudio] ICE candidate added');
    } catch (error) {
      console.error('[ConchAudio] Failed to add ICE candidate:', error);
    }
  };

  const cleanup = () => {
    console.log('[ConchAudio] Cleaning up audio connection');
    
    // Stop stats monitoring
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    
    // Stop audio level monitoring
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Remove event listener
    window.removeEventListener('webrtc-signal', handleWebRTCSignal);

    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      setLocalStream(null); // Reset state to trigger re-renders
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Note: Remote audio cleanup handled by remoteAudioManager globally

    // Clear video elements
    if (localVideoElement) {
      localVideoElement.srcObject = null;
      localVideoElement.pause();
    }
    if (remoteVideoElement) {
      remoteVideoElement.srcObject = null;
      remoteVideoElement.pause();
    }

    // Leave WebRTC session
    if (sessionCode) {
      leaveSession(sessionCode);
    }

    // Reset refs
    localAnalyserRef.current = null;
    remoteAnalyserRef.current = null;
    remoteStreamRef.current = null;
    isInitializedRef.current = false;
    
    // Reset state - camera defaults to OFF for privacy
    setIsMuted(false);
    setIsCameraOff(true);
    setLocalAudioLevel(0);
    setRemoteAudioLevel(0);
  };

  return {
    disconnect: cleanup,
    toggleMute,
    toggleCamera,
    toggleAudioOnly,
    switchCamera,
    isMuted,
    isCameraOff,
    isAudioOnly,
    localAudioLevel,
    remoteAudioLevel,
    setLocalVideoElement,
    setRemoteVideoElement,
    localStream,
  };
}
