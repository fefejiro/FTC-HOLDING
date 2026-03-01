import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Users, MessageCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConversationMember {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  profileImageUrl: string | null;
}

interface Conversation {
  id: string;
  name: string | null;
  type: 'direct' | 'group';
  createdBy: string;
  createdAt: string;
  members: ConversationMember[];
}

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation | null) => void;
  selectedConversationId?: string;
}

export function ConversationList({ onSelectConversation, selectedConversationId }: ConversationListProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: !!user,
  });

  const deleteConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      await apiRequest("DELETE", `/api/conversations/${conversationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      onSelectConversation(null); // Clear selection after delete
      toast({
        title: "Conversation deleted",
        description: "The conversation has been removed successfully",
        duration: 3000,
      });
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  // Auto-select first conversation on initial load
  useEffect(() => {
    if (conversations.length > 0 && !selectedConversationId) {
      onSelectConversation(conversations[0]);
    }
  }, [conversations, selectedConversationId, onSelectConversation]);

  const getAvatarContent = (profileImageUrl: string | null) => {
    if (profileImageUrl?.startsWith("emoji:")) {
      return <div className="text-2xl">{profileImageUrl.replace("emoji:", "")}</div>;
    }
    if (profileImageUrl) {
      return <AvatarImage src={profileImageUrl} />;
    }
    return (
      <AvatarFallback>
        <User className="h-4 w-4" />
      </AvatarFallback>
    );
  };

  const getConversationRowClasses = (isSelected: boolean) => {
    return cn(
      "w-full p-3 rounded-lg transition-all hover-elevate active-elevate-2",
      isSelected ? "bg-purple-100 dark:bg-purple-950/30" : "hover:bg-muted/50"
    );
  };

  const getConversationLabel = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return conversation.name || 'Family Group';
    }
    // For direct messages, show the other person's name with smart fallback
    const otherMember = conversation.members.find((m) => m.id !== user?.id);
    if (!otherMember) return 'Unknown';
    
    // Priority: displayName → firstName + lastName → email → 'Unknown'
    if (otherMember.displayName) return otherMember.displayName;
    
    const fullName = [otherMember.firstName, otherMember.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();
    if (fullName) return fullName;
    
    if (otherMember.email) return otherMember.email;
    
    return 'Unknown';
  };

  const getConversationSubtext = (conversation: Conversation) => {
    if (conversation.type === 'group') {
      return `${conversation.members.length} members`;
    }
    return '1:1 Chat';
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-2 text-muted-foreground">
        <MessageCircle className="h-4 w-4" />
        <span className="text-sm">Loading conversations...</span>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 p-6 text-center">
        <div className="bg-gradient-to-br from-purple-100 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-full p-4 shadow-md">
          <MessageCircle className="h-9 w-9 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="space-y-2">
          <p className="font-bold text-lg text-foreground">Start Connecting</p>
          <p className="text-sm text-muted-foreground max-w-[260px] leading-relaxed">
            Share your invite code with your co-parent to begin messaging and coordinating together.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full pt-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => setLocation('/settings')}
            className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
            data-testid="button-invite-partner"
          >
            Share Invite Code
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-1" data-testid="conversation-list">
        {conversations.map((conversation: Conversation) => {
          const isSelected = conversation.id === selectedConversationId;
          const isGroup = conversation.type === 'group';
          
          return (
            <div key={conversation.id} className="relative group">
              <Button
                variant={isSelected ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 h-auto py-2 pr-12",
                  isSelected && "toggle-elevate toggle-elevated"
                )}
                onClick={() => onSelectConversation(conversation)}
                data-testid={`button-conversation-${conversation.id}`}
              >
                <Avatar className="h-8 w-8">
                  {isGroup ? (
                    <AvatarFallback>
                      <Users className="h-4 w-4" />
                    </AvatarFallback>
                  ) : (
                    getAvatarContent(
                      conversation.members.find((m: ConversationMember) => m.id !== user?.id)?.profileImageUrl || null
                    )
                  )}
                </Avatar>
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="font-medium truncate w-full text-left">
                    {getConversationLabel(conversation)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {getConversationSubtext(conversation)}
                  </span>
                </div>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setConversationToDelete(conversation);
                  setDeleteDialogOpen(true);
                }}
                data-testid={`button-delete-conversation-${conversation.id}`}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-conversation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (conversationToDelete) {
                  deleteConversation.mutate(conversationToDelete.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
