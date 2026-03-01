import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Copy, CheckCircle, Heart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ConnectWithCoParentBannerProps {
  userInviteCode?: string;
}

export default function ConnectWithCoParentBanner({ userInviteCode }: ConnectWithCoParentBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleCopyCode = () => {
    if (userInviteCode) {
      navigator.clipboard.writeText(userInviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinPartnership = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Please enter a code",
        description: "Paste the invite code your co-parent shared with you",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    try {
      const res = await apiRequest("POST", "/api/partnerships/join", { inviteCode: joinCode });
      if (res.ok) {
        toast({
          title: "Connected!",
          description: "You're now connected with your co-parent",
        });
        setIsOpen(false);
        setJoinCode("");
        // Invalidate auth and partnerships queries to refetch updated data
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/partnerships"] });
        await queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        // Refresh page to show new partnership
        setTimeout(() => window.location.reload(), 500);
      } else {
        const data = await res.json();
        toast({
          title: "Connection failed",
          description: data.message || "Invalid code or code has expired",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join partnership",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/10 overflow-hidden hover-elevate transition-all">
        <div className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Ready to connect?</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Invite your co-parent to PeacePad and start communicating together. Share your invite code or enter theirs.
              </p>
              <Button
                onClick={() => setIsOpen(true)}
                className="gap-2"
                data-testid="button-connect-coparent"
              >
                Connect with Co-Parent
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-connect-coparent">
          <DialogHeader>
            <DialogTitle className="text-xl">Connect with Your Co-Parent</DialogTitle>
            <DialogDescription>
              Share your code or enter theirs to start your co-parenting journey together
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="share" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="share">Share My Code</TabsTrigger>
              <TabsTrigger value="join">Join with Code</TabsTrigger>
            </TabsList>

            <TabsContent value="share" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Invite Code</label>
                <div className="flex gap-2">
                  <Input
                    value={userInviteCode || ""}
                    readOnly
                    className="font-mono text-lg font-semibold text-center bg-muted"
                    data-testid="input-invite-code"
                  />
                  <Button
                    onClick={handleCopyCode}
                    variant="outline"
                    size="icon"
                    className="flex-shrink-0"
                    data-testid="button-copy-code"
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="text-muted-foreground">
                  Share this code with your co-parent. They can use it to connect with you on PeacePad.
                </p>
              </div>
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Enter Their Invite Code</label>
                <Input
                  placeholder="E.g., ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="font-mono text-lg text-center uppercase"
                  data-testid="input-join-code"
                />
              </div>
              <Button
                onClick={handleJoinPartnership}
                disabled={isJoining || !joinCode.trim()}
                className="w-full"
                data-testid="button-join-partnership"
              >
                {isJoining ? "Connecting..." : "Connect"}
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
