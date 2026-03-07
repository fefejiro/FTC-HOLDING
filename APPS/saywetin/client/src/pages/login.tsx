import { useEffect } from "react";
import { getApiUrl } from "@/lib/api-config";

export default function Login() {
  useEffect(() => {
    window.location.href = getApiUrl("/api/login");
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <p className="text-muted-foreground" data-testid="text-login-redirect">Dey take you go login...</p>
    </div>
  );
}
