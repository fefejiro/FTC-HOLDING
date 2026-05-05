import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api-config";

export interface AuthStatusResponse {
  loginEnabled: boolean;
  loginMethod: "oidc" | "disabled";
  oidcConfigured: boolean;
  supabaseExchangeConfigured: boolean;
  message: string;
}

async function fetchAuthStatus(): Promise<AuthStatusResponse> {
  const response = await fetch(getApiUrl("/api/auth/status"), {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to load auth status (${response.status})`);
  }

  return response.json();
}

export function useAuthStatus() {
  const query = useQuery<AuthStatusResponse>({
    queryKey: ["/api/auth/status"],
    queryFn: fetchAuthStatus,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  return {
    authStatus: query.data,
    isLoadingAuthStatus: query.isLoading,
    isAuthAvailable: query.data?.loginEnabled === true,
    authStatusError: query.error,
  };
}
