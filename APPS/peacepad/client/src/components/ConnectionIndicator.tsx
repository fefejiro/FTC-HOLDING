import { useState, useEffect, memo } from 'react';
import { Signal, SignalHigh, SignalMedium, SignalLow, WifiOff } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Connection quality levels
export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';

export interface ConnectionStats {
  rtt?: number; // Round Trip Time in ms
  packetLoss?: number; // Packet loss percentage
  jitter?: number; // Jitter in ms
  bandwidth?: number; // Available bandwidth in kbps
  timestamp: number;
}

interface ConnectionIndicatorProps {
  stats: ConnectionStats | null;
  className?: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// Calculate connection quality based on network stats
export function calculateQuality(stats: ConnectionStats | null): ConnectionQuality {
  if (!stats) return 'disconnected';
  
  const { rtt, packetLoss } = stats;
  
  // Check if we have the minimum required stats
  if (rtt === undefined && packetLoss === undefined) {
    return 'disconnected';
  }
  
  // Calculate quality based on thresholds
  const rttValue = rtt ?? 0;
  const lossValue = packetLoss ?? 0;
  
  if (rttValue < 150 && lossValue < 1) {
    return 'excellent';
  } else if (rttValue < 300 && lossValue < 3) {
    return 'good';
  } else if (rttValue < 500 && lossValue < 5) {
    return 'fair';
  } else {
    return 'poor';
  }
}

// Format stats for display
function formatStats(stats: ConnectionStats | null): string[] {
  if (!stats) return ['No connection data'];
  
  const lines: string[] = [];
  
  if (stats.rtt !== undefined) {
    lines.push(`Latency: ${Math.round(stats.rtt)}ms`);
  }
  
  if (stats.packetLoss !== undefined) {
    lines.push(`Packet Loss: ${stats.packetLoss.toFixed(1)}%`);
  }
  
  if (stats.jitter !== undefined) {
    lines.push(`Jitter: ${Math.round(stats.jitter)}ms`);
  }
  
  if (stats.bandwidth !== undefined) {
    const mbps = (stats.bandwidth / 1000).toFixed(1);
    lines.push(`Bandwidth: ${mbps} Mbps`);
  }
  
  if (lines.length === 0) {
    lines.push('Measuring connection...');
  }
  
  return lines;
}

// Get icon component based on quality
function getQualityIcon(quality: ConnectionQuality, size: string) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
  
  switch (quality) {
    case 'excellent':
      return <Signal className={iconSize} />;
    case 'good':
      return <SignalHigh className={iconSize} />;
    case 'fair':
      return <SignalMedium className={iconSize} />;
    case 'poor':
      return <SignalLow className={iconSize} />;
    case 'disconnected':
      return <WifiOff className={iconSize} />;
  }
}

// Get quality color classes
function getQualityColorClasses(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'text-green-500 dark:text-green-400';
    case 'good':
      return 'text-yellow-500 dark:text-yellow-400';
    case 'fair':
      return 'text-orange-500 dark:text-orange-400';
    case 'poor':
      return 'text-red-500 dark:text-red-400 animate-pulse';
    case 'disconnected':
      return 'text-muted-foreground opacity-50';
  }
}

// Get quality label
function getQualityLabel(quality: ConnectionQuality): string {
  switch (quality) {
    case 'excellent':
      return 'Excellent Connection';
    case 'good':
      return 'Good Connection';
    case 'fair':
      return 'Fair Connection';
    case 'poor':
      return 'Poor Connection';
    case 'disconnected':
      return 'No Connection';
  }
}

export const ConnectionIndicator = memo(function ConnectionIndicator({
  stats,
  className,
  showDetails = false,
  size = 'md',
}: ConnectionIndicatorProps) {
  const [quality, setQuality] = useState<ConnectionQuality>('disconnected');
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Calculate quality when stats change
  useEffect(() => {
    const newQuality = calculateQuality(stats);
    
    if (newQuality !== quality) {
      setIsTransitioning(true);
      setQuality(newQuality);
      
      // Reset transition state after animation
      const timeout = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [stats, quality]);
  
  const icon = getQualityIcon(quality, size);
  const colorClasses = getQualityColorClasses(quality);
  const label = getQualityLabel(quality);
  const details = formatStats(stats);
  
  // Base component without tooltip (for when showDetails is true)
  const indicator = (
    <div
      className={cn(
        'flex items-center gap-2 transition-all duration-300',
        isTransitioning && 'scale-110',
        className
      )}
      data-testid="connection-indicator"
    >
      <div className={cn('flex items-center', colorClasses)}>
        {icon}
      </div>
      {showDetails && (
        <div className="flex flex-col">
          <span className={cn('text-xs font-medium', colorClasses)}>
            {label}
          </span>
          {details.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {details[0]}
            </span>
          )}
        </div>
      )}
    </div>
  );
  
  // Wrap with tooltip if not showing details inline
  if (!showDetails) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicator}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">{label}</p>
              {details.map((detail, index) => (
                <p key={index} className="text-xs text-muted-foreground">
                  {detail}
                </p>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return indicator;
});

// Connection quality bars visualization (alternative style)
export const ConnectionBars = memo(function ConnectionBars({
  quality,
  className,
  size = 'md',
}: {
  quality: ConnectionQuality;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const barHeight = size === 'sm' ? 'h-2' : size === 'lg' ? 'h-4' : 'h-3';
  const barWidth = size === 'sm' ? 'w-0.5' : size === 'lg' ? 'w-1.5' : 'w-1';
  const gap = size === 'sm' ? 'gap-0.5' : size === 'lg' ? 'gap-1' : 'gap-0.5';
  
  const levels = {
    excellent: 4,
    good: 3,
    fair: 2,
    poor: 1,
    disconnected: 0,
  };
  
  const activeLevel = levels[quality];
  const colorClasses = getQualityColorClasses(quality);
  
  return (
    <div
      className={cn('flex items-end', gap, className)}
      data-testid="connection-bars"
    >
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          className={cn(
            barWidth,
            'transition-all duration-300 rounded-sm',
            level <= activeLevel ? colorClasses : 'bg-muted',
            level === 1 && barHeight,
            level === 2 && cn(barHeight, size === 'sm' ? 'h-3' : size === 'lg' ? 'h-6' : 'h-4'),
            level === 3 && cn(barHeight, size === 'sm' ? 'h-4' : size === 'lg' ? 'h-8' : 'h-5'),
            level === 4 && cn(barHeight, size === 'sm' ? 'h-5' : size === 'lg' ? 'h-10' : 'h-6'),
            quality === 'poor' && level <= activeLevel && 'animate-pulse'
          )}
        />
      ))}
    </div>
  );
});