import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Copy, Download, ExternalLink, LogOut, Mail, MessageSquare, Upload, Users } from "lucide-react";
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
import { markGuestUpgradeIntent } from "@/lib/guestUpgrade";

function isDemoPartnerName(value: string | null): boolean {
  return Boolean(value && /demo co-parent/i.test(value));
}

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [inviteExpanded, setInviteExpanded] = useState(false);

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
    if (!user?.displayName) return;
    const name = user.displayName;
    const isMeaningful = name !== "PeacePad User" && !/^guest[a-z0-9]+$/i.test(name);
    setDisplayName(isMeaningful ? name : "");
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
  const visiblePartnerName = isDemoPartnerName(partnerName) ? null : partnerName;

  const handleGuestUpgrade = () => {
    markGuestUpgradeIntent();
    setLocation("/onboarding?auth=upgrade");
  };

  const copyGuestInviteLink = async () => {
    if (!inviteLink) {
      toast({
        title: "Invite not ready",
        description: "Refresh once and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteCopied(true);
      window.setTimeout(() => setInviteCopied(false), 2000);
      toast({
        title: "Invite copied",
        description: "Share the link when you are ready to connect.",
      });
      trackEvent("invite_sent", {
        share_method: "copy",
        source: "guest_settings",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Select and copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const textGuestInviteLink = () => {
    if (!inviteLink) return;
    const shareText = `Join me on PeacePad so we can communicate clearly: ${inviteLink}`;
    trackEvent("invite_sent", {
      share_method: "text",
      source: "guest_settings",
    });
    window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
  };

  if (user?.isGuest) {
    return (
      <>
        <SEOHead title="You - PeacePad" description="Sign in to save and sync your PeacePad data." noindex />

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>Save your PeacePad progress</CardTitle>
              <CardDescription>
                You are using a guest session right now. Sign in when you want saved history, cross-device sync,
                and full account management.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                Prep Chat stays available as a guest. Signing in upgrades this session instead of starting over.
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" onClick={handleGuestUpgrade} data-testid="button-guest-upgrade-sign-in">
                  Sign in to save and sync
                </Button>
                <Button asChild type="button" variant="outline">
                  <Link href="/prep-chat">Keep using Prep Chat</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>Invite a partner when you are ready</CardTitle>
              <CardDescription>
                PeacePad works for one person first. Share this link only when you want your co-parent to join the same workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                <p className="mb-2 text-sm font-medium">Your invite link</p>
                <p className="break-all text-sm text-muted-foreground" data-testid="text-guest-invite-link">
                  {inviteLink || "Preparing your invite link..."}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyGuestInviteLink()}
                  disabled={!inviteLink}
                  data-testid="button-guest-copy-invite-link"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {inviteCopied ? "Copied" : "Copy link"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={textGuestInviteLink}
                  disabled={!inviteLink}
                  data-testid="button-guest-text-invite-link"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Text link
                </Button>
              </div>
              <JoinPartnershipDialog
                trigger={
                  <Button type="button" variant="outline" className="w-full" data-testid="button-guest-enter-partner-code">
                    <Users className="mr-2 h-4 w-4" />
                    Enter a partner code
                  </Button>
                }
              />
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Available without login</CardTitle>
              <CardDescription>Helpful links stay available while you keep testing the guest flow.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild type="button" variant="outline" className="w-full justify-start">
                <a href="/resources">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Support resources
                </a>
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
                <a href="mailto:peacepad@peacepad.ca?subject=PeacePad guest support">
                  <Mail className="mr-2 h-4 w-4" />
                  Help and feedback
                </a>
              </Button>
              <Button type="button" variant="ghost" className="w-full justify-start text-destructive" onClick={() => void logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                End guest session
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

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

    // Show immediate local preview
    const previewUrl = URL.createObjectURL(file);
    setProfileImageUrl(previewUrl);

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
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
      // Store the server URL in state — saved together with name on "Save profile"
      setProfileImageUrl(uploadedUrl);
    } catch {
      toast({
        title: "Photo not saved",
        description: "Please try again.",
        variant: "destructive",
      });
      setProfileImageUrl(null);
    } finally {
      setIsUploading(false);
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
            <CardDescription>Your account and settings.</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
              <CardDescription>Keep your name and photo simple and clear.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 py-1">
                <Avatar className="h-14 w-14 border border-border/70">
                  <AvatarImage src={profileImageUrl || undefined} />
                  <AvatarFallback>{(displayName || user?.displayName || "PP").slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm font-medium">
                  <Upload className="h-4 w-4" />
                  {isUploading ? "Uploading..." : "Add photo"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                    disabled={isUploading}
                  />
                </label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="settings-display-name">Name</Label>
                <Input
                  id="settings-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your first name"
                />
              </div>

              <Button type="button" onClick={() => void saveProfile()} disabled={isSaving || isUploading}>
                {isSaving || isUploading ? "Saving..." : "Save profile"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Partner & invite</CardTitle>
              <CardDescription>Manage your connection and share your invite link.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {visiblePartnerName ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
                  <p className="text-sm font-medium">Connected with {visiblePartnerName}</p>
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

              <div className="rounded-2xl border border-border/70 bg-background overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
                  onClick={() => setInviteExpanded((v) => !v)}
                >
                  Share invite link
                  <ChevronDown
                    className={[
                      "h-4 w-4 text-muted-foreground transition-transform",
                      inviteExpanded ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>
                {inviteExpanded && (
                  <div className="space-y-3 border-t border-border/60 px-4 pb-4 pt-3">
                    <p className="break-all text-sm text-muted-foreground" data-testid="text-account-invite-link">
                      {inviteLink || "Generating your link..."}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button type="button" variant="outline" onClick={() => void shareInvite("copy")} disabled={!inviteLink}>
                        <Copy className="mr-2 h-4 w-4" />
                        {inviteCopied ? "Copied! ✓" : "Copy link"}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => void shareInvite("text")} disabled={!inviteLink}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Text invite
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <JoinPartnershipDialog
                trigger={
                  <Button type="button" variant="outline" className="w-full sm:w-auto">
                    <Users className="mr-2 h-4 w-4" />
                    Enter a code
                  </Button>
                }
              />
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">Support resources</CardTitle>
              <CardDescription>Curated crisis, legal, counseling, and co-parenting help.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Link href="/resources">
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted/60">Crisis support</Badge>
                </Link>
                <Link href="/resources">
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted/60">Legal aid</Badge>
                </Link>
                <Link href="/resources">
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted/60">Counseling</Badge>
                </Link>
                <Link href="/resources">
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted/60">Co-parenting help</Badge>
                </Link>
              </div>
              <Link href="/resources">
                <Button type="button" variant="outline">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Find support
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
