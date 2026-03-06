import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function ForceRefreshButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [buildId, setBuildId] = useState<string>('');
  const { toast } = useToast();
  
  // Only show in development mode
  if (!import.meta.env.DEV) {
    return null;
  }
  
  // Fetch build ID from server
  useEffect(() => {
    fetch(`/_peacepad/build-meta.json?ts=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data?.deployedAt) {
          const date = new Date(data.deployedAt);
          if (!Number.isNaN(date.getTime())) {
            setBuildId(date.toLocaleTimeString());
            return;
          }
        }

        if (data?.webBuildId) {
          setBuildId(String(data.webBuildId).slice(0, 8));
          return;
        }

        setBuildId('unknown');
      })
      .catch(() => setBuildId('unknown'));
  }, []);

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    
    toast({
      title: "🔄 Refreshing App",
      description: "Clearing caches...",
      duration: 3000,
    });

    try {
      // Clear all caches and wait for completion
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Unregister service worker and wait for completion
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // Hard reload after cache clearing completes
      window.location.reload();
    } catch (error) {
      console.error('Force refresh error:', error);
      // Reload anyway
      window.location.reload();
    }
  };

  return (
    <div
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2"
      data-testid="force-refresh-container"
    >
      <Button
        onClick={handleForceRefresh}
        disabled={isRefreshing}
        size="sm"
        variant="outline"
        className="shadow-md gap-1.5 h-8 text-xs"
        data-testid="button-force-refresh"
      >
        <RotateCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
        {isRefreshing ? 'Refreshing...' : 'Reload'}
      </Button>
      {buildId && (
        <span className="text-xs text-muted-foreground bg-background/90 px-1.5 py-0.5 rounded border border-border/50">
          v{buildId}
        </span>
      )}
    </div>
  );
}
