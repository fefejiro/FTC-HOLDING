import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle, Clock, TrendingUp, X, GripVertical, BarChart3 } from 'lucide-react';
import type { ConnectionStatus } from '@/hooks/useReconnectingWebSocket';

interface MonitorSummary {
  runtime: string;
  activeUsers: number;
  activeWSConnections: number;
  totalLogs: number;
  categories: {
    errors: number;
    performance: number;
    userActions: number;
    unexpectedActions: number;
  };
  issues: {
    P1: number;
    P2: number;
    P3: number;
  };
  apiStats: Array<{
    endpoint: string;
    avg: number;
    max: number;
    min: number;
    count: number;
  }>;
  performanceMetrics: {
    average: number;
    recent: any[];
  };
  recentErrors: any[];
  recentUserActions: any[];
}

interface TestMonitorDisplayProps {
  connectionStatus?: ConnectionStatus;
}

export function TestMonitorDisplay({ connectionStatus = 'connected' }: TestMonitorDisplayProps) {
  // Only show in development mode
  const isDev = import.meta.env.DEV;
  const [location] = useLocation();
  const [summary, setSummary] = useState<MonitorSummary | null>(null);
  const [hasNewData, setHasNewData] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragEnabled, setIsDragEnabled] = useState(false); // Long-press enables drag mode
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressStartCoordsRef = useRef({ x: 0, y: 0 }); // Store coords when long-press starts
  const prevLocationRef = useRef(location);
  
  // Auto-start on dev.peacepad.ca or localhost, initially collapsed
  const isDevDomain = typeof window !== 'undefined' && 
    (window.location.hostname === 'dev.peacepad.ca' || 
     window.location.hostname === 'localhost' ||
     window.location.hostname.includes('replit.dev'));
  
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem('monitor-expanded');
    return saved === 'true';
  });

  // Position state - stored as absolute coordinates
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('monitor-position');
    if (saved) {
      return JSON.parse(saved);
    }
    // Default to top-right
    return { top: 16, right: 16 };
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, y: 0, startTop: 0, startRight: 0 });
  const dragMovedRef = useRef(false);

  // Don't render anything in production or non-dev domains
  if (!isDev || !isDevDomain) {
    return null;
  }

  // Save position to localStorage
  useEffect(() => {
    localStorage.setItem('monitor-position', JSON.stringify(position));
  }, [position]);

  // Save expanded state to localStorage
  useEffect(() => {
    localStorage.setItem('monitor-expanded', String(isExpanded));
  }, [isExpanded]);

  const handleDragStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragMovedRef.current = false; // Reset movement flag
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      startTop: position.top || 0,
      startRight: position.right || 0,
    };
  };

  const handleLongPressStart = (clientX: number, clientY: number) => {
    // Store initial coordinates
    longPressStartCoordsRef.current = { x: clientX, y: clientY };
    
    // Start long-press timer (2 seconds)
    longPressTimerRef.current = setTimeout(() => {
      setIsDragEnabled(true);
      // Immediately start dragging with stored coordinates
      handleDragStart(clientX, clientY);
      // Add haptic feedback for mobile
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 2000);
  };

  const handleLongPressCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    // Calculate deltas
    const deltaX = dragStartRef.current.x - clientX;
    const deltaY = clientY - dragStartRef.current.y;

    // If movement is significant (more than 3px), mark as moved
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      dragMovedRef.current = true;
    }

    setPosition({
      top: dragStartRef.current.startTop + deltaY,
      right: dragStartRef.current.startRight + deltaX,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsDragEnabled(false); // Reset drag mode after release
    handleLongPressCancel(); // Clear any pending long-press timer
  };

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handleLongPressStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Cancel long-press if user moves before 2 seconds
      if (!isDragEnabled) {
        handleLongPressCancel();
      }
      if (isDragging) {
        e.preventDefault();
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    handleLongPressStart(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Cancel long-press if mouse moves before it activates
      if (!isDragEnabled && longPressTimerRef.current) {
        handleLongPressCancel();
      }
      if (isDragging) {
        handleDragMove(e.clientX, e.clientY);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      } else {
        // Just cancel long-press without starting drag
        handleLongPressCancel();
      }
    };

    if (isDragging || longPressTimerRef.current) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isDragEnabled]);

  useEffect(() => {
    // Keep keyboard shortcut for legacy: Ctrl+Shift+M
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        setIsExpanded(!isExpanded);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isExpanded]);

  // Track SPA navigation changes
  useEffect(() => {
    if (prevLocationRef.current !== location) {
      const navStart = performance.now();
      const previousLocation = prevLocationRef.current; // Capture before updating
      const targetLocation = location;
      
      // Track the navigation after a short delay to measure render time
      setTimeout(() => {
        const navTime = performance.now() - navStart;
        
        fetch('/api/test-monitor/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            metric: 'spa_navigation',
            value: navTime,
            details: {
              from: previousLocation,
              to: targetLocation
            }
          })
        }).catch(console.error);
      }, 100);
      
      // Update ref after capturing the previous location
      prevLocationRef.current = location;
    }
  }, [location]);

  // Check for new data in background (every 5 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/test-monitor/summary');
        if (!res.ok) return; // Silently skip if request fails
        const data = await res.json();
        
        // If we have existing data, check if there's new data
        if (summary) {
          const hasChanges = data.totalLogs !== summary.totalLogs ||
                           data.issues.P1 !== summary.issues.P1 ||
                           data.issues.P2 !== summary.issues.P2;
          if (hasChanges) {
            setHasNewData(true);
          }
        } else {
          // First load - just set the data
          setSummary(data);
        }
      } catch (error) {
        // Silently skip errors - this is a dev tool
      }
    }, 5000); // Check every 5 seconds instead of 2

    return () => clearInterval(interval);
  }, [summary]);

  // Manual refresh handler
  const handleRefresh = async () => {
    try {
      const res = await fetch('/api/test-monitor/summary');
      if (!res.ok) return; // Silently skip if request fails
      const data = await res.json();
      setSummary(data);
      setHasNewData(false);
    } catch (error) {
      // Silently skip errors - this is a dev tool
    }
  };

  useEffect(() => {
    // Client-side error boundary
    const handleError = (event: ErrorEvent) => {
      fetch('/api/test-monitor/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: event.message,
          stack: event.error?.stack,
          priority: 'P2'
        })
      }).catch(console.error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      fetch('/api/test-monitor/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Unhandled Promise Rejection: ${event.reason}`,
          stack: event.reason?.stack,
          priority: 'P1'
        })
      }).catch(console.error);
    };

    // Track all clicks and interactions
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const testId = target.getAttribute('data-testid') || target.className || 'unknown';

      fetch('/api/test-monitor/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'click',
          target: testId,
          timestamp: new Date().toISOString(),
          viewport: `${window.innerWidth}x${window.innerHeight}`
        })
      }).catch(console.error);
    };

    // Track touch events (mobile-specific)
    const handleTouch = (event: TouchEvent) => {
      const target = event.target as HTMLElement;
      const testId = target.getAttribute('data-testid') || target.className || 'unknown';

      fetch('/api/test-monitor/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'touch',
          target: testId,
          touches: event.touches.length,
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
    };

    // Track page load performance using modern Performance API
    const trackPageLoad = () => {
      // Use modern PerformanceNavigationTiming API
      const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navEntries.length > 0) {
        const navEntry = navEntries[0];
        const loadTime = navEntry.loadEventEnd - navEntry.fetchStart;
        
        if (loadTime > 0) {
          fetch('/api/test-monitor/performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              metric: 'page_load',
              value: loadTime,
              details: {
                domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.fetchStart,
                domInteractive: navEntry.domInteractive - navEntry.fetchStart,
                url: window.location.pathname
              }
            })
          }).catch(console.error);
        }
      }
    };

    // Track navigation
    const handleNavigation = () => {
      fetch('/api/test-monitor/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'navigation',
          url: window.location.pathname,
          timestamp: new Date().toISOString()
        })
      }).catch(console.error);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    document.addEventListener('click', handleClick);
    document.addEventListener('touchstart', handleTouch);
    window.addEventListener('popstate', handleNavigation);
    
    // Track page load after load event completes to ensure accurate timing
    if (document.readyState === 'complete') {
      // Already loaded, track immediately
      setTimeout(trackPageLoad, 0);
    } else {
      // Wait for load event
      window.addEventListener('load', () => {
        setTimeout(trackPageLoad, 0);
      }, { once: true });
    }

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, []);

  const handleToggleExpand = async (e: React.MouseEvent | React.TouchEvent) => {
    // Don't toggle if we just finished dragging
    if (dragMovedRef.current) {
      dragMovedRef.current = false; // Reset for next interaction
      return;
    }
    e.stopPropagation();
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    
    // If expanding, refresh the data immediately
    if (newExpandedState) {
      handleRefresh();
    }
  };

  const totalEvents = summary?.totalLogs || 0;
  const hasIssues = (summary?.issues.P1 || 0) + (summary?.issues.P2 || 0) > 0;

  // Get connectivity status color
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-green-500';
      case 'reconnecting':
        return 'bg-yellow-500';
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusTitle = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Network connected';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'disconnected':
        return 'Network disconnected';
      default:
        return 'Unknown status';
    }
  };

  // Collapsed badge state (minimal, unobtrusive)
  if (!isExpanded) {
    return (
      <div
        ref={containerRef}
        className="fixed z-50 select-none"
        style={{
          top: `${position.top}px`,
          right: `${position.right}px`,
          cursor: isDragging ? 'grabbing' : 'default',
          opacity: isDragging ? 0.8 : 1,
          transition: isDragging ? 'none' : 'all 0.2s',
          transform: isDragEnabled && !isDragging ? 'scale(1.05)' : 'scale(1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <div 
          className={`flex items-center gap-1 bg-background/80 backdrop-blur-sm border rounded-full px-2 py-1 shadow-lg hover-elevate`}
          onClick={handleToggleExpand}
          title={hasNewData ? 'New data available - Click to view' : getStatusTitle()}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          <div className="relative">
            <BarChart3 className={`h-3 w-3 ${hasIssues ? 'text-yellow-500' : 'text-primary'}`} />
            <div 
              className={`absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full ${getStatusColor()} ${connectionStatus === 'reconnecting' ? 'animate-pulse' : ''}`}
              title={getStatusTitle()}
            />
            {hasNewData && (
              <div className="absolute -top-1 -right-1 h-1.5 w-1.5 rounded-full bg-primary opacity-60" />
            )}
          </div>
          <span className="text-xs font-medium">{totalEvents}</span>
        </div>
      </div>
    );
  }

  // Expanded state (full stats panel)
  if (!summary) {
    return (
      <div
        ref={containerRef}
        className="fixed z-50 select-none"
        style={{
          top: `${position.top}px`,
          right: `${position.right}px`,
          cursor: isDragging ? 'grabbing' : 'default',
          opacity: isDragging ? 0.8 : 1,
          transition: isDragging ? 'none' : 'all 0.2s',
          transform: isDragEnabled && !isDragging ? 'scale(1.05)' : 'scale(1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
      >
        <Card className="w-72 shadow-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
              <div 
                className={`h-2 w-2 rounded-full ${getStatusColor()} ${connectionStatus === 'reconnecting' ? 'animate-pulse' : ''}`}
                title={getStatusTitle()}
              />
              <CardTitle className="text-sm font-medium">Loading Monitor...</CardTitle>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleToggleExpand}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed z-50 select-none"
      style={{
        top: `${position.top}px`,
        right: `${position.right}px`,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.8 : 1,
        transition: isDragging ? 'none' : 'opacity 0.2s',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
    >
      <Card className="w-72 max-h-[500px] shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
            <div 
              className={`h-2 w-2 rounded-full ${getStatusColor()} ${connectionStatus === 'reconnecting' ? 'animate-pulse' : ''}`}
              title={getStatusTitle()}
            />
            <CardTitle className="text-sm font-medium">Test Monitor</CardTitle>
          </div>
          <div className="flex gap-2">
            {hasNewData && (
              <Button
                size="sm"
                variant="ghost"
                className="opacity-60 hover:opacity-100 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRefresh();
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                data-testid="button-refresh-monitor"
              >
                🔄
              </Button>
            )}
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleToggleExpand}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Runtime: {summary.runtime}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="font-semibold text-blue-600">Users: {summary.activeUsers}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <span>WS: {summary.activeWSConnections}</span>
            </div>
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Errors:</span>
              <span className="font-medium">{summary.categories.errors}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Performance:</span>
              <span className="font-medium">{summary.categories.performance}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actions:</span>
              <span className="font-medium">{summary.categories.userActions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unexpected:</span>
              <span className="font-medium">{summary.categories.unexpectedActions}</span>
            </div>
          </div>

          {/* Issue Counts */}
          <div className="flex gap-2">
            <Badge variant="destructive" className="flex-1">
              P1: {summary.issues.P1}
            </Badge>
            <Badge variant="default" className="flex-1 bg-yellow-500">
              P2: {summary.issues.P2}
            </Badge>
            <Badge variant="secondary" className="flex-1">
              P3: {summary.issues.P3}
            </Badge>
          </div>

          {/* API Performance */}
          <div>
            <h4 className="text-xs font-semibold mb-2">API Performance</h4>
            <ScrollArea className="h-32">
              {summary.apiStats.map((stat, idx) => (
                <div key={idx} className="text-xs py-1 border-b last:border-0">
                  <div className="flex justify-between">
                    <span className="truncate flex-1">{stat.endpoint}</span>
                    <span className={stat.avg > 500 ? 'text-yellow-500' : 'text-green-500'}>
                      {stat.avg}ms
                    </span>
                  </div>
                  <div className="text-muted-foreground text-[10px]">
                    min: {stat.min}ms | max: {stat.max}ms | calls: {stat.count}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Recent Errors */}
          {summary.recentErrors.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Recent Issues
              </h4>
              <ScrollArea className="h-32">
                {summary.recentErrors.map((error, idx) => (
                  <div key={idx} className="text-xs py-2 border-b last:border-0">
                    <div className="flex items-start gap-2">
                      <Badge variant={error.priority === 'P1' ? 'destructive' : 'default'} className="text-[10px] px-1">
                        {error.priority}
                      </Badge>
                      <div className="flex-1">
                        <div className="font-medium">[{error.category}]</div>
                        <div className="text-muted-foreground">{error.message}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {summary.issues.P1 === 0 && summary.issues.P2 === 0 && (
            <div className="flex items-center gap-2 text-green-600 text-sm">
              <CheckCircle className="h-4 w-4" />
              <span>No critical issues detected</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
