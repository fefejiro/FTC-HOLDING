import { type KeyboardEvent } from "react";
import conchArtwork from "@assets/orange_conch_shell.png";

interface ConchShellProps {
  isActive: boolean;
  moodColor: string;
  onTap: () => void;
  onLongPress: () => void;
  isPassing?: boolean; // Animation state when passing conch
  passDirection?: 'to-partner' | 'to-you'; // Which direction it's passing
  conchPicture?: string | null; // Custom conch picture from partnership (optional)
}

export function ConchShell({ isActive, moodColor, onTap, onLongPress, isPassing = false, passDirection = 'to-partner', conchPicture }: ConchShellProps) {
  // Use custom conch picture if provided, otherwise fall back to default
  const imageSource = conchPicture || conchArtwork;
  let longPressTimer: NodeJS.Timeout;
  let lastTapTime = 0;
  let tapDebounceTimer: NodeJS.Timeout;
  let keyPressStartTime = 0;

  const handleTouchStart = () => {
    longPressTimer = setTimeout(() => {
      onLongPress();
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    }, 2000); // 2 second long press
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimer);
  };

  const debouncedTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;
    
    // Always call onTap to let parent handle double-tap detection
    onTap();
    
    // Double-tap detection window: 300ms (aligned with handleConchTap)
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double-tap detected - provide haptic feedback
      clearTimeout(tapDebounceTimer);
      lastTapTime = 0;
      
      // Haptic feedback for double-tap
      if ('vibrate' in navigator) {
        navigator.vibrate([50, 50, 50]); // Double vibration
      }
      return;
    }
    
    // First tap or tap after double-tap window
    lastTapTime = now;
    
    // Clear any existing debounce timer
    clearTimeout(tapDebounceTimer);
    
    // Wait to see if there's a second tap
    tapDebounceTimer = setTimeout(() => {
      // No second tap came - reset
      lastTapTime = 0;
    }, 300);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    // Keyboard accessibility: Enter/Space activate the button
    const isActivationKey = event.key === 'Enter' || event.key === ' ' || event.key === 'Space';
    
    if (!isActivationKey) return;
    
    event.preventDefault(); // Prevent page scroll on Space
    
    // Track key press start time for long-press detection
    if (keyPressStartTime === 0) {
      keyPressStartTime = Date.now();
      
      // Start long-press timer (2 seconds, same as touch)
      longPressTimer = setTimeout(() => {
        onLongPress();
        keyPressStartTime = 0; // Reset after long-press triggered
        
        // Haptic feedback for long-press
        if ('vibrate' in navigator) {
          navigator.vibrate(200);
        }
      }, 2000);
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    const isActivationKey = event.key === 'Enter' || event.key === ' ' || event.key === 'Space';
    
    if (!isActivationKey) return;
    
    event.preventDefault();
    
    // Clear long-press timer
    clearTimeout(longPressTimer);
    
    // If key was held for less than 2 seconds, treat as tap
    const pressDuration = Date.now() - keyPressStartTime;
    if (keyPressStartTime > 0 && pressDuration < 2000) {
      debouncedTap();
      
      // Haptic feedback for tap
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
    
    // Reset key press tracking
    keyPressStartTime = 0;
  };

  // Get glow color based on mood
  const getGlowColor = () => {
    const colors: Record<string, string> = {
      blue: "#3b82f6",
      green: "#10b981",
      yellow: "#f59e0b",
      orange: "#f97316",
      red: "#ef4444",
    };
    return colors[moodColor] || colors.blue;
  };

  // Get animation classes for passing
  const getPassingAnimation = () => {
    if (!isPassing) return '';
    
    if (passDirection === 'to-partner') {
      return 'animate-pass-to-partner';
    } else {
      return 'animate-pass-to-you';
    }
  };

  return (
    <div
      className={`relative cursor-pointer select-none transition-transform ${getPassingAnimation()}`}
      onClick={debouncedTap}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="conch-shell"
      style={{
        transformOrigin: 'center center',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
      role="button"
      aria-label={isActive ? "Conch is active - tap to interact, hold to pass" : "Conch is inactive"}
      aria-pressed={isActive}
      tabIndex={0}
    >
      {/* Glow effect when active */}
      {isActive && (
        <div
          className="absolute inset-0 blur-3xl animate-pulse pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${getGlowColor()}60 0%, transparent 70%)`,
            transform: 'scale(1.8)',
          }}
        />
      )}

      {/* Conch Shell Image */}
      <div className="relative w-[280px] h-[280px] flex items-center justify-center">
        <img
          src={imageSource}
          alt="Golden spiral conch shell"
          className={`
            w-full h-full object-contain
            transition-all duration-300
            ${isActive ? 'scale-105 brightness-110' : 'scale-100 brightness-90 saturate-75'}
            active:scale-95
            drop-shadow-2xl
          `}
          style={{
            filter: isActive 
              ? `drop-shadow(0 0 30px ${getGlowColor()}80) drop-shadow(0 0 60px ${getGlowColor()}40)` 
              : 'drop-shadow(0 10px 25px rgba(0,0,0,0.4))',
            clipPath: 'circle(46% at 50% 50%)',
            mixBlendMode: 'hard-light',
            WebkitTouchCallout: 'none',
            pointerEvents: 'none',
          }}
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
        />
        
        {/* Subtle glow overlay when active */}
        {isActive && (
          <div
            className="absolute inset-0 rounded-full blur-2xl animate-pulse pointer-events-none"
            style={{
              background: `radial-gradient(circle at center, ${getGlowColor()}30 0%, transparent 60%)`,
              mixBlendMode: 'screen',
            }}
          />
        )}
      </div>

      {/* Active indicator pulse ring */}
      {isActive && (
        <div
          className="absolute inset-0 border-4 animate-ping pointer-events-none"
          style={{
            borderColor: getGlowColor(),
            opacity: 0.4,
            borderRadius: '50%',
          }}
        />
      )}
      
      {/* Focus ring for accessibility */}
      <div className="absolute inset-0 rounded-full border-2 border-transparent focus-within:border-primary opacity-0 focus-within:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}
