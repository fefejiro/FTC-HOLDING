import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Copy, Mail, MessageSquare, RefreshCw, Sparkles, Upload } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEOHead } from "@/components/SEOHead";
import { trackEvent } from "@/lib/analytics";

type PathChoice = "prep_chat" | "invite" | null;

const ONBOARDING_PREFIX = "onboarding_completed_";

function isMeaningfulDisplayName(value?: string | null): boolean {
  const name = (value || "").trim();
  if (!name) {
    return false;
  }

  if (name === "PeacePad User") {
    return false;
  }

  if (/^guest[a-z0-9]+$/i.test(name)) {
    return false;
  }

  return true;
}

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [displayName, setDisplayName] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pathChoice, setPathChoice] = useState<PathChoice>(null);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [trackedStart, setTrackedStart] = useState(false);

  const onboardingComplete = useMemo(() => {
    if (!user?.id) {
      return false;
    }

    return localStorage.getItem(`${ONBOARDING_PREFIX}${user.id}`) === "true";
  }, [user?.id]);

  useEffect(() => {
    if (!trackedStart) {
      trackEvent("onboarding_started", {
        is_guest: Boolean(user?.isGuest),
      });
      setTrackedStart(true);
    }
  }, [trackedStart, user?.isGuest]);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(isMeaningfulDisplayName(user.displayName) ? user.displayName : "");
    }
  }, [user?.displayName]);

  useEffect(() => {
    if (user?.profileImageUrl) {
      setPhotoPreview(user.profileImageUrl);
      setUploadedPhotoUrl(user.profileImageUrl);
    }
  }, [user?.profileImageUrl]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (user && (onboardingComplete || (isMeaningfulDisplayName(user.displayName) && !user.isGuest))) {
      if (user.activePartnershipId) {
        setLocation("/chat");
      } else {
        setLocation("/settings");
      }
    }
  }, [isLoading, onboardingComplete, setLocation, user]);

  const ensureGuestSession = async () => {
    if (user) {
      return user.id;
    }

    setIsBootstrapping(true);
    try {
      const existingSessionId = localStorage.getItem("peacepad_session_id");
      const response = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessionId: existingSessionId || undefined,
          hasAcceptedConsent: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not start your PeacePad session.");
      }

      const data = await response.json();
      localStorage.setItem("hasSeenIntro", "true");
      localStorage.setItem("hasAcceptedConsent", "true");
      localStorage.setItem("aiMessageConsent", "true");

      if (typeof data.sessionId === "string") {
        localStorage.setItem("peacepad_session_id", data.sessionId);
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      return data.user?.id as string | undefined;
    } finally {
      setIsBootstrapping(false);
    }
  };

  const uploadProfilePhoto = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/profile-upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Photo upload failed");
    }

    const data = await response.json();
    return data.url as string;
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Choose an image",
        description: "Photos need to be image files.",
        variant: "destructive",
      });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);

    try {
      await ensureGuestSession();
      const uploadedUrl = await uploadProfilePhoto(file);
      setUploadedPhotoUrl(uploadedUrl);
      setPhotoPreview(uploadedUrl);
    } catch (error) {
      toast({
        title: "Photo not saved",
        description: "You can keep going without a photo.",
        variant: "destructive",
      });
    }
  };

  const handleContinueFromWelcome = async () => {
    try {
      await ensureGuestSession();
      setStep(2);
    } catch (error) {
      toast({
        title: "Could not continue",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const saveProfile = async () => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast({
        title: "Add your name",
        description: "Your first step is a simple profile.",
        variant: "destructive",
      });
      return false;
    }

    setIsSavingProfile(true);
    try {
      await ensureGuestSession();
      await apiRequest("PATCH", "/api/user/profile", {
        displayName: trimmedName,
        profileImageUrl: uploadedPhotoUrl || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      return true;
    } catch {
      toast({
        title: "Profile not saved",
        description: "Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const completeOnboarding = async (choice: Exclude<PathChoice, null>) => {
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    const refreshedUser = queryClient.getQueryData<any>(["/api/auth/user"]);
    const resolvedUserId = refreshedUser?.id || user?.id;
    if (resolvedUserId) {
      localStorage.setItem(`${ONBOARDING_PREFIX}${resolvedUserId}`, "true");
    }

    trackEvent("onboarding_completed", {
      path_chosen: choice,
    });
  };

  const handleChoosePath = async (choice: Exclude<PathChoice, null>) => {
    const saved = await saveProfile();
    if (!saved) {
      return;
    }

    await completeOnboarding(choice);
    setPathChoice(choice);
    setStep(4);

    if (choice === "prep_chat") {
      localStorage.setItem("peacepad_prep_chat_entry_point", "onboarding");
      setLocation("/prep-chat?entry=onboarding");
    }
  };

  const inviteLink = user?.inviteCode ? `${window.location.origin}/join/${user.inviteCode}` : "";

  const handleInviteShare = async (shareMethod: "copy" | "text" | "email" | "share") => {
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

  return (
    <>
      <SEOHead title="Welcome to PeacePad" description="Say what you mean. Without the fight." noindex />

      <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(255,216,100,0.18),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(255,255,255,1))] px-4 py-6 dark:bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.14),_transparent_30%),linear-gradient(180deg,_rgba(5,5,5,0.94),_rgba(0,0,0,1))]">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="space-y-4 pb-4">
              <Badge variant="outline" className="w-fit bg-background/70">
                PeacePad MVP
              </Badge>

              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <CardTitle className="text-3xl leading-tight">Say what you mean. Without the fight.</CardTitle>
                    <CardDescription className="text-base">
                      PeacePad helps you communicate clearly with your co-parent.
                    </CardDescription>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                    Start with coaching for the hard message you need to send, or get your invite link ready for your co-parent.
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="space-y-2">
                    <CardTitle>Quick profile</CardTitle>
                    <CardDescription>Your name is required. A photo is optional.</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border border-border/70">
                      <AvatarImage src={photoPreview || undefined} />
                      <AvatarFallback>
                        {(displayName || user?.displayName || "PP").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                      <Label htmlFor="photo-upload" className="text-sm">Photo</Label>
                      <label
                        htmlFor="photo-upload"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm font-medium"
                      >
                        <Upload className="h-4 w-4" />
                        Add photo
                      </label>
                      <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Name</Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <CardTitle>Choose your first step</CardTitle>
                    <CardDescription>Pick the path that helps you most right now.</CardDescription>
                  </div>
                  <div className="grid gap-3">
                    <button
                      type="button"
                      className="rounded-2xl border border-border/70 bg-background px-4 py-4 text-left transition hover:bg-muted/30"
                      onClick={() => void handleChoosePath("prep_chat")}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <span className="font-semibold">I need to say something hard</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Start with Prep Chat and turn your thoughts into a calmer message.
                      </p>
                    </button>

                    <button
                      type="button"
                      className="rounded-2xl border border-border/70 bg-background px-4 py-4 text-left transition hover:bg-muted/30"
                      onClick={() => void handleChoosePath("invite")}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <ArrowRight className="h-5 w-5 text-primary" />
                        <span className="font-semibold">Invite my co-parent</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Generate your link and share it by text, email, or copy.
                      </p>
                    </button>
                  </div>
                </>
              )}

              {step === 4 && pathChoice === "invite" && (
                <>
                  <div className="space-y-2">
                    <CardTitle>Invite your co-parent</CardTitle>
                    <CardDescription>
                      Share this link with your co-parent. When they join, you&apos;ll be connected.
                    </CardDescription>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
                    <p className="mb-2 font-medium">Invite link</p>
                    <p className="break-all text-muted-foreground">{inviteLink || "Generating your link..."}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button type="button" variant="outline" onClick={() => void handleInviteShare("copy")} disabled={!inviteLink}>
                      <Copy className="mr-2 h-4 w-4" />
                      {inviteCopied ? "Copied" : "Copy link"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void handleInviteShare("text")} disabled={!inviteLink}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Text
                    </Button>
                    <Button type="button" variant="outline" onClick={() => void handleInviteShare("email")} disabled={!inviteLink}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                    <Button type="button" onClick={() => void handleInviteShare("share")} disabled={!inviteLink}>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm dark:border-amber-900 dark:bg-amber-950/20">
                    <p className="font-medium">Ready to send your first message?</p>
                    <p className="mt-1 text-muted-foreground">
                      Need help first? Start with Prep Chat and take a calmer draft into Messages.
                    </p>
                  </div>
                </>
              )}
            </CardHeader>

            <CardContent className="space-y-3 pt-0">
              {step === 1 && (
                <Button type="button" onClick={() => void handleContinueFromWelcome()} disabled={isBootstrapping}>
                  {isBootstrapping ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Get started
                </Button>
              )}

              {step === 2 && (
                <Button type="button" onClick={() => setStep(3)} disabled={isSavingProfile}>
                  Continue
                </Button>
              )}

              {step === 4 && pathChoice === "invite" && (
                <div className="flex flex-col gap-2">
                  <Button type="button" onClick={() => setLocation("/chat")}>
                    Open Messages
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setLocation("/prep-chat?entry=message_prompt")}>
                    Start with Prep Chat
                  </Button>
                </div>
              )}

              {step > 1 && step < 4 && (
                <Button type="button" variant="ghost" onClick={() => setStep((current) => (current === 3 ? 2 : 1))}>
                  Back
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
