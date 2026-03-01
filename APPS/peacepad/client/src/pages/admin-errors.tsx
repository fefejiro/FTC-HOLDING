import { useState } from "react";
import { errorLogger, LoggedError } from "@/lib/errorLogger";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Download, Trash2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AdminErrorsPage() {
  const [errors, setErrors] = useState<LoggedError[]>(errorLogger.getErrors());
  const { toast } = useToast();

  const refresh = () => {
    setErrors(errorLogger.getErrors());
  };

  const clearErrors = () => {
    errorLogger.clearErrors();
    setErrors([]);
    toast({
      title: "Errors cleared",
      description: "All logged errors have been deleted",
    });
  };

  const exportErrors = () => {
    const json = errorLogger.exportErrors();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `peacepad-errors-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: "Errors exported",
      description: "Error log downloaded successfully",
    });
  };

  const getTypeBadgeVariant = (type: LoggedError['type']) => {
    switch (type) {
      case 'react': return 'destructive';
      case 'api': return 'default';
      case 'network': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen-dvh bg-background p-4 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-errors-title">Error Logs</h1>
            <p className="text-muted-foreground mt-1">
              Frontend error tracking for beta testing
            </p>
          </div>
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {errors.length} Logged Error{errors.length !== 1 ? 's' : ''}
                </CardTitle>
                <CardDescription>
                  Errors are stored locally in browser storage
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={refresh}
                  variant="outline"
                  size="sm"
                  data-testid="button-refresh-errors"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={exportErrors}
                  variant="outline"
                  size="sm"
                  disabled={errors.length === 0}
                  data-testid="button-export-errors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button
                  onClick={clearErrors}
                  variant="destructive"
                  size="sm"
                  disabled={errors.length === 0}
                  data-testid="button-clear-errors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {errors.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No errors logged yet</p>
                <p className="text-sm mt-1">This is a good sign!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {errors.map((error) => (
                  <Card key={error.id} className="border-l-4 border-l-destructive">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={getTypeBadgeVariant(error.type)}>
                              {error.type}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {format(error.timestamp, 'PPpp')}
                            </span>
                          </div>
                          <p className="font-semibold text-destructive" data-testid={`text-error-message-${error.id}`}>
                            {error.message}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {error.url && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">URL:</p>
                          <p className="text-sm font-mono break-all">{error.url}</p>
                        </div>
                      )}
                      {error.userId && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">User ID:</p>
                          <p className="text-sm font-mono">{error.userId}</p>
                        </div>
                      )}
                      {error.partnershipId && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Partnership ID:</p>
                          <p className="text-sm font-mono">{error.partnershipId}</p>
                        </div>
                      )}
                      {error.stack && (
                        <details className="mt-2">
                          <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                            Stack Trace
                          </summary>
                          <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-64 font-mono">
                            {error.stack}
                          </pre>
                        </details>
                      )}
                      {error.context && (
                        <details className="mt-2">
                          <summary className="text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground">
                            Additional Context
                          </summary>
                          <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto max-h-64 font-mono">
                            {JSON.stringify(error.context, null, 2)}
                          </pre>
                        </details>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
