import { useState, useRef, ReactNode } from 'react';
import { Trash2, Edit } from 'lucide-react';
import { hapticSwipe } from '@/lib/haptics';

interface SwipeableCardProps {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export function SwipeableCard({ children, onEdit, onDelete, className = '' }: SwipeableCardProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const hasStarted = useRef(false);
  const hasVibrated = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    try {
      if (!e.touches || e.touches.length === 0) return;
      startX.current = e.touches[0].clientX;
      hasStarted.current = true;
      setIsDragging(true);
    } catch (error) {
      console.error('[SwipeableCard] Touch start error:', error);
      hasStarted.current = false;
      setIsDragging(false);
      setOffset(0);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    try {
      if (!isDragging || !hasStarted.current) return;
      if (!e.touches || e.touches.length === 0) return;
      
      currentX.current = e.touches[0].clientX;
      const diff = currentX.current - startX.current;
      // Limit swipe range
      const limitedDiff = Math.max(-150, Math.min(150, diff));
      setOffset(limitedDiff);
      
      // Haptic feedback when reaching threshold
      if (!hasVibrated.current && (Math.abs(limitedDiff) >= 80)) {
        hapticSwipe();
        hasVibrated.current = true;
      } else if (hasVibrated.current && Math.abs(limitedDiff) < 80) {
        hasVibrated.current = false;
      }
    } catch (error) {
      console.error('[SwipeableCard] Touch move error:', error);
      setIsDragging(false);
      setOffset(0);
    }
  };

  const handleTouchEnd = () => {
    try {
      if (!hasStarted.current) return;
      
      setIsDragging(false);
      hasStarted.current = false;
      hasVibrated.current = false;
      
      // Swipe right to delete (threshold: 80px)
      if (offset > 80) {
        try {
          onDelete();
        } catch (error) {
          console.error('[SwipeableCard] Delete callback error:', error);
        }
      }
      // Swipe left to edit (threshold: -80px)
      else if (offset < -80) {
        try {
          onEdit();
        } catch (error) {
          console.error('[SwipeableCard] Edit callback error:', error);
        }
      }
      
      // Reset position
      setOffset(0);
    } catch (error) {
      console.error('[SwipeableCard] Touch end error:', error);
      setIsDragging(false);
      setOffset(0);
      hasStarted.current = false;
      hasVibrated.current = false;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    try {
      if (!e || typeof e.clientX !== 'number') return;
      startX.current = e.clientX;
      hasStarted.current = true;
      setIsDragging(true);
    } catch (error) {
      console.error('[SwipeableCard] Mouse down error:', error);
      hasStarted.current = false;
      setIsDragging(false);
      setOffset(0);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    try {
      if (!isDragging || !hasStarted.current) return;
      if (!e || typeof e.clientX !== 'number') return;
      
      currentX.current = e.clientX;
      const diff = currentX.current - startX.current;
      const limitedDiff = Math.max(-150, Math.min(150, diff));
      setOffset(limitedDiff);
    } catch (error) {
      console.error('[SwipeableCard] Mouse move error:', error);
      setIsDragging(false);
      setOffset(0);
    }
  };

  const handleMouseUp = () => {
    try {
      if (!hasStarted.current) return;
      
      setIsDragging(false);
      hasStarted.current = false;
      hasVibrated.current = false;
      
      if (offset > 80) {
        try {
          onDelete();
        } catch (error) {
          console.error('[SwipeableCard] Delete callback error:', error);
        }
      } else if (offset < -80) {
        try {
          onEdit();
        } catch (error) {
          console.error('[SwipeableCard] Edit callback error:', error);
        }
      }
      
      setOffset(0);
    } catch (error) {
      console.error('[SwipeableCard] Mouse up error:', error);
      setIsDragging(false);
      setOffset(0);
      hasStarted.current = false;
      hasVibrated.current = false;
    }
  };

  // Calculate opacity and scale for action indicators
  const deleteOpacity = Math.min(1, Math.abs(offset) / 80);
  const editOpacity = Math.min(1, Math.abs(offset) / 80);
  const deleteScale = offset > 0 ? 0.8 + (deleteOpacity * 0.2) : 1;
  const editScale = offset < 0 ? 0.8 + (editOpacity * 0.2) : 1;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background actions */}
      <div className="absolute inset-0 flex items-center justify-between px-6">
        <div 
          className="flex items-center gap-2 text-destructive transition-all duration-200"
          style={{
            opacity: offset > 0 ? deleteOpacity : 0,
            transform: `scale(${deleteScale})`,
          }}
        >
          <Trash2 className="h-5 w-5" />
          <span className="font-medium text-sm">Delete</span>
        </div>
        <div 
          className="flex items-center gap-2 text-primary transition-all duration-200"
          style={{
            opacity: offset < 0 ? editOpacity : 0,
            transform: `scale(${editScale})`,
          }}
        >
          <span className="font-medium text-sm">Edit</span>
          <Edit className="h-5 w-5" />
        </div>
      </div>
      
      {/* Swipeable content */}
      <div
        className={className}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          touchAction: 'pan-y',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          try {
            if (isDragging) {
              setIsDragging(false);
              setOffset(0);
              hasStarted.current = false;
              hasVibrated.current = false;
            }
          } catch (error) {
            console.error('[SwipeableCard] Mouse leave error:', error);
            setIsDragging(false);
            setOffset(0);
            hasStarted.current = false;
            hasVibrated.current = false;
          }
        }}
      >
        {children}
      </div>
    </div>
  );
}
