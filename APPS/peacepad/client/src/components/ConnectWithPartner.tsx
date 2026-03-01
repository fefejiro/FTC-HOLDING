import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Copy, Check, Link as LinkIcon, Users, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { JoinPartnershipDialog } from "@/components/JoinPartnershipDialog";
import type { Partnership } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ConnectWithPartnerProps {
  /** Optional custom title (defaults to "Connect with Co-Parent") */
  title?: string;
  /** Optional custom subtitle (defaults to "Share your invite code to get started") */
  subtitle?: string;
  /** If true, shows compact version without QR code */
  compact?: boolean;
}

/**
 * Displays invite code, QR code, and partnership connection options.
 * Shows when user has no active partnership and needs to connect.
 */
export function ConnectWithPartner({ 
  title = "Connect with Co-Parent",
  subtitle = "Share your invite code to get started",
  compact = false 
}: ConnectWithPartnerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const hasRedirectedRef = useRef(false);
  const [showNoPartnerHint, setShowNoPartnerHint] = useState(true);
  
  // Auto-dismiss the hint after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNoPartnerHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch partnerships - cache for 30 seconds
  const { data: partnerships = [] } = useQuery<Partnership[]>({
    queryKey: ['/api/partnerships'],
    staleTime: 30000,
    enabled: !!user,
  });

  // Check if we now have an active partnership with a co-parent
  const activePartnership = partnerships.find(
    (p) => p.user1Id && p.user2Id && p.status === 'active'
  );

  // Redirect to chat when partnership is formed
  useEffect(() => {
    if (activePartnership && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      console.log('[ConnectWithPartner] Partnership detected, redirecting to chat');
      toast({
        title: "Connected!",
        description: "Your co-parent has joined. Redirecting to chat...",
        duration: 3000,
      });
      setTimeout(() => {
        window.location.href = "/chat";
      }, 500);
    }
  }, [activePartnership, toast]);

  const inviteCode = user?.inviteCode;
  const inviteLink = inviteCode ? `${window.location.origin}/join/${inviteCode}` : "";
  const shareMessage = `I'm using PeacePad for co-parenting coordination. Join me: ${inviteLink}`;

  const copyInviteCodeOnly = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      setInviteCodeCopied(true);
      toast({
        title: "Invite code copied!",
        description: "Share this code with your co-parent",
        duration: 3000,
      });
      setTimeout(() => setInviteCodeCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the code manually",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteLinkCopied(true);
      toast({ 
        title: "Link copied!", 
        description: "Share this link with your co-parent", 
        duration: 3000 
      });
      setTimeout(() => setInviteLinkCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleShareInvite = async () => {
    const shareData = {
      title: "Join me on PeacePad",
      text: shareMessage,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast({ 
          title: "Shared!", 
          description: "Invite sent successfully", 
          duration: 3000 
        });
      } else {
        await navigator.clipboard.writeText(shareMessage);
        toast({ 
          title: "Copied to clipboard!", 
          description: "Share this message with your co-parent", 
          duration: 3000 
        });
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast({ 
          title: "Failed to share", 
          description: "Please try copying the code instead", 
          variant: "destructive",
          duration: 5000 
        });
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 max-w-md mx-auto">
      {/* Minimal header - just icon and brief text */}
      <div className="text-center mb-8">
        <div className="mb-4 flex justify-center">
          <Users className="h-12 w-12 text-primary" />
        </div>
        <h2 className="text-xl font-semibold mb-1" data-testid="text-connect-title">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground" data-testid="text-connect-subtitle">{subtitle}</p>
        )}
      </div>

      {/* QR Code (if not compact) */}
      {!compact && inviteLink && (
        <div className="w-full flex justify-center p-4 bg-white dark:bg-card rounded-xl border mb-6">
          <div className="w-40 h-40 flex-shrink-0 flex items-center justify-center">
            <QRCodeSVG 
              value={inviteLink} 
              size={160} 
              level="M"
              data-testid="qr-code-invite"
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Share Actions - Compact */}
      <div className="w-full space-y-3">
        <Button
          variant="default"
          size="lg"
          onClick={handleShareInvite}
          disabled={!inviteLink}
          data-testid="button-share-invite"
          className="w-full"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share Link
        </Button>

        {/* Simple divider */}
        <div className="text-center text-sm text-muted-foreground py-2">
          Or if you received a code:
        </div>

        {/* Enter Their Code */}
        <JoinPartnershipDialog 
          trigger={
            <Button 
              variant="outline" 
              size="lg"
              className="w-full"
              data-testid="button-enter-their-code"
            >
              Enter Their Code
            </Button>
          }
        />
      </div>
      
      {/* Subtle auto-dismissing hint about chat being unavailable */}
      <div 
        className={cn(
          "fixed bottom-20 left-1/2 -translate-x-1/2 max-w-[320px] w-[calc(100%-32px)] px-4 py-3 bg-muted/95 backdrop-blur-sm rounded-xl border shadow-lg",
          "flex items-center gap-3 transition-all duration-500",
          showNoPartnerHint 
            ? "opacity-100 translate-y-0" 
            : "opacity-0 translate-y-4 pointer-events-none"
        )}
        data-testid="hint-no-partner-chat"
      >
        <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <p className="text-sm text-muted-foreground">
          Connect with a co-parent to start messaging
        </p>
      </div>
    </div>
  );
}
