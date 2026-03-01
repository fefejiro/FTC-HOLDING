import { ChevronLeft, ChevronRight } from "lucide-react";

interface SwipeIndicatorProps {
  direction: "left" | "right" | "both";
  position?: "top" | "bottom";
  visible?: boolean;
}

export function SwipeIndicator({ direction, position = "bottom", visible = true }: SwipeIndicatorProps) {
  if (!visible) return null;

  // Only show on desktop
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  if (!isDesktop) return null;

  return (
    <div className={`fixed ${position === 'bottom' ? 'bottom-8' : 'top-1/2 -translate-y-1/2'} left-0 right-0 pointer-events-none flex justify-between items-center px-4 z-40`}>
      {(direction === "left" || direction === "both") && (
        <div className="animate-pulse">
          <ChevronLeft className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      {(direction === "right" || direction === "both") && (
        <div className="animate-pulse ml-auto">
          <ChevronRight className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
