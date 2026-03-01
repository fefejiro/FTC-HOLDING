import { useState, useRef, useEffect } from "react";
import { Mic, Trash2, Send, Loader2, Lock, X, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface VoiceNoteRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => Promise<void>;
  disabled?: boolean;
}

export function VoiceNoteRecorder({ onSend, disabled }: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [slideX, setSlideX] = useState(0);
  const [slideY, setSlideY] = useState(0);
  const [showCancelIndicator, setShowCancelIndicator] = useState(false);
  const [showLockIndicator, setShowLockIndicator] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasCancelledRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const LOCK_THRESHOLD_Y = -80; // px to slide UP to lock
  const UNLOCK_THRESHOLD_Y = 40; // px to slide DOWN to unlock (when locked)
  const CANCEL_THRESHOLD_X = -120; // px to slide LEFT to cancel

  // Helper function to release all media resources
  const releaseMediaResources = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[VoiceNoteRecorder] Stopped track:', track.kind, track.label);
      });
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Cleanup on unmount - CRITICAL for releasing microphone
  useEffect(() => {
    return () => {
      console.log('[VoiceNoteRecorder] Component unmounting - releasing all resources');
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      releaseMediaResources();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.log('[VoiceNoteRecorder] MediaRecorder already stopped');
        }
      }
    };
  }, []);

  // Analyze audio level for waveform visualization
  const analyzeAudioLevel = () => {
    if (!analyzerRef.current) return;

    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);

    // Calculate average amplitude
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const normalizedLevel = average / 255; // Normalize to 0-1

    setAudioLevel(normalizedLevel);

    // Continue animation loop
    if (isRecording) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudioLevel);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      // Set up Web Audio API for waveform visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);

      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;

      // Start analyzing audio levels
      analyzeAudioLevel();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[VoiceNoteRecorder] Recording stopped, releasing microphone');
        // Release all media resources immediately
        releaseMediaResources();
        
        // If cancelled, don't create preview
        if (wasCancelledRef.current) {
          audioChunksRef.current = [];
          wasCancelledRef.current = false;
          setAudioLevel(0);
          return;
        }
        
        // Normal stop - create preview
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setIsPreviewing(true);
        setAudioLevel(0);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[VoiceNoteRecorder] MediaRecorder error:', event);
        releaseMediaResources();
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      
      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 100);

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

    } catch (error) {
      console.error('[VoiceNoteRecorder] Failed to start recording:', error);
      releaseMediaResources();
      alert('Could not access microphone. Please grant permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      const recordedDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDuration(recordedDuration);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsLocked(false);
      setSlideX(0);
      setSlideY(0);
      setShowCancelIndicator(false);
      setShowLockIndicator(false);
      setRecordingTime(0);
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('[VoiceNoteRecorder] Cancelling recording');
      // Set cancellation flag before stopping
      wasCancelledRef.current = true;
      
      // Stop the recorder which will trigger onstop and release resources
      mediaRecorderRef.current.stop();
      
      // Also directly release in case onstop doesn't fire
      releaseMediaResources();
      
      setIsRecording(false);
      setIsLocked(false);
      setSlideX(0);
      setSlideY(0);
      setShowCancelIndicator(false);
      setShowLockIndicator(false);
      setRecordingTime(0);

      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }
    }
  };

  const handleStart = (clientX: number, clientY: number) => {
    if (!disabled && !isPreviewing && !isLocked) {
      startXRef.current = clientX;
      startYRef.current = clientY;
      startRecording();
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isRecording) return;
    
    const deltaX = clientX - startXRef.current;
    const deltaY = clientY - startYRef.current;
    
    if (isLocked) {
      // When locked, only track vertical movement for unlock gesture
      setSlideY(Math.max(0, deltaY)); // Only allow positive (downward) movement
      
      // No horizontal tracking when locked
      return;
    }
    
    // When not locked, track both directions
    setSlideX(Math.min(0, deltaX)); // Only allow negative (leftward) movement
    setSlideY(Math.min(0, deltaY)); // Only allow negative (upward) movement
    
    // Show lock indicator when sliding up
    if (deltaY <= LOCK_THRESHOLD_Y) {
      if (!showLockIndicator) {
        setShowLockIndicator(true);
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    } else {
      setShowLockIndicator(false);
    }
    
    // Show cancel indicator when sliding left
    if (deltaX <= CANCEL_THRESHOLD_X) {
      if (!showCancelIndicator) {
        setShowCancelIndicator(true);
        if (navigator.vibrate) {
          navigator.vibrate(30);
        }
      }
    } else {
      setShowCancelIndicator(false);
    }
  };

  const handleEnd = () => {
    if (!isRecording) return;
    
    if (isLocked) {
      // When locked, check if sliding down to unlock
      if (slideY >= UNLOCK_THRESHOLD_Y) {
        // Unlock and stop recording
        stopRecording();
      } else {
        // Reset slide position
        setSlideY(0);
      }
      return;
    }
    
    // Not locked - check gestures
    if (slideX <= CANCEL_THRESHOLD_X) {
      // Cancel recording (slid left)
      cancelRecording();
    } else if (slideY <= LOCK_THRESHOLD_Y) {
      // Lock recording (slid up)
      setIsLocked(true);
      setSlideX(0);
      setSlideY(0);
      setShowLockIndicator(false);
      setShowCancelIndicator(false);
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } else {
      // Normal release - stop recording
      stopRecording();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Prevent any text selection or context menu on mobile
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    if (e.touches.length > 0) {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length > 0) {
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleEnd();
  };

  const handleTouchCancel = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isRecording && !isLocked) {
      cancelRecording();
    }
  };

  const handleDelete = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsPreviewing(false);
    setDuration(0);
  };

  const handleSend = async () => {
    if (!audioBlob) return;

    try {
      setIsSending(true);
      await onSend(audioBlob, duration);
      
      // Cleanup after send
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioBlob(null);
      setAudioUrl(null);
      setIsPreviewing(false);
      setDuration(0);
    } catch (error) {
      console.error('[VoiceNoteRecorder] Failed to send:', error);
      alert('Failed to send voice note. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Preview mode - Minimal WhatsApp-style UI
  if (isPreviewing && audioUrl) {
    return (
      <div className="flex items-center gap-2 w-full">
        {/* Audio Player with clean styling */}
        <div className="flex-1 bg-muted/30 rounded-xl px-3 py-2">
          <audio 
            src={audioUrl} 
            controls 
            controlsList="nodownload"
            preload="metadata"
            className="w-full h-8"
            data-testid="audio-preview"
            onError={(e) => {
              console.error('[VoiceNoteRecorder] Preview playback error:', e);
              console.error('[VoiceNoteRecorder] Blob URL:', audioUrl);
            }}
          >
            <source src={audioUrl} type="audio/webm;codecs=opus" />
            Your browser does not support audio playback.
          </audio>
        </div>
        
        {/* Trash icon - small and clean */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={isSending}
          data-testid="button-delete-recording"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
        
        {/* Send Button */}
        <Button
          variant="default"
          size="icon"
          onClick={handleSend}
          disabled={isSending}
          data-testid="button-send-recording"
          className="shrink-0"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }

  // Recording mode - WhatsApp-style with slide gesture
  return (
    <div 
      className="flex items-center gap-2 relative"
      style={{ 
        minHeight: isRecording ? '120px' : 'auto',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: isRecording ? 'none' : 'auto',
      } as React.CSSProperties}
      onContextMenu={(e) => isRecording && e.preventDefault()}
    >
      {/* Lock indicator (shown when sliding UP - above button) */}
      {isRecording && !isLocked && slideY < 0 && (
        <div 
          className="absolute left-0 flex items-center justify-center pointer-events-none transition-all duration-200"
          style={{
            bottom: '100%',
            marginBottom: '8px',
            opacity: Math.min(1, Math.abs(slideY) / 60),
            transform: `translateY(${slideY * 0.5}px)`,
          }}
        >
          {showLockIndicator ? (
            <div className="flex flex-col items-center gap-1.5 text-primary bg-primary/10 px-4 py-2 rounded-full shadow-lg animate-pulse">
              <Lock className="w-5 h-5" />
              <span className="text-xs font-medium whitespace-nowrap">Release to Lock</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
              <div className="rotate-180">
                <ChevronLeft className="w-5 h-5 animate-pulse" />
              </div>
              <span className="text-xs font-medium whitespace-nowrap">Slide up</span>
            </div>
          )}
        </div>
      )}

      {/* Cancel indicator (shown when sliding LEFT) */}
      {isRecording && !isLocked && slideX < 0 && (
        <div 
          className="absolute right-full mr-2 flex items-center gap-2 pointer-events-none transition-opacity duration-150"
          style={{
            opacity: Math.min(1, Math.abs(slideX) / 80),
            transform: `translateX(${slideX * 0.3}px)`,
          }}
        >
          {showCancelIndicator ? (
            <div className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-4 py-1.5 rounded-full shadow-lg animate-pulse">
              <Trash2 className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">Release to Delete</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ChevronLeft className="w-5 h-5 animate-pulse" />
              <span className="text-xs font-medium whitespace-nowrap">Slide left</span>
            </div>
          )}
        </div>
      )}
      
      {/* Unlock indicator (shown when locked and sliding DOWN) */}
      {isRecording && isLocked && slideY > 0 && (
        <div 
          className="absolute top-full mt-2 left-0 flex items-center justify-center pointer-events-none transition-opacity duration-150"
          style={{
            opacity: Math.min(1, slideY / 30),
          }}
        >
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <ChevronLeft className="w-5 h-5 animate-pulse" />
            <span className="text-xs font-medium whitespace-nowrap">Slide down to unlock</span>
          </div>
        </div>
      )}

      {/* Recording time (locked mode) */}
      {isRecording && isLocked && (
        <div className="flex items-center gap-2 mr-2">
          <div className="flex items-center gap-2 text-xs text-destructive font-medium">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            <span data-testid="text-recording-time">{formatTime(recordingTime)}</span>
            {/* Waveform bars */}
            <div className="flex items-center gap-0.5 h-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-0.5 bg-destructive rounded-full transition-all duration-75"
                  style={{
                    height: `${Math.max(20, audioLevel * 100 * (1 + Math.sin(Date.now() / (100 + i * 20)) * 0.3))}%`,
                  }}
                />
              ))}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={stopRecording}
            className="h-8"
            data-testid="button-stop-locked-recording"
          >
            Stop
          </Button>
        </div>
      )}

      {/* Mic button */}
      <button
        ref={buttonRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
        disabled={disabled || (isRecording && isLocked)}
        data-testid="button-record-voice"
        className={cn(
          "flex items-center justify-center rounded-full",
          "h-11 w-11",
          isRecording 
            ? "bg-primary text-primary-foreground animate-calm-pulse shadow-lg" 
            : "bg-primary text-primary-foreground hover-elevate active-elevate-2 transition-all duration-200",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        style={{
          transform: isRecording && !isLocked 
            ? `translate(${slideX}px, ${slideY}px) scale(1.05)` 
            : isLocked 
            ? 'scale(1)' 
            : undefined,
          transition: isRecording && !isLocked ? 'none' : 'all 0.2s ease-out',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          touchAction: 'none',
          WebkitTapHighlightColor: 'transparent',
          msUserSelect: 'none',
          MozUserSelect: 'none',
        } as React.CSSProperties}
      >
        {isLocked ? <Lock className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
      
      {/* Recording time (non-locked mode - shows near button) */}
      {isRecording && !isLocked && (
        <div className="flex items-center gap-2 text-xs text-destructive font-medium absolute left-14">
          <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
          <span data-testid="text-recording-time">{formatTime(recordingTime)}</span>
          {/* Waveform bars */}
          <div className="flex items-center gap-0.5 h-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-0.5 bg-destructive rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(20, audioLevel * 100 * (1 + Math.sin(Date.now() / (100 + i * 20)) * 0.3))}%`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
