import { Link } from "wouter";
import { ArrowRight, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function ChatEmptyState() {
  const { user } = useAuth();
  const messagePath = user?.activePartnershipId ? "/chat" : "/compose";

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mb-4 flex justify-center">
          <MessageCircle className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-1">No messages yet</h2>
        <p className="text-sm text-muted-foreground">
          Start with a calm opener, or use Prep to shape a harder message first.
        </p>
      </div>

      <div className="grid w-full gap-2 sm:grid-cols-2">
        <Link href="/prep-chat?entry=empty_state">
          <Button variant="outline" className="w-full">
            <Sparkles className="mr-2 h-4 w-4" />
            Open Prep
          </Button>
        </Link>
        <Link href={messagePath}>
          <Button className="w-full">
            <ArrowRight className="mr-2 h-4 w-4" />
            Start Message
          </Button>
        </Link>
      </div>
    </div>
  );
}
