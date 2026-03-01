import { Loader2, RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  pullProgress: number;
  shouldRefresh: boolean;
  isPulling: boolean;
}

export function PullToRefreshIndicator({
  pullDistance,
  pullProgress,
  shouldRefresh,
  isPulling,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isPulling) return null;

  const rotation = pullProgress * 360;
  const opacity = Math.min(pullProgress, 1);

  return (
    <div
      className="absolute top-0 left-0 right-0 flex justify-center items-center pointer-events-none z-10"
      style={{
        height: `${pullDistance}px`,
        opacity,
        transition: isPulling ? 'none' : 'height 0.3s ease-out, opacity 0.3s ease-out',
      }}
    >
      <div className="bg-background border rounded-full p-2 shadow-lg">
        {shouldRefresh && isPulling ? (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        ) : (
          <RefreshCw
            className="h-5 w-5 text-muted-foreground"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isPulling ? 'none' : 'transform 0.3s ease-out',
            }}
          />
        )}
      </div>
    </div>
  );
}
