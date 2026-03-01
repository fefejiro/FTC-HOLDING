import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from "react";
import { Shell, VideoOff } from "lucide-react";

type ConchButtonMode = 'idle' | 'speaking' | 'camera-on' | 'partner-turn';

interface ConchTurnButtonProps {
  mode: ConchButtonMode;
  onSwipePass: () => void;
  onDoubleTap: () => void;
  onLongPress: () => void;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 60;
const DOUBLE_TAP_DELAY = 300;
const LONG_PRESS_DELAY = 2000;
const DRAG_CANCEL_THRESHOLD = 10;

export function ConchTurnButton({
  mode,
  onSwipePass,
  onDoubleTap,
  onLongPress,
  disabled = false,
}: ConchTurnButtonProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isSwipeComplete, setIsSwipeComplete] = useState(false);
  const [hasPassedThreshold, setHasPassedThreshold] = useState(false);
  
  const buttonRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const lastTapTime = useRef(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const tapDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef(0);
  const keyPressStartTime = useRef(0);

  const clearTimers = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (tapDebounceTimer.current) {
      clearTimeout(tapDebounceTimer.current);
      tapDebounceTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const getBackgroundColor = () => {
    switch (mode) {
      case 'idle':
        return 'bg-white';
      case 'speaking':
        return 'bg-red-500';
      case 'camera-on':
        return 'bg-green-500';
      case 'partner-turn':
        return 'bg-pink-400';
      default:
        return 'bg-white';
    }
  };

  const getIconColor = () => {
    switch (mode) {
      case 'idle':
        return 'text-primary';
      case 'speaking':
      case 'camera-on':
      case 'partner-turn':
        return 'text-white';
      default:
        return 'text-primary';
    }
  };

  const getShadowColor = () => {
    switch (mode) {
      case 'speaking':
        return 'shadow-red-500/50';
      case 'camera-on':
        return 'shadow-green-500/50';
      case 'partner-turn':
        return 'shadow-pink-400/50';
      default:
        return 'shadow-black/20';
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    
    dragStartY.current = e.clientY;
    setIsDragging(true);
    isDraggingRef.current = true;
    setHasPassedThreshold(false);
    
    longPressTimer.current = setTimeout(() => {
      if (isDraggingRef.current && Math.abs(dragOffsetRef.current) < DRAG_CANCEL_THRESHOLD) {
        onLongPress();
        if ('vibrate' in navigator) {
          navigator.vibrate(200);
        }
      }
    }, LONG_PRESS_DELAY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current || disabled) return;
    
    const deltaY = dragStartY.current - e.clientY;
    
    if (Math.abs(deltaY) > DRAG_CANCEL_THRESHOLD) {
      clearTimers();
    }
    
    const clampedOffset = Math.max(0, Math.min(deltaY, 150));
    setDragOffset(clampedOffset);
    dragOffsetRef.current = clampedOffset;
    
    if (clampedOffset >= SWIPE_THRESHOLD && !hasPassedThreshold) {
      setHasPassedThreshold(true);
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (disabled) return;
    
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    clearTimers();
    
    const currentOffset = dragOffsetRef.current;
    
    if (currentOffset >= SWIPE_THRESHOLD) {
      setIsSwipeComplete(true);
      setDragOffset(150);
      
      setTimeout(() => {
        onSwipePass();
        setIsSwipeComplete(false);
        setDragOffset(0);
        dragOffsetRef.current = 0;
        setIsDragging(false);
        isDraggingRef.current = false;
        setHasPassedThreshold(false);
      }, 200);
      
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 30, 50]);
      }
    } else if (currentOffset < DRAG_CANCEL_THRESHOLD) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime.current;
      
      if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
        onDoubleTap();
        lastTapTime.current = 0;
        if ('vibrate' in navigator) {
          navigator.vibrate([30, 20, 30]);
        }
      } else {
        lastTapTime.current = now;
        tapDebounceTimer.current = setTimeout(() => {
          lastTapTime.current = 0;
        }, DOUBLE_TAP_DELAY);
      }
      
      setDragOffset(0);
      dragOffsetRef.current = 0;
      setIsDragging(false);
      isDraggingRef.current = false;
      setHasPassedThreshold(false);
    } else {
      setDragOffset(0);
      dragOffsetRef.current = 0;
      setIsDragging(false);
      isDraggingRef.current = false;
      setHasPassedThreshold(false);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    clearTimers();
    setDragOffset(0);
    dragOffsetRef.current = 0;
    setIsDragging(false);
    isDraggingRef.current = false;
    setIsSwipeComplete(false);
    setHasPassedThreshold(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    const isActivationKey = event.key === 'Enter' || event.key === ' ' || event.key === 'Space';
    
    if (!isActivationKey) return;
    
    event.preventDefault();
    
    if (keyPressStartTime.current === 0) {
      keyPressStartTime.current = Date.now();
      
      longPressTimer.current = setTimeout(() => {
        onLongPress();
        keyPressStartTime.current = 0;
        
        if ('vibrate' in navigator) {
          navigator.vibrate(200);
        }
      }, LONG_PRESS_DELAY);
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    const isActivationKey = event.key === 'Enter' || event.key === ' ' || event.key === 'Space';
    
    if (!isActivationKey) return;
    
    event.preventDefault();
    clearTimers();
    
    const pressDuration = Date.now() - keyPressStartTime.current;
    if (keyPressStartTime.current > 0 && pressDuration < LONG_PRESS_DELAY) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapTime.current;
      
      if (timeSinceLastTap < DOUBLE_TAP_DELAY && timeSinceLastTap > 0) {
        onDoubleTap();
        lastTapTime.current = 0;
      } else {
        lastTapTime.current = now;
        tapDebounceTimer.current = setTimeout(() => {
          lastTapTime.current = 0;
        }, DOUBLE_TAP_DELAY);
      }
      
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
    
    keyPressStartTime.current = 0;
  };

  const isYourTurn = mode !== 'partner-turn';
  const showSwipeHint = isYourTurn && !isDragging && dragOffset === 0 && !disabled;

  return (
    <div className="relative flex flex-col items-center">
      {showSwipeHint && (
        <div className="absolute -top-10 text-center animate-bounce pointer-events-none">
          <div className="text-xs text-white/70 font-medium bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
            Swipe up to pass
          </div>
        </div>
      )}
      
      {isDragging && dragOffset > 20 && (
        <div 
          className="absolute pointer-events-none transition-opacity"
          style={{
            bottom: 80 + dragOffset,
            opacity: Math.min(dragOffset / SWIPE_THRESHOLD, 1),
          }}
        >
          <div className={`text-sm font-semibold px-4 py-2 rounded-full ${
            dragOffset >= SWIPE_THRESHOLD 
              ? 'bg-green-500 text-white' 
              : 'bg-white/20 text-white/80'
          } backdrop-blur-md transition-colors`}>
            {dragOffset >= SWIPE_THRESHOLD ? 'Release to pass!' : 'Keep swiping...'}
          </div>
        </div>
      )}
      
      <div
        ref={buttonRef}
        className={`
          relative w-16 h-16 rounded-full flex items-center justify-center
          ${getBackgroundColor()}
          ${getShadowColor()}
          shadow-lg
          cursor-pointer select-none touch-none
          transition-all duration-200
          ${isDragging ? 'scale-110' : 'scale-100'}
          ${isSwipeComplete ? 'opacity-50' : 'opacity-100'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${mode === 'speaking' ? 'animate-pulse' : ''}
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        `}
        style={{
          transform: `translateY(-${dragOffset}px) scale(${isDragging ? 1.1 : 1})`,
          transition: isDragging ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onContextMenu={(e) => e.preventDefault()}
        data-testid="conch-turn-button"
        role="button"
        aria-label={
          mode === 'partner-turn' 
            ? "Partner has the conch - waiting for your turn" 
            : mode === 'speaking'
            ? "You are speaking - swipe up to pass, double-tap to pass, hold for extra time"
            : mode === 'camera-on'
            ? "Camera on - swipe up to pass, double-tap to pass, hold for extra time"
            : "You have the conch - swipe up to pass, double-tap to pass, hold for extra time"
        }
        aria-pressed={mode !== 'partner-turn'}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      >
        {/* Simple shell icon - no orange overlay */}
        <Shell className={`w-8 h-8 ${getIconColor()}`} />
        
        {mode === 'partner-turn' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-white/40" />
          </div>
        )}

        {mode === 'speaking' && (
          <div className="absolute inset-0 rounded-full border-4 border-red-300 animate-ping opacity-30" />
        )}
        
        {mode === 'camera-on' && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
        )}
      </div>

      <div className="mt-3 text-center">
        <p className={`text-sm font-medium ${mode === 'partner-turn' ? 'text-pink-300' : 'text-white'}`}>
          {mode === 'partner-turn' ? 'Partner speaking' : 
           mode === 'speaking' ? 'You\'re speaking' :
           mode === 'camera-on' ? 'Camera on' : 'Your turn'}
        </p>
      </div>
    </div>
  );
}
