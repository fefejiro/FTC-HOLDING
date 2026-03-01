import { useEffect, useState } from 'react';
import { handleVersionChange, getCurrentVersion } from '@/lib/versionManager';
import { RefreshCw } from 'lucide-react';

export function VersionGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkVersion() {
      try {
        const { didClearCache, versionInfo } = await handleVersionChange();
        
        if (!mounted) return;
        
        if (didClearCache) {
          setIsClearing(true);
          console.log('[VersionGuard] Cache cleared, reloading app...');
          
          await new Promise(resolve => setTimeout(resolve, 800));
          
          window.location.reload();
          return;
        }
        
        setIsReady(true);
      } catch (e) {
        console.error('[VersionGuard] Version check failed:', e);
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    checkVersion();
    
    return () => {
      mounted = false;
    };
  }, []);

  if (isClearing) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center gap-4 z-[9999]">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">Updating to v{getCurrentVersion()}...</p>
      </div>
    );
  }

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
