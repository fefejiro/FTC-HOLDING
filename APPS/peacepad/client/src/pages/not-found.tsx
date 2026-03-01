import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="w-full flex items-center justify-center p-4 py-20">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center">
          <div className="p-4 bg-destructive/10 dark:bg-destructive/20 rounded-full">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <p className="text-xl font-semibold text-foreground">Page Not Found</p>
          <p className="text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Button
          onClick={() => setLocation("/")}
          size="lg"
          className="w-full"
          data-testid="button-back-home"
        >
          <Home className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}
