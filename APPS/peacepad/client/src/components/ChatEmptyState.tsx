import { MessageCircle } from "lucide-react";

export function ChatEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="mb-4 flex justify-center">
          <MessageCircle className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-1">Messages</h2>
        <p className="text-sm text-muted-foreground">
          Start a conversation with your co-parent
        </p>
      </div>
    </div>
  );
}
