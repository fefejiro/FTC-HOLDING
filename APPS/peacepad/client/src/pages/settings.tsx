import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Upload, User, Copy, Share2, Check, Phone, Sparkles, Moon, Sun, Monitor, FileText, Trash2, Users, Link as LinkIcon, Brain, HelpCircle, ChevronDown, Shield, Palette, Download, CheckCircle2, Heart, RefreshCw, Info } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/dateUtils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useLocation, Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { useTheme } from "@/components/ThemeProvider";
import { SEOHead } from "@/components/SEOHead";
import { ThemeColorSelector } from "@/components/ThemeColorSelector";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { JoinPartnershipDialog } from "@/components/JoinPartnershipDialog";
import { Separator } from "@/components/ui/separator";
import { MBTIExplainer } from "@/components/MBTIExplainer";
import { InstallPWA } from "@/components/InstallPWA";
import { validatePhoneNumber, validateDisplayName, sanitizePhoneNumber } from "@/lib/fieldValidation";
import peacepadIcon from "@assets/../public/peacepad-icon.png";


export default function SettingsPage() {
  const [toneAnalysis, setToneAnalysis] = useState(true);
  const [hintsEnabled, setHintsEnabled] = useState(() => {
    const stored = localStorage.getItem("hints_enabled");
    // Default to OFF - user must explicitly enable hints
    return stored === "true";
  });
  const [affirmationsEnabled, setAffirmationsEnabled] = useState(() => {
    const stored = localStorage.getItem("affirmations_enabled");
    return stored !== null ? stored === "true" : false;
  });
  const [moodCheckInsEnabled, setMoodCheckInsEnabled] = useState(() => {
    const stored = localStorage.getItem("mood_checkins_enabled");
    return stored !== null ? stored === "true" : false;
  });
  
  const [profileOpen, setProfileOpen] = useState(true);
  const [partnershipOpen, setPartnershipOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [wellnessOpen, setWellnessOpen] = useState(false);
  const [mbtiOpen, setMbtiOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [systemOpen, setSystemOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const { user } = useAuth();
  const { data: usageStatus } = useQuery<any>({
    queryKey: ['/api/usage/status'],
    enabled: !!user,
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [personalityType, setPersonalityType] = useState(user?.personalityType || "");
  const [coParentPersonalityGuess, setCoParentPersonalityGuess] = useState("");
  const [inviteCodeCopied, setInviteCodeCopied] = useState(false);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeletePartnershipDialog, setShowDeletePartnershipDialog] = useState(false);
  const [partnershipToDelete, setPartnershipToDelete] = useState<any | null>(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const { theme, setTheme } = useTheme();

  const { data: partnerships = [] } = useQuery<any[]>({
    queryKey: ['/api/partnerships'],
    enabled: !!user,
  });

  // AI Coach Settings
  interface AgentSettings {
    id: string;
    userId: string;
    proactiveInsightsEnabled: boolean;
    nudgeFrequency: string;
    conflictThreshold: number;
    summaryFrequency: string;
    pushNotificationsEnabled: boolean;
    emailNotificationsEnabled: boolean;
    privacyMode: string;
  }

  const { data: agentSettings } = useQuery<AgentSettings>({
    queryKey: ['/api/agent/settings'],
    enabled: !!user,
  });

  const [localAgentSettings, setLocalAgentSettings] = useState<Partial<AgentSettings>>({});

  const updateAgentSettings = useMutation({
    mutationFn: async (data: Partial<AgentSettings>) => {
      const res = await apiRequest('PUT', '/api/agent/settings', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/agent/settings'] });
      setLocalAgentSettings({});
      toast({ title: 'AI Coach settings saved', duration: 3000 });
    },
    onError: () => {
      toast({ title: 'Failed to save AI Coach settings', variant: 'destructive', duration: 5000 });
    },
  });

  const mergedAgentSettings = { ...agentSettings, ...localAgentSettings };

  const updateLocalAgent = (key: keyof AgentSettings, value: any) => {
    setLocalAgentSettings(prev => ({ ...prev, [key]: value }));
  };

  // Get active partnership for personality settings
  const activePartnershipId = user?.activePartnershipId;
  const activePartnership = partnerships.find((p: any) => p.id === activePartnershipId);

  // Fetch personality settings for active partnership
  const { data: personalitySettings } = useQuery<{
    myPersonalityConfirmed: string | null;
    coParentPersonalityGuess: string | null;
    effectivePersonalities: {
      mine: string | null;
      coParent: string | null;
      isCoParentGuessed: boolean;
    };
  }>({
    queryKey: ['/api/partnerships', activePartnershipId, 'personality'],
    enabled: !!activePartnershipId,
  });

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  useEffect(() => {
    if (user?.phoneNumber !== undefined) {
      setPhoneNumber(user.phoneNumber || "");
    }
  }, [user?.phoneNumber]);

  useEffect(() => {
    if (user?.personalityType !== undefined) {
      setPersonalityType(user.personalityType || "");
    }
  }, [user?.personalityType]);

  // Sync co-parent personality guess from server
  useEffect(() => {
    if (personalitySettings?.coParentPersonalityGuess !== undefined) {
      setCoParentPersonalityGuess(personalitySettings.coParentPersonalityGuess || "");
    }
  }, [personalitySettings?.coParentPersonalityGuess]);

  const updateProfile = useMutation({
    mutationFn: async (data: { profileImageUrl?: string; displayName?: string; phoneNumber?: string; personalityType?: string; activePartnershipId?: string }) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profile updated successfully", duration: 3000 });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  // Mutation for updating co-parent personality guess
  const updateCoParentPersonality = useMutation({
    mutationFn: async (data: { coParentPersonalityGuess?: string }) => {
      if (!activePartnershipId) throw new Error("No active partnership");
      const res = await apiRequest("PATCH", `/api/partnerships/${activePartnershipId}/personality`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partnerships', activePartnershipId, 'personality'] });
      toast({ title: "Co-parent personality updated", duration: 3000 });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update co-parent personality",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/user/account", {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted. Redirecting...",
        duration: 3000,
      });
      queryClient.clear();
      localStorage.clear();
      sessionStorage.clear();
      setTimeout(() => {
        window.location.replace("/onboarding");
      }, 1500);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/profile-upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        throw new Error('Upload failed');
      }

      const data = await res.json();
      updateProfile.mutate({ profileImageUrl: data.url });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload profile photo",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const currentProfileImage = user?.profileImageUrl || "";

  const inviteCode = user?.inviteCode || "";
  const inviteLink = inviteCode ? `${window.location.origin}/join/${inviteCode}` : "";
  const shareMessage = `I'm using PeacePad for co-parenting coordination. Join me: ${inviteLink}`;

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setInviteLinkCopied(true);
      toast({ title: "Link copied!", description: "Share this link with your co-parent", duration: 3000 });
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
          title: "Message copied!", 
          description: "Paste this message in SMS, WhatsApp, or email", 
          duration: 4000 
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({ 
          title: "Error sharing", 
          description: "Please try copying the link manually", 
          variant: "destructive", 
          duration: 5000 
        });
      }
    }
  };

  const handleHintsToggle = (enabled: boolean) => {
    setHintsEnabled(enabled);
    localStorage.setItem("hints_enabled", String(enabled));
    toast({
      title: enabled ? "Hints enabled" : "Hints disabled",
      description: enabled 
        ? "You'll see helpful tips throughout the app" 
        : "Tips are now hidden",
      duration: 3000,
    });
  };

  const handleAffirmationsToggle = (enabled: boolean) => {
    setAffirmationsEnabled(enabled);
    localStorage.setItem("affirmations_enabled", String(enabled));
    toast({
      title: enabled ? "Affirmations enabled" : "Affirmations disabled",
      description: enabled 
        ? "Daily affirmations are now active" 
        : "Affirmations have been disabled",
      duration: 3000,
    });
  };

  const handleMoodCheckInsToggle = (enabled: boolean) => {
    setMoodCheckInsEnabled(enabled);
    localStorage.setItem("mood_checkins_enabled", String(enabled));
    toast({
      title: enabled ? "Mood check-ins enabled" : "Mood check-ins disabled",
      description: enabled 
        ? "Daily mood check-ins are now active" 
        : "Mood check-ins have been disabled",
      duration: 3000,
    });
  };

  const handleDisplayNameSave = () => {
    const validation = validateDisplayName(displayName);
    if (!validation.valid) {
      toast({
        title: "Invalid name",
        description: validation.error || "Please enter a valid name",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    updateProfile.mutate({ displayName: displayName.trim() });
  };

  const handlePhoneNumberSave = () => {
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      toast({
        title: "Invalid phone number",
        description: validation.error || "Please enter a valid US, Canada, or Nigeria phone number",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    // Sanitize and save
    const sanitized = sanitizePhoneNumber(phoneNumber);
    updateProfile.mutate({ phoneNumber: sanitized });
  };

  const handlePersonalityTypeSave = (value: string) => {
    const finalValue = value === "none" ? "" : value;
    setPersonalityType(finalValue);
    updateProfile.mutate({ personalityType: finalValue });
  };

  const handleCoParentPersonalitySave = (value: string) => {
    const finalValue = value === "none" ? "" : value;
    setCoParentPersonalityGuess(finalValue);
    updateCoParentPersonality.mutate({ coParentPersonalityGuess: finalValue || undefined });
  };

  const handleViewWelcomeTour = () => {
    localStorage.removeItem("hasSeenIntro");
    toast({
      title: "Welcome tour restarted",
      description: "You'll see the introduction slideshow again",
      duration: 3000,
    });
    setLocation("/");
  };

  const handleSignOut = async () => {
    try {
      // Clear server-side session first
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch (e) {
        // Continue even if logout endpoint fails
      }
      
      // Clear React Query cache to prevent refetches
      queryClient.clear();
      
      // Clear client-side storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Redirect to onboarding for fresh start
      window.location.replace("/onboarding");
    } catch (error) {
      toast({
        title: "Sign out error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const deletePartnership = useMutation({
    mutationFn: async (partnershipId: string) => {
      await apiRequest("DELETE", `/api/partnerships/${partnershipId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/partnerships'] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: "Partnership removed",
        description: "The co-parenting partnership has been deleted",
        duration: 3000,
      });
      setShowDeletePartnershipDialog(false);
      setPartnershipToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete partnership",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const regenerateInviteCode = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/partnerships/regenerate-code", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Invite code regenerated",
        description: "Your new invite code is ready to share",
        duration: 3000,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to regenerate invite code",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  const copyInviteCodeOnly = async () => {
    if (!user?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(user.inviteCode);
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


  return (
    <>
      <SEOHead title="Settings" description="Manage your PeacePad account settings and preferences" noindex />
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 pb-40 overflow-x-hidden">
        {/* Colorful Hero Section with Family Illustration */}
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-primary p-1">
          <div className="relative flex flex-col sm:flex-row items-center gap-4 rounded-xl bg-card p-4 sm:p-6">
            <div className="flex-shrink-0">
              <img 
                src={peacepadIcon} 
                alt="PeacePad" 
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-contain bg-white p-2 border-4 border-background shadow-lg"
                data-testid="img-peacepad-icon"
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <SettingsIcon className="h-6 w-6 text-primary" />
                <h1 className="text-2xl sm:text-3xl font-bold text-primary" data-testid="text-settings-title">
                  Settings
                </h1>
              </div>
              <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                <Heart className="h-4 w-4 text-primary" />
                Customize your PeacePad experience
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {/* Profile Section */}
          <Collapsible open={profileOpen} onOpenChange={setProfileOpen}>
            <Card className="border-l-4 border-l-purple-500">
              <CollapsibleTrigger className="w-full" data-testid="button-section-profile">
                <CardHeader className="hover-elevate">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-purple-500" />
                      <h2 className="text-xl font-semibold">Profile</h2>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <CardDescription className="text-left">Your photo, name, and contact info</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6 pt-2">
                  {/* Profile Picture */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">Profile Picture</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-20 w-20 border-2 border-border">
                        {currentProfileImage ? (
                          <AvatarImage src={currentProfileImage} alt="Profile" />
                        ) : (
                          <AvatarFallback className="bg-muted">
                            <User className="h-10 w-10 text-muted-foreground" />
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={updateProfile.isPending}
                          data-testid="button-upload-image"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {currentProfileImage ? "Change Photo" : "Upload Photo"}
                        </Button>
                        <Input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageUpload}
                          data-testid="input-profile-image"
                        />
                        <p className="text-xs text-muted-foreground">
                          Square image, max 5MB
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Display Name */}
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Display Name</Label>
                    <div className="flex gap-2">
                      <Input
                        id="display-name"
                        type="text"
                        placeholder="Enter your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        data-testid="input-display-name"
                      />
                      <Button
                        onClick={handleDisplayNameSave}
                        disabled={updateProfile.isPending || !displayName.trim()}
                        data-testid="button-save-name"
                      >
                        {updateProfile.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This name will be shown to your co-parent
                    </p>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label htmlFor="phone-number">Phone Number (Optional)</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="phone-number"
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="pl-9"
                          data-testid="input-phone-number"
                        />
                      </div>
                      <Button
                        onClick={handlePhoneNumberSave}
                        disabled={updateProfile.isPending}
                        data-testid="button-save-phone"
                      >
                        {updateProfile.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Visible to your co-parent for contact sharing
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Partnership Section */}
          <Collapsible open={partnershipOpen} onOpenChange={setPartnershipOpen}>
            <Card className={partnerships.length === 0 ? "border-2 border-primary bg-primary/5" : "border-l-4 border-l-pink-500"}>
              <CollapsibleTrigger className="w-full" data-testid="button-section-partnership">
                <CardHeader className="hover-elevate">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-pink-500" />
                      <h2 className="text-xl font-semibold">
                        {partnerships.length === 0 ? "Connect with Co-Parent" : "Partnership"}
                      </h2>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${partnershipOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <CardDescription className="text-left">
                    {partnerships.length === 0 
                      ? "Share your invite code to get started" 
                      : "Manage your co-parenting connections"}
                  </CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-2">
                  {/* Invite Code - Large Display */}
                  <div className="bg-white dark:bg-card p-4 sm:p-6 rounded-xl border-2 border-primary shadow-sm overflow-x-auto">
                    <div className="text-center space-y-1">
                      <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-mono font-bold tracking-[0.15em] sm:tracking-[0.3em] text-primary break-words" data-testid="text-invite-code">
                        {user?.inviteCode || "------"}
                      </span>
                      <p className="text-xs text-muted-foreground mt-3">
                        Your co-parent enters this code to join
                      </p>
                    </div>
                  </div>

                  {/* QR Code */}
                  {inviteLink && (
                    <div className="flex justify-center p-4 sm:p-6 bg-white dark:bg-card rounded-xl border max-w-full">
                      <div className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 flex-shrink-0 flex items-center justify-center">
                        <QRCodeSVG 
                          value={inviteLink} 
                          size={256} 
                          level="M"
                          data-testid="qr-code-invite"
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  )}

                  {/* Share Actions */}
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleShareInvite}
                    disabled={!inviteLink}
                    data-testid="button-share-invite"
                    className="w-full"
                  >
                    <Share2 className="h-5 w-5 mr-2" />
                    Share Invite Code
                  </Button>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyInviteCodeOnly}
                      disabled={!user?.inviteCode}
                      data-testid="button-copy-invite-code"
                      className="w-full"
                    >
                      {inviteCodeCopied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy Code
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyInviteLink}
                      disabled={!inviteLink}
                      data-testid="button-copy-invite-link"
                      className="w-full"
                    >
                      {inviteLinkCopied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <LinkIcon className="h-4 w-4 mr-2" />
                          Full Link
                        </>
                      )}
                    </Button>
                  </div>

                  {partnerships.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => regenerateInviteCode.mutate()}
                      disabled={regenerateInviteCode.isPending}
                      data-testid="button-regenerate-invite-code"
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {regenerateInviteCode.isPending ? "Regenerating..." : "Regenerate Code"}
                    </Button>
                  )}

                  <Separator />

                  {/* Active Primary Partnership - Always Visible */}
                  {partnerships.length > 0 && user?.activePartnershipId && (() => {
                    const activePship = partnerships.find((p: any) => p.id === user.activePartnershipId);
                    if (!activePship) return null;
                    const partner = activePship.partner;
                    const partnerName = partner?.displayName || 
                      (partner?.firstName && partner?.lastName ? `${partner.firstName} ${partner.lastName}` : null) ||
                      partner?.email || 
                      "Unknown Partner";
                    
                    return (
                      <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 p-3 sm:p-4 text-white shadow-lg group">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                            <div className="rounded-full bg-white/20 p-1 sm:p-2 flex-shrink-0">
                              <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-medium uppercase tracking-wide text-purple-200">Primary Co-Parent</p>
                              <div className="flex items-center gap-2 sm:gap-3 mt-1 min-w-0">
                                <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-white/30 flex-shrink-0">
                                  <AvatarImage src={partner?.profileImageUrl} alt={partnerName} />
                                  <AvatarFallback className="bg-purple-500 text-white text-sm sm:text-lg">
                                    {partnerName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-base sm:text-lg font-bold truncate">{partnerName}</p>
                              </div>
                            </div>
                          </div>
                          {/* Delete button for primary partnership */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setPartnershipToDelete(activePship);
                              setShowDeletePartnershipDialog(true);
                            }}
                            aria-label={`Remove partnership with ${partnerName}`}
                            data-testid={`button-delete-primary-partnership`}
                            className="text-white/80 hover:text-white hover:bg-white/20 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Partnerships List or Join Option */}
                  {partnerships.length === 0 ? (
                    <div className="text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Or if you received a code from your co-parent:
                      </p>
                      <JoinPartnershipDialog 
                        trigger={
                          <Button 
                            variant="outline" 
                            size="lg"
                            className="w-full"
                            data-testid="button-add-coparent"
                          >
                            Enter Their Code
                          </Button>
                        }
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Filter out active partnership if it's already shown in purple card above */}
                      {(() => {
                        const nonActivePships = partnerships.filter((p: any) => p.id !== user?.activePartnershipId);
                        
                        // Only show section if there are other partnerships besides the active one
                        if (nonActivePships.length === 0) {
                          return (
                            <div className="flex justify-end">
                              <JoinPartnershipDialog />
                            </div>
                          );
                        }
                        
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">
                                Other Co-Parents
                              </Label>
                              <JoinPartnershipDialog />
                            </div>
                            {nonActivePships.map((partnership: any) => {
                          const partner = partnership.partner;
                          const partnerName = partner?.displayName || 
                            (partner?.firstName && partner?.lastName ? `${partner.firstName} ${partner.lastName}` : null) ||
                            partner?.email || 
                            "Unknown Partner";
                          const isActive = user?.activePartnershipId === partnership.id;
                        
                        return (
                          <div 
                            key={partnership.id} 
                            className={`flex items-center justify-between p-4 rounded-md border-2 transition-all ${
                              isActive 
                                ? 'bg-purple-50 dark:bg-purple-950 border-purple-400 dark:border-purple-500 shadow-md' 
                                : 'bg-card border-transparent hover-elevate'
                            } group`}
                            data-testid={`partnership-${partnership.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={partner?.profileImageUrl} alt={partnerName} />
                                <AvatarFallback className="text-lg">
                                  {partnerName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm" data-testid={`text-partner-name-${partnership.id}`}>
                                  {partnerName}
                                </p>
                                {isActive && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 rounded-full">
                                    <Check className="h-3 w-3 text-green-700 dark:text-green-300" />
                                    <span className="text-xs font-semibold text-green-700 dark:text-green-300">Primary</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!isActive && partnerships.length > 1 && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    updateProfile.mutate({ activePartnershipId: partnership.id });
                                    toast({
                                      title: "Setting primary partner...",
                                      description: `${partnerName} is now your primary co-parent`,
                                      duration: 3000,
                                    });
                                  }}
                                  disabled={updateProfile.isPending}
                                  data-testid={`button-set-primary-partnership-${partnership.id}`}
                                  className="bg-purple-500 hover:bg-purple-600"
                                >
                                  {updateProfile.isPending ? "Setting..." : "Set Primary"}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPartnershipToDelete(partnership);
                                  setShowDeletePartnershipDialog(true);
                                }}
                                aria-label={`Remove partnership with ${partnerName}`}
                                data-testid={`button-delete-partnership-${partnership.id}`}
                                className="text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Communication Section */}
          <Collapsible open={aiOpen} onOpenChange={setAiOpen}>
            <Card className="border-l-4 border-l-blue-500">
              <CollapsibleTrigger className="w-full" data-testid="button-section-ai">
                <CardHeader className="hover-elevate">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-blue-500" />
                      <h2 className="text-xl font-semibold">Communication Tools</h2>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${aiOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <CardDescription className="text-left">Smart communication features</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="tone-analysis">Tone Analysis</Label>
                      <p className="text-xs text-muted-foreground">
                        Analyze emotional tone of messages
                      </p>
                    </div>
                    <Switch
                      id="tone-analysis"
                      checked={toneAnalysis}
                      onCheckedChange={setToneAnalysis}
                      data-testid="switch-tone-analysis"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="hints-enabled">Hints & Tips</Label>
                      <p className="text-xs text-muted-foreground">
                        Show helpful contextual guidance
                      </p>
                    </div>
                    <Switch
                      id="hints-enabled"
                      checked={hintsEnabled}
                      onCheckedChange={handleHintsToggle}
                      data-testid="switch-hints-enabled"
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Coach Settings
                    </h3>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="proactive-insights">Proactive Insights</Label>
                        <p className="text-xs text-muted-foreground">
                          Get AI suggestions before potential conflicts
                        </p>
                      </div>
                      <Switch
                        id="proactive-insights"
                        checked={mergedAgentSettings.proactiveInsightsEnabled ?? true}
                        onCheckedChange={(v) => updateLocalAgent('proactiveInsightsEnabled', v)}
                        data-testid="switch-proactive-insights"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Nudge Frequency</Label>
                      <Select
                        value={mergedAgentSettings.nudgeFrequency || 'balanced'}
                        onValueChange={(v) => updateLocalAgent('nudgeFrequency', v)}
                      >
                        <SelectTrigger data-testid="select-nudge-frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal - Only critical warnings</SelectItem>
                          <SelectItem value="balanced">Balanced - Helpful suggestions</SelectItem>
                          <SelectItem value="proactive">Proactive - All insights</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Conflict Detection Sensitivity</Label>
                        <Badge variant="secondary">
                          {mergedAgentSettings.conflictThreshold || 50}%
                        </Badge>
                      </div>
                      <Slider
                        value={[mergedAgentSettings.conflictThreshold || 50]}
                        onValueChange={([v]) => updateLocalAgent('conflictThreshold', v)}
                        min={20}
                        max={80}
                        step={5}
                        data-testid="slider-conflict-threshold"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Less sensitive</span>
                        <span>More sensitive</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Privacy Mode</Label>
                      <Select
                        value={mergedAgentSettings.privacyMode || 'standard'}
                        onValueChange={(v) => updateLocalAgent('privacyMode', v)}
                      >
                        <SelectTrigger data-testid="select-privacy-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="minimal">Minimal - Basic features only</SelectItem>
                          <SelectItem value="standard">Standard - Pattern detection enabled</SelectItem>
                          <SelectItem value="enhanced">Enhanced - Full AI coaching</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {Object.keys(localAgentSettings).length > 0 && (
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setLocalAgentSettings({})}
                          data-testid="button-reset-ai"
                        >
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => updateAgentSettings.mutate(localAgentSettings)}
                          disabled={updateAgentSettings.isPending}
                          data-testid="button-save-ai"
                        >
                          {updateAgentSettings.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Wellness Features Section */}
          <Collapsible open={wellnessOpen} onOpenChange={setWellnessOpen}>
            <Card className="border-l-4 border-l-green-500">
              <CollapsibleTrigger className="w-full" data-testid="button-section-wellness">
                <CardHeader className="hover-elevate">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-green-500" />
                      <h2 className="text-xl font-semibold">Wellness Features</h2>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${wellnessOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <CardDescription className="text-left">Optional emotional support tools (all off by default)</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="affirmations-enabled">Daily Affirmations</Label>
                      <p className="text-xs text-muted-foreground">
                        Empowering messages for successful co-parenting
                      </p>
                    </div>
                    <Switch
                      id="affirmations-enabled"
                      checked={affirmationsEnabled}
                      onCheckedChange={handleAffirmationsToggle}
                      data-testid="switch-affirmations-enabled"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label htmlFor="mood-checkins-enabled">Mood Check-ins</Label>
                      <p className="text-xs text-muted-foreground">
                        Reflection prompts during quiet moments
                      </p>
                    </div>
                    <Switch
                      id="mood-checkins-enabled"
                      checked={moodCheckInsEnabled}
                      onCheckedChange={handleMoodCheckInsToggle}
                      data-testid="switch-mood-checkins-enabled"
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Myers-Briggs Section */}
          <Collapsible open={mbtiOpen} onOpenChange={setMbtiOpen}>
            <Card className="border-l-4 border-l-amber-500">
              <CollapsibleTrigger className="w-full" data-testid="button-section-mbti">
                <CardHeader className="hover-elevate">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-amber-500" />
                      <h2 className="text-xl font-semibold">Myers-Briggs</h2>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${mbtiOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <CardDescription className="text-left">Your personality type for personalization</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-2">
                  <MBTIExplainer />
                  
                  <Select
                    value={personalityType}
                    onValueChange={handlePersonalityTypeSave}
                  >
                    <SelectTrigger id="personality-type" data-testid="select-personality-type">
                      <SelectValue placeholder="Select your Myers-Briggs type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not set</SelectItem>
                      <SelectItem value="INTJ">INTJ - Strategic planner, prefers written plans</SelectItem>
                      <SelectItem value="INTP">INTP - Analytical thinker, needs time to process</SelectItem>
                      <SelectItem value="ENTJ">ENTJ - Direct leader, likes clear decisions</SelectItem>
                      <SelectItem value="ENTP">ENTP - Creative debater, enjoys exploring ideas</SelectItem>
                      <SelectItem value="INFJ">INFJ - Thoughtful listener, values harmony</SelectItem>
                      <SelectItem value="INFP">INFP - Empathetic idealist, needs authentic connection</SelectItem>
                      <SelectItem value="ENFJ">ENFJ - Warm motivator, focuses on others' needs</SelectItem>
                      <SelectItem value="ENFP">ENFP - Enthusiastic connector, loves possibilities</SelectItem>
                      <SelectItem value="ISTJ">ISTJ - Reliable organizer, prefers facts and details</SelectItem>
                      <SelectItem value="ISFJ">ISFJ - Caring supporter, remembers important details</SelectItem>
                      <SelectItem value="ESTJ">ESTJ - Practical manager, values efficiency</SelectItem>
                      <SelectItem value="ESFJ">ESFJ - Helpful coordinator, prioritizes family harmony</SelectItem>
                      <SelectItem value="ISTP">ISTP - Quiet problem-solver, prefers action over talk</SelectItem>
                      <SelectItem value="ISFP">ISFP - Gentle peacemaker, expresses through actions</SelectItem>
                      <SelectItem value="ESTP">ESTP - Energetic doer, handles stress practically</SelectItem>
                      <SelectItem value="ESFP">ESFP - Fun-loving realist, keeps things light</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <p className="text-xs text-muted-foreground">
                    Helps provide better mood analysis tailored to your communication style
                  </p>

                  {/* Gentle nudge if personality not set */}
                  {!personalityType && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                      <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                        <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>
                          <strong>Unlock better communication help:</strong> When you set your personality type, 
                          the AI can offer suggestions that match your natural communication style.
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Co-Parent Personality Section - only show if user has an active partnership */}
                  {activePartnership && (
                    <>
                      <Separator className="my-4" />
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-pink-500" />
                          <Label className="text-sm font-medium">Co-Parent Personality</Label>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          If you know (or can guess) your co-parent's personality type, the AI can better tailor 
                          suggestions for smoother communication between you both.
                        </p>
                        
                        <Select
                          value={coParentPersonalityGuess}
                          onValueChange={handleCoParentPersonalitySave}
                        >
                          <SelectTrigger id="coparent-personality-type" data-testid="select-coparent-personality-type">
                            <SelectValue placeholder="Select co-parent's personality type (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Not set</SelectItem>
                            <SelectItem value="INTJ">INTJ - Strategic planner, prefers written plans</SelectItem>
                            <SelectItem value="INTP">INTP - Analytical thinker, needs time to process</SelectItem>
                            <SelectItem value="ENTJ">ENTJ - Direct leader, likes clear decisions</SelectItem>
                            <SelectItem value="ENTP">ENTP - Creative debater, enjoys exploring ideas</SelectItem>
                            <SelectItem value="INFJ">INFJ - Thoughtful listener, values harmony</SelectItem>
                            <SelectItem value="INFP">INFP - Empathetic idealist, needs authentic connection</SelectItem>
                            <SelectItem value="ENFJ">ENFJ - Warm motivator, focuses on others' needs</SelectItem>
                            <SelectItem value="ENFP">ENFP - Enthusiastic connector, loves possibilities</SelectItem>
                            <SelectItem value="ISTJ">ISTJ - Reliable organizer, prefers facts and details</SelectItem>
                            <SelectItem value="ISFJ">ISFJ - Caring supporter, remembers important details</SelectItem>
                            <SelectItem value="ESTJ">ESTJ - Practical manager, values efficiency</SelectItem>
                            <SelectItem value="ESFJ">ESFJ - Helpful coordinator, prioritizes family harmony</SelectItem>
                            <SelectItem value="ISTP">ISTP - Quiet problem-solver, prefers action over talk</SelectItem>
                            <SelectItem value="ISFP">ISFP - Gentle peacemaker, expresses through actions</SelectItem>
                            <SelectItem value="ESTP">ESTP - Energetic doer, handles stress practically</SelectItem>
                            <SelectItem value="ESFP">ESFP - Fun-loving realist, keeps things light</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        {personalitySettings?.effectivePersonalities?.isCoParentGuessed && 
                         personalitySettings?.effectivePersonalities?.coParent && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <Info className="h-3 w-3" />
                            This is your estimate. If your co-parent sets their own type, it will be used instead.
                          </p>
                        )}
                        
                        {personalitySettings?.effectivePersonalities?.coParent && 
                         !personalitySettings?.effectivePersonalities?.isCoParentGuessed && (
                          <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Your co-parent has confirmed their personality type.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                  
                  {!activePartnership && partnerships.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">
                      Connect with a co-parent to enable dual-personality AI adaptation.
                    </p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Subscription & Data Preservation Section */}
          <Collapsible open={subscriptionOpen} onOpenChange={setSubscriptionOpen}>
            <Card className="border-l-4 border-l-amber-500">
              <CollapsibleTrigger className="w-full" data-testid="button-section-subscription">
                <CardHeader className="hover-elevate">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-500" />
                      <h2 className="text-xl font-semibold">Subscription & Data</h2>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${subscriptionOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <CardDescription className="text-left">Manage your plan and data preservation</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6 pt-2">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-amber-700 dark:text-amber-400 capitalize">
                          {usageStatus?.tier || "Free"} Plan
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {usageStatus?.isTrialActive 
                            ? `${usageStatus.daysRemaining} days remaining in trial`
                            : "Standard Access"}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                        {usageStatus?.isTrialActive ? "Full Trial" : "Standard"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-6">
                      <div className="bg-background rounded-xl p-3 border text-center">
                        <p className="text-xs text-muted-foreground mb-1">Days</p>
                        <p className="font-bold">{usageStatus?.usage?.activeDays || 0}/4</p>
                      </div>
                      <div className="bg-background rounded-xl p-3 border text-center">
                        <p className="text-xs text-muted-foreground mb-1">Messages</p>
                        <p className="font-bold">{usageStatus?.usage?.messages || 0}/10</p>
                      </div>
                      <div className="bg-background rounded-xl p-3 border text-center">
                        <p className="text-xs text-muted-foreground mb-1">Tools</p>
                        <p className="font-bold">{usageStatus?.usage?.actions || 0}/1</p>
                      </div>
                    </div>

                    {usageStatus?.signals?.isEligibleForPreservation && (
                      <div className="bg-background rounded-xl p-4 border-2 border-amber-500/30 mb-4 animate-in zoom-in-95 duration-500">
                        <h4 className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-1">
                          <Shield className="h-4 w-4" />
                          Preserve Your Calm
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          You've built meaningful momentum. Make PeacePad permanent to ensure your history and patterns are never lost.
                        </p>
                        <Button className="w-full mt-4 bg-amber-500 hover:bg-amber-600 text-white font-bold" size="lg">
                          Protect My Progress
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Appearance Section */}
          <Collapsible open={appearanceOpen} onOpenChange={setAppearanceOpen}>
            <Card className="border-l-4 border-l-orange-500">
              <CollapsibleTrigger className="w-full" data-testid="button-section-appearance">
                <CardHeader className="hover-elevate">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Palette className="h-5 w-5 text-orange-500" />
                      <h2 className="text-xl font-semibold">Appearance</h2>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${appearanceOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <CardDescription className="text-left">Customize how PeacePad looks</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-2 space-y-6">
                  {/* Light/Dark/Auto Theme Toggle */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Mode</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        size="default"
                        onClick={() => setTheme("light")}
                        data-testid="button-theme-light"
                      >
                        <Sun className="h-4 w-4 mr-2" />
                        Light
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        size="default"
                        onClick={() => setTheme("dark")}
                        data-testid="button-theme-dark"
                      >
                        <Moon className="h-4 w-4 mr-2" />
                        Dark
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "outline"}
                        size="default"
                        onClick={() => setTheme("system")}
                        data-testid="button-theme-system"
                      >
                        <Monitor className="h-4 w-4 mr-2" />
                        Auto
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Auto matches your device settings
                    </p>
                  </div>

                  <Separator />

                  {/* Color Theme Selector */}
                  <ThemeColorSelector currentAvatarColor={currentProfileImage} />
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Privacy & Security Section */}
          <Collapsible open={privacyOpen} onOpenChange={setPrivacyOpen}>
            <Card className="border-l-4 border-l-red-500">
              <CollapsibleTrigger className="w-full" data-testid="button-section-privacy">
                <CardHeader className="hover-elevate">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-red-500" />
                      <h2 className="text-xl font-semibold">Privacy & Security</h2>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${privacyOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <CardDescription className="text-left">Manage your account and data</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-2">
                  <Link href="/terms">
                    <Button variant="outline" className="w-full justify-start" data-testid="button-view-terms">
                      <FileText className="h-4 w-4 mr-2" />
                      View Terms & Conditions
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setShowExportDialog(true)}
                    data-testid="button-export-data"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export My Data
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full"
                    onClick={() => setShowDeleteDialog(true)}
                    data-testid="button-delete-account"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleSignOut}
                    data-testid="button-sign-out"
                  >
                    Sign Out
                  </Button>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* About & System Section */}
          <Collapsible open={systemOpen} onOpenChange={setSystemOpen}>
            <Card className="border-l-4 border-l-blue-500">
              <CollapsibleTrigger className="w-full" data-testid="button-section-system">
                <CardHeader className="hover-elevate">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-500" />
                      <h2 className="text-xl font-semibold">About & System</h2>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${systemOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <CardDescription className="text-left">App installation and version info</CardDescription>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => {
                        const event = new Event('beforeinstallprompt');
                        window.dispatchEvent(event);
                      }}
                      data-testid="button-install-app"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Install PeacePad on Home Screen
                    </Button>
                    <p className="text-xs text-muted-foreground px-2">
                      Download PeacePad to your phone for quick access and offline support. Works on both iOS and Android.
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* App Version Footer */}
        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            PeacePad v1.0.0
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            © {new Date().getFullYear()} PeacePad. All rights reserved.
          </p>
        </div>
      </div>

      {/* Delete Partnership Confirmation Dialog */}
      <AlertDialog open={showDeletePartnershipDialog} onOpenChange={setShowDeletePartnershipDialog}>
        <AlertDialogContent data-testid="dialog-delete-partnership">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Partnership?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your partnership with{" "}
              <strong>
                {partnershipToDelete?.partner?.displayName || 
                  (partnershipToDelete?.partner?.firstName && partnershipToDelete?.partner?.lastName 
                    ? `${partnershipToDelete.partner.firstName} ${partnershipToDelete.partner.lastName}` 
                    : partnershipToDelete?.partner?.email || "this co-parent")}
              </strong>
              , including all conversations, calendar events, and shared data.
              <p className="mt-2 font-semibold">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-partnership">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => partnershipToDelete && deletePartnership.mutate(partnershipToDelete.id)}
              disabled={deletePartnership.isPending}
              className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
              data-testid="button-confirm-delete-partnership"
            >
              {deletePartnership.isPending ? "Removing..." : "Remove Partnership"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="dialog-delete-account">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">Deleting your account will remove your PeacePad profile and associated data.</p>
              <div className="bg-muted p-3 rounded-md space-y-2 text-xs">
                <p>• Your account will be <strong>deactivated immediately</strong>.</p>
                <p>• Your data will be <strong>permanently deleted within 30 days</strong>.</p>
                <p>• You can <strong>restore your account</strong> by signing in again during this period.</p>
              </div>
              <p className="mt-2 text-xs font-semibold text-destructive">
                After 30 days, all data is permanently erased and cannot be recovered.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAccount.mutate()}
              disabled={deleteAccount.isPending}
              className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
              data-testid="button-confirm-delete"
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Data Confirmation Dialog */}
      <AlertDialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <AlertDialogContent data-testid="dialog-export-data">
          <AlertDialogHeader>
            <AlertDialogTitle>Export Your Data</AlertDialogTitle>
            <AlertDialogDescription>
              This will download a JSON file containing all your PeacePad data, including:
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>Messages and conversations</li>
                <li>Notes, tasks, and child updates</li>
                <li>Expenses and financial records</li>
                <li>Calendar events and schedules</li>
                <li>Partnerships and contacts</li>
              </ul>
              <p className="mt-2 text-xs font-medium">
                This export is fully compliant with GDPR data portability requirements.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-export">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setIsExporting(true);
                try {
                  const res = await fetch('/api/user/export', {
                    method: 'GET',
                    credentials: 'include',
                  });
                  if (!res.ok) throw new Error('Export failed');
                  
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `peacepad-data-export-${new Date().toISOString().split('T')[0]}.json`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  
                  toast({
                    title: "Data exported successfully",
                    description: "Your data has been downloaded",
                    duration: 3000,
                  });
                  setShowExportDialog(false);
                } catch (error) {
                  toast({
                    title: "Export failed",
                    description: "Failed to export your data",
                    variant: "destructive",
                    duration: 5000,
                  });
                } finally {
                  setIsExporting(false);
                }
              }}
              disabled={isExporting}
              data-testid="button-confirm-export"
            >
              {isExporting ? "Exporting..." : "Export Data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
