import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShareToChatButtonProps {
  itemType: "event" | "expense" | "task";
  itemId: string;
  itemTitle: string;
  variant?: "ghost" | "outline" | "default";
  size?: "icon" | "sm" | "default";
}

interface Conversation {
  id: string;
  name: string | null;
  type: "direct" | "group";
  members: { id: string; displayName: string | null }[];
}

export function ShareToChatButton({
  itemType,
  itemId,
  itemTitle,
  variant = "ghost",
  size = "icon",
}: ShareToChatButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const shareMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await apiRequest("POST", "/api/messages/share", {
        conversationId,
        itemType,
        itemId,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setDialogOpen(false);
      toast({
        title: "Shared to chat",
        description: `${itemTitle} has been shared with your co-parent.`,
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Failed to share",
        description: "Could not share item to chat. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleShare = (conversationId: string) => {
    shareMutation.mutate(conversationId);
  };

  const directConversations = conversations.filter((c) => c.type === "direct");

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={(e) => {
          e.stopPropagation();
          if (directConversations.length === 1) {
            handleShare(directConversations[0].id);
          } else {
            setDialogOpen(true);
          }
        }}
        disabled={shareMutation.isPending}
        data-testid={`button-share-${itemType}-${itemId}`}
        title={`Share ${itemType} to chat`}
      >
        <Share2 className="h-4 w-4" />
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share to Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-4">
            {conversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No conversations available. Connect with your co-parent first.
              </p>
            ) : (
              conversations.map((conv) => (
                <Button
                  key={conv.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleShare(conv.id)}
                  disabled={shareMutation.isPending}
                  data-testid={`button-share-to-${conv.id}`}
                >
                  {conv.name || conv.members.map((m) => m.displayName || "User").join(", ")}
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
