import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Copy, Download, ExternalLink, LogOut, Mail, MessageSquare, Upload, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/SEOHead";
import { JoinPartnershipDialog } from "@/components/JoinPartnershipDialog";
import { trackEvent } from "@/lib/analytics";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const { data: partnerships = [] } = useQuery<any[]>({
    queryKey: ["/api/partnerships"],
    enabled: Boolean(user),
  });

  const activePartnership = useMemo(() => {
    if (!user?.activePartnershipId) {
      return partnerships[0] ?? null;
    }

    return partnerships.find((partnership) => partnership.id === user.activePartnershipId) ?? null;
  }, [partnerships, user?.activePartnershipId]);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  useEffect(() => {
    if (user?.profileImageUrl) {
      setProfileImageUrl(user.profileImageUrl);
    }
  }, [user?.profileImageUrl]);

  const inviteLink = user?.inviteCode ? `${window.location.origin}/join/${user.inviteCode}` : "";
  const partnerName = activePartnership
    ? activePartnership.partnerName ||
      activePartnership.partner?.displayName ||
      activePartnership.partner?.email ||
      "your co-parent"
    : null;

  const saveProfile = async (nextPhotoUrl?: string | null) => {
    if (!displayName.trim()) {
      toast({
        title: "Add your name",
        description: "A clear name helps your co-parent know who is messaging.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await apiRequest("PATCH", "/api/user/profile", {
        displayName: displayName.trim(),
        profileImageUrl: nextPhotoUrl ?? profileImageUrl ?? undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile updated",
        description: "Your settings are saved.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setProfileImageUrl(previewUrl);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/profile-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const uploadedUrl = data.url as string;
      setProfileImageUrl(uploadedUrl);
      await saveProfile(uploadedUrl);
    } catch {
      toast({
        title: "Photo not saved",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const shareInvite = async (shareMethod: "copy" | "text" | "email" | "share") => {
    if (!inviteLink) {
      return;
    }

    const shareText = `Join me on PeacePad so we can communicate clearly: ${inviteLink}`;

    try {
      if (shareMethod === "share" && navigator.share) {
        await navigator.share({
          title: "Join me on PeacePad",
          text: shareText,
          url: inviteLink,
        });
      } else if (shareMethod === "text") {
        window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
      } else if (shareMethod === "email") {
        window.location.href = `mailto:?subject=${encodeURIComponent("Join me on PeacePad")}&body=${encodeURIComponent(shareText)}`;
      } else {
        await navigator.clipboard.writeText(inviteLink);
        setInviteCopied(true);
        window.setTimeout(() => setInviteCopied(false), 2000);
      }

      trackEvent("invite_sent", {
        share_method: shareMethod,
      });
    } catch {
      toast({
        title: "Invite not shared",
        description: "Copy the link instead.",
        variant: "destructive",
      });
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch("/api/user/export", {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `peacepad-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      toast({
        title: "Export ready",
        description: "Your data download has started.",
      });
    } catch {
      toast({
        title: "Export failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <SEOHead title="You - PeacePad" description="Profile, invite, support, privacy, and help." noindex />

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-4">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>You</CardTitle>
            <CardDescription>Profile, partner setup, resources, privacy, and feedback.</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>Keep your name and photo simple and clear.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-border/70">
                  <AvatarImage src={profileImageUrl || undefined} />
                  <AvatarFallback>{(displayName || user?.displayName || "PP").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm font-medium">
                    <Upload className="h-4 w-4" />
                    Upload photo
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-display-name">Name</Label>
                <Input
                  id="settings-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                />
              </div>

              <Button type="button" onClick={() => void saveProfile()} disabled={isSaving}>
                Save profile
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Partner & invite</CardTitle>
              <CardDescription>Manage your connection and share your invite link.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {partnerName ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <p className="text-sm font-medium">Connected with {partnerName}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Messages and calendar context are active for this partnership.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-sm font-medium">No co-parent connected yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Share your invite link or enter a code you received.
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="mb-2 text-sm font-medium">Invite link</p>
                <p className="break-all text-sm text-muted-foreground">{inviteLink || "Generating invite link..."}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => void shareInvite("copy")} disabled={!inviteLink}>
                  <Copy className="mr-2 h-4 w-4" />
                  {inviteCopied ? "Copied" : "Copy link"}
                </Button>
                <Button type="button" variant="outline" onClick={() => void shareInvite("text")} disabled={!inviteLink}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Text invite
                </Button>
                <Button type="button" variant="outline" onClick={() => void shareInvite("email")} disabled={!inviteLink}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email invite
                </Button>
                <JoinPartnershipDialog
                  trigger={
                    <Button type="button">
                      <Users className="mr-2 h-4 w-4" />
                      Enter a code
                    </Button>
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Support resources</CardTitle>
              <CardDescription>Curated crisis, legal, counseling, and co-parenting help.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Crisis support</Badge>
                <Badge variant="outline">Legal aid</Badge>
                <Badge variant="outline">Counseling</Badge>
                <Badge variant="outline">Co-parenting help</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                PeacePad keeps this simple in the MVP: high-quality external links, no in-app directory search.
              </p>
              <Link href="/resources">
                <Button type="button" variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open support resources
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Privacy, data, and help</CardTitle>
              <CardDescription>Consent, exports, help, feedback, and sign out.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button type="button" variant="outline" className="w-full justify-start" onClick={exportData}>
                <Download className="mr-2 h-4 w-4" />
                Export my data
              </Button>
              <Button asChild type="button" variant="outline" className="w-full justify-start">
                <a href="/privacy">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Privacy policy
                </a>
              </Button>
              <Button asChild type="button" variant="outline" className="w-full justify-start">
                <a href="/terms">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Terms
                </a>
              </Button>
              <Button
                asChild
                type="button"
                variant="outline"
                className="w-full justify-start"
              >
                <a href="mailto:peacepad@peacepad.ca?subject=PeacePad feedback">
                  <Mail className="mr-2 h-4 w-4" />
                  Help & feedback
                </a>
              </Button>
              <Button type="button" variant="ghost" className="w-full justify-start text-destructive" onClick={() => void logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
