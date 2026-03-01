import { Component, ReactNode } from 'react';
import { logReactError } from '@/lib/errorLogger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home, Trash2, Bug, Copy } from 'lucide-react';
import { announce } from './AccessibilityAnnouncer';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
  hasCleared: boolean;
}

type ErrorCategory = 'network' | 'data' | 'render' | 'unknown';

function categorizeError(error: Error): ErrorCategory {
  const message = error.message.toLowerCase();
  
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return 'network';
  }
  
  if (message.includes('undefined') || message.includes('null') || message.includes('cannot read')) {
    return 'data';
  }
  
  if (message.includes('render') || message.includes('component')) {
    return 'render';
  }
  
  return 'unknown';
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, hasCleared: false };
  }

  static getDerivedStateFromError(error: Error): State {
    announce('An error occurred. Please try one of the recovery options.', 'assertive');
    return { hasError: true, error, hasCleared: false };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    logReactError(error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.href = '/';
  };

  handleClearCache = async () => {
    try {
      // Clear localStorage
      const keysToPreserve = ['hasAcceptedConsent', 'hasSeenIntro'];
      const preserved: Record<string, string | null> = {};
      
      keysToPreserve.forEach(key => {
        preserved[key] = localStorage.getItem(key);
      });
      
      localStorage.clear();
      
      keysToPreserve.forEach(key => {
        if (preserved[key]) {
          localStorage.setItem(key, preserved[key]!);
        }
      });
      
      // Clear service worker cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      this.setState({ hasCleared: true });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Failed to clear cache:', err);
      window.location.reload();
    }
  };

  handleCopyError = () => {
    if (!this.state.error) return;
    
    const errorText = `Error: ${this.state.error.message}\n\nStack: ${this.state.error.stack || 'No stack trace'}`;
    
    navigator.clipboard.writeText(errorText).then(() => {
      announce('Error details copied to clipboard', 'polite');
    }).catch(() => {
      console.error('Failed to copy error');
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorCategory = this.state.error ? categorizeError(this.state.error) : 'unknown';
      
      const getErrorGuidance = (category: ErrorCategory): string => {
        switch (category) {
          case 'network':
            return 'This appears to be a network issue. Check your connection and try reloading.';
          case 'data':
            return 'This might be due to corrupted data. Try clearing your cache.';
          case 'render':
            return 'A component failed to render. Going back to home may help.';
          default:
            return 'An unexpected error occurred. Try one of the recovery options below.';
        }
      };

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-md w-full" data-testid="error-boundary-card">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                {getErrorGuidance(errorCategory)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {this.state.error && (
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <p className="text-sm font-mono text-muted-foreground break-words">
                    {this.state.error.message}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={this.handleCopyError}
                    className="h-auto py-1 px-2"
                    data-testid="button-copy-error"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    <span className="text-xs">Copy error details</span>
                  </Button>
                </div>
              )}
              
              {this.state.hasCleared && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                  <p className="text-sm text-green-700 dark:text-green-400">
                    Cache cleared successfully. Reloading...
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Recovery Options:</p>
                
                <div className="flex flex-col gap-2">
                  <Button 
                    onClick={() => window.location.reload()} 
                    data-testid="button-error-reload"
                    className="justify-start"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reload Page
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={this.handleReset}
                    data-testid="button-error-reset"
                    className="justify-start"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Return to Home
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={this.handleClearCache}
                    disabled={this.state.hasCleared}
                    data-testid="button-error-clear-cache"
                    className="justify-start"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cache & Reload
                  </Button>
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  This error has been automatically reported to our team. If the problem persists, please contact support at{' '}
                  <a href="mailto:peacepad@peacepad.ca" className="text-primary hover:underline">
                    peacepad@peacepad.ca
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
