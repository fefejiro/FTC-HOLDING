import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Capacitor } from "@capacitor/core";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getApiBaseUrl } from "@/lib/queryClient";

function boolLabel(value: boolean): "Configured" | "Missing" {
  return value ? "Configured" : "Missing";
}

export default function HealthPanelPage() {
  const [, setLocation] = useLocation();

  const envConfig = useMemo(
    () => ({
      apiBaseConfigured: Boolean((import.meta.env.VITE_API_BASE_URL || "").trim()),
      supabaseUrlConfigured: Boolean((import.meta.env.VITE_SUPABASE_URL || "").trim()),
      supabaseAnonConfigured: Boolean((import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim()),
    }),
    [],
  );

  const apiBaseUrl = useMemo(() => getApiBaseUrl(), []);
  const apiHealthUrl = `${apiBaseUrl.replace(/\/+$/, "")}/health`;

  const {
    data: apiHealth,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["health-panel", "api-health", apiHealthUrl],
    queryFn: async () => {
      const response = await fetch(apiHealthUrl, {
        method: "GET",
        credentials: "include",
      });

      return {
        ok: response.ok,
        status: response.status,
      };
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Health Panel</CardTitle>
          <CardDescription>Runtime checks for production and mobile troubleshooting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Runtime</span>
            <Badge variant="outline">
              {Capacitor.isNativePlatform() ? `native-${Capacitor.getPlatform()}` : "web"}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Mode</span>
            <Badge variant="outline">{import.meta.env.DEV ? "development" : "production"}</Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Effective API Base URL</span>
            <span className="text-sm font-medium break-all text-right">{apiBaseUrl}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Environment Presence</CardTitle>
          <CardDescription>Only configuration presence is shown. Secret values are never displayed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">VITE_API_BASE_URL</span>
            <Badge variant={envConfig.apiBaseConfigured ? "default" : "destructive"}>
              {boolLabel(envConfig.apiBaseConfigured)}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">VITE_SUPABASE_URL</span>
            <Badge variant={envConfig.supabaseUrlConfigured ? "default" : "destructive"}>
              {boolLabel(envConfig.supabaseUrlConfigured)}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm">VITE_SUPABASE_ANON_KEY</span>
            <Badge variant={envConfig.supabaseAnonConfigured ? "default" : "destructive"}>
              {boolLabel(envConfig.supabaseAnonConfigured)}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Health</CardTitle>
          <CardDescription>GET {apiHealthUrl}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">Status</span>
            {isLoading || isFetching ? (
              <Badge variant="outline">Checking...</Badge>
            ) : apiHealth ? (
              <Badge variant={apiHealth.ok ? "default" : "destructive"}>
                {apiHealth.status}
              </Badge>
            ) : (
              <Badge variant="destructive">Unavailable</Badge>
            )}
          </div>
          {error ? (
            <p className="text-sm text-destructive">
              {(error as Error).message || "API health check failed."}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => refetch()} disabled={isLoading || isFetching} data-testid="button-health-recheck">
              Re-check API
            </Button>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-health-home">
              Return Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
