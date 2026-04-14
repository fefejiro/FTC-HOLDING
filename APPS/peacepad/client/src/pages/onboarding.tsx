import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, CheckCircle, Copy, Mail, MessageSquare, RefreshCw, Sparkles, Upload } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { rememberAuthRedirectState, sendMagicLink } from "@/lib/supabaseAuth";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SEOHead } from "@/components/SEOHead";
import { trackEvent } from "@/lib/analytics";
import { ensureGuestSession } from "@/lib/guestSession";

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
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 1.5 | 2 | 3 | 4 | 5>(1);
  const [authEmail, setAuthEmail] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
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

  // When user returns from magic link callback, advance past the auth step
  useEffect(() => {
    if (isLoading) return;
    if (!user || user.isGuest) return;
    if (step <= 2) setStep(3);
  }, [isLoading, step, user?.id, user?.isGuest]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const authIntent = new URLSearchParams(window.location.search).get("auth");
    if (authIntent === "upgrade" && step < 2) {
      setStep(2);
    }
  }, [location, step]);

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

  const bootstrapGuestSession = async () => {
    if (user) {
      return user.id;
    }

    setIsBootstrapping(true);
    try {
      const guestUser = await ensureGuestSession();
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      return guestUser?.id;
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
      await bootstrapGuestSession();
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
    // Show mini-tour before auth
    setStep(1.5);
    return;
  };

  const handleContinueFromTour = async () => {
    try {
      await bootstrapGuestSession();
      setStep(3);
    } catch (error) {
      toast({
        title: "Could not continue",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSendMagicLink = async () => {
    const email = authEmail.trim();
    if (!email || !email.includes("@")) {
      toast({
        title: "Add your email",
        description: "Enter a valid email address to continue.",
        variant: "destructive",
      });
      return;
    }
    setIsSendingLink(true);
    setAuthError(null);
    try {
      rememberAuthRedirectState("/onboarding");
      await sendMagicLink(email);
      setMagicLinkSent(true);
    } catch (error) {
      const description = error instanceof Error ? error.message : "Please try again.";
      setAuthError(description);
      toast({
        title: "Could not send link",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSendingLink(false);
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
      await bootstrapGuestSession();
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
    setStep(5);

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
      <SEOHead title="Welcome to PeacePad" description="Find a softer tone before you send something hard." noindex />

      <div className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(255,216,100,0.18),_transparent_32%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(255,255,255,1))] px-4 py-6 dark:bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.14),_transparent_30%),linear-gradient(180deg,_rgba(5,5,5,0.94),_rgba(0,0,0,1))]">
        <div className="mx-auto flex w-full max-w-md flex-col gap-4">
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="space-y-4 pb-4">
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <CardTitle className="text-3xl leading-tight">Find a softer tone for hard conversations.</CardTitle>
                    <CardDescription className="text-base">
                      For co-parents who want help saying something difficult more calmly.
                    </CardDescription>
                  </div>
                </>
              )}

              {step === 1.5 && (
                <>
                  <div className="space-y-2">
                    <CardTitle>Here's how it works</CardTitle>
                    <CardDescription>Three steps between conflict and clarity.</CardDescription>
                  </div>
                  <div className="grid gap-3">
                    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-sky-500" />
                      <div>
                        <p className="text-sm font-semibold">Write your message</p>
                        <p className="text-xs text-muted-foreground">Type what you want to say — rough draft is fine.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                      <div>
                        <p className="text-sm font-semibold">PeacePad checks your tone</p>
                        <p className="text-xs text-muted-foreground">We flag anything that could escalate and suggest a calmer version.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                      <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                      <div>
                        <p className="text-sm font-semibold">Send when you're ready</p>
                        <p className="text-xs text-muted-foreground">You decide. We just make sure the message works for you.</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  {!magicLinkSent ? (
                    <>
                      <div className="space-y-2">
                        <CardTitle>Let&apos;s get you set up</CardTitle>
                        <CardDescription>
                          Enter your email. We&apos;ll send you a link to sign in — no password needed.
                        </CardDescription>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="auth-email">Email</Label>
                        <Input
                          id="auth-email"
                          type="email"
                          value={authEmail}
                          onChange={(e) => setAuthEmail(e.target.value)}
                          placeholder="you@example.com"
                          onKeyDown={(e) => { if (e.key === "Enter") void handleSendMagicLink(); }}
                        />
                        {authError ? (
                          <p className="text-sm text-destructive" data-testid="text-auth-magic-link-error">
                            {authError}
                          </p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          PeacePad still works without login. Sign-in is only needed for saved history and sync.
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <CardTitle>Check your email</CardTitle>
                      <CardDescription>
                        We sent a link to <strong>{authEmail}</strong>. Tap it to continue.
                      </CardDescription>
                    </div>
                  )}
                </>
              )}

              {step === 3 && (
                <>
                  <div className="space-y-2">
                    <CardTitle>Quick profile</CardTitle>
                    <CardDescription>Your name is required. A photo is optional.</CardDescription>
                  </div>
                  <div className="flex items-center gap-3 py-1">
                    <Avatar className="h-14 w-14 border border-border/70">
                      <AvatarImage src={photoPreview || undefined} />
                      <AvatarFallback>
                        {(displayName || user?.displayName || "PP").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor="photo-upload"
                      className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border/70 px-3 py-2 text-sm font-medium"
                    >
                      <Upload className="h-4 w-4" />
                      Add photo
                    </label>
                    <input id="photo-upload" type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Name</Label>
                    <Input
                      id="display-name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      placeholder="Your first name"
                    />
                  </div>
                </>
              )}

              {step === 4 && (
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

              {step === 5 && pathChoice === "invite" && (
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
                      {inviteCopied ? "Copied! ✓" : "Copy link"}
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
                <>
                  <Button type="button" onClick={() => void handleContinueFromWelcome()} disabled={isBootstrapping}>
                    {isBootstrapping ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                    Get started
                  </Button>
                  {isBootstrapping && (
                    <p className="text-sm text-muted-foreground">Preparing your PeacePad workspace…</p>
                  )}
                </>
              )}

              {step === 1.5 && (
                <Button type="button" onClick={() => void handleContinueFromTour()}>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Get started
                </Button>
              )}

              {step === 2 && !magicLinkSent && (
                <Button type="button" onClick={() => void handleSendMagicLink()} disabled={isSendingLink}>
                  {isSendingLink ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Send sign-in link
                </Button>
              )}

              {step === 2 && magicLinkSent && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setMagicLinkSent(false); void handleSendMagicLink(); }}
                  disabled={isSendingLink}
                >
                  Resend link
                </Button>
              )}

              {step === 3 && (
                <Button type="button" onClick={() => setStep(4)} disabled={isSavingProfile}>
                  Continue
                </Button>
              )}

              {step === 5 && pathChoice === "invite" && (
                <div className="flex flex-col gap-2">
                  <Button type="button" onClick={() => setLocation("/chat")}>
                    Open Messages
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setLocation("/prep-chat?entry=message_prompt")}>
                    Start with Prep Chat
                  </Button>
                </div>
              )}

              {step > 1 && step < 5 && !(step === 2 && magicLinkSent) && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    setStep((current) => {
                      if (current === 4) return 3;
                      if (current === 3) return 1.5;
                      if (current === 2) return 1.5;
                      if (current === 1.5) return 1;
                      return 1;
                    })
                  }
                >
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
