import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [location, setLocation] = useLocation();
  const normalizedPath = location.toLowerCase();
  const authRedirect = useMemo(() => {
    const signupHints = [
      "signup",
      "sign-up",
      "sign_up",
      "register",
      "create-account",
      "create_account",
      "join",
    ];
    if (signupHints.some((hint) => normalizedPath.includes(hint))) {
      return "/login";
    }

    const loginHints = [
      "login",
      "log-in",
      "log_in",
      "signin",
      "sign-in",
      "sign_in",
      "/auth/",
    ];
    if (loginHints.some((hint) => normalizedPath.includes(hint))) {
      return "/login";
    }

    return null;
  }, [normalizedPath]);

  useEffect(() => {
    if (authRedirect && location !== authRedirect) {
      setLocation(authRedirect);
    }
  }, [authRedirect, location, setLocation]);

  if (authRedirect) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
        <p className="text-sm text-gray-600">Redirecting you...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
