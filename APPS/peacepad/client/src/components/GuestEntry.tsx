import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, User, Shield, Lock, ChevronRight, Heart, Check } from "lucide-react";
import { getApiUrl, queryClient } from "@/lib/queryClient";
import { readStoredConsent } from "@/lib/consentState";

interface GuestEntryProps {
  onAuthenticated: () => void;
}

interface GuestAuthResponse {
  success?: boolean;
  user?: unknown;
  guestSessionId?: string;
  sessionId?: string;
  guestId?: string;
  expiresAt?: string;
}

function getDaysRemainingFromExpiry(expiresAt: string): number {
  const expiresAtMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresAtMs)) {
    return 0;
  }
  const msRemaining = expiresAtMs - Date.now();
  return Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
}

// Color palette theme mapping
const COLOR_OPTIONS = [
  { id: "calm-purple", label: "Purple", gradient: "from-purple-400 to-purple-600" },
  { id: "calm-blue", label: "Blue", gradient: "from-blue-400 to-blue-600" },
  { id: "calm-green", label: "Green", gradient: "from-emerald-400 to-emerald-600" },
  { id: "calm-orange", label: "Orange", gradient: "from-orange-400 to-orange-600" },
  { id: "calm-pink", label: "Pink", gradient: "from-pink-400 to-pink-600" },
  { id: "calm-teal", label: "Teal", gradient: "from-teal-400 to-teal-600" },
];

export default function GuestEntry({ onAuthenticated }: GuestEntryProps) {
  const [displayName, setDisplayName] = useState("");
  // Start with NO color selected (default purple)
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const selectedOption = COLOR_OPTIONS.find(s => s.id === selectedAvatar);

  useEffect(() => {
    const checkExistingSession = async () => {
      const sessionId = localStorage.getItem("peacepad_session_id");
      if (sessionId) {
        try {
          const response = await fetch(getApiUrl("/api/auth/user"), {
            credentials: "include",
          });
          if (response.ok) {
            const data = await response.json();
            toast({
              title: "Welcome back!",
              description: `Hello again, ${data.displayName || "there"}!`,
              duration: 3000,
            });
            onAuthenticated();
          } else if (response.status === 401) {
            localStorage.removeItem("peacepad_session_id");
          }
        } catch (error) {
          console.error("Session check error:", error);
          localStorage.removeItem("peacepad_session_id");
        }
      }
    };

    checkExistingSession();
  }, [onAuthenticated, toast]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 2MB",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    try {
      const compressed = await compressImage(file);
      setCustomImage(compressed);
      setSelectedAvatar("");
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to process image. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const handleAvatarSelect = (avatarId: string) => {
    // If clicking same color, deselect it
    if (selectedAvatar === avatarId) {
      setSelectedAvatar(null);
      localStorage.removeItem("selected_avatar_color");
      
      // Reset to default purple
      document.documentElement.style.setProperty('--primary', "255 97% 77%");
      return;
    }

    setSelectedAvatar(avatarId);
    // Don't clear custom image - allow users to have both a preference AND a custom picture
    // The custom picture takes display priority, but theme is stored for personalization
    localStorage.setItem("selected_avatar_color", avatarId);
    
    // Preview the theme change immediately if possible by setting CSS variables
    // This provides instant visual feedback for the "color preference"
    const root = document.documentElement;
    const themes: Record<string, string> = {
      "calm-purple": "255 97% 77%",
      "calm-blue": "207 100% 70%",
      "calm-green": "146 61% 66%",
      "calm-orange": "39 100% 60%",
      "calm-pink": "320 100% 70%",
      "calm-teal": "180 100% 50%",
    };
    if (themes[avatarId]) {
      root.style.setProperty('--primary', themes[avatarId]);
    }
  };

  const handleGuestEntry = async () => {
    setIsLoading(true);
    try {
      const sessionId = localStorage.getItem("peacepad_session_id");
      const consent = readStoredConsent();
      
      // Convert avatar selection to profile image format
      let profileImage = customImage;
      if (!customImage && selectedAvatar) {
        profileImage = `avatar:${selectedAvatar}`;
      }
      
      const requestBody = {
        displayName: displayName || undefined,
        profileImageUrl: profileImage,
        sessionId: sessionId || undefined,
        hasAcceptedConsent: consent.requiredAccepted,
        aiMessageConsent: consent.aiMessageConsent,
        aiCallConsent: consent.aiCallConsent,
      };
      
      const response = await fetch(getApiUrl("/api/auth/guest"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Authentication failed" }));
        throw new Error(errorData.message || "Authentication failed");
      }

      const data = (await response.json()) as GuestAuthResponse;
      if (typeof data.sessionId === "string" && data.sessionId.length > 0) {
        localStorage.setItem("peacepad_session_id", data.sessionId);
      }

      if (data.user) {
        queryClient.setQueryData(["/api/auth/user"], data.user);
      }

      if (typeof data.expiresAt === "string") {
        const daysRemaining = getDaysRemainingFromExpiry(data.expiresAt);
        queryClient.setQueryData(["/api/auth/guest-session-info"], {
          expiresAt: data.expiresAt,
          daysRemaining,
        });
        queryClient.setQueryData(["/api/session"], {
          sessionType: "guest",
          mode: "guest",
          user: data.user ?? null,
          guest: {
            guestId: data.guestId ?? null,
            guestSessionId: data.guestSessionId ?? data.sessionId ?? null,
            sessionId: data.sessionId ?? null,
            expiresAt: data.expiresAt,
          },
          trial: {
            expiresAt: data.expiresAt,
            daysRemaining,
            isExpired: false,
          },
        });
      }

      // Store avatar color for theme personalization
      if (selectedAvatar) {
        localStorage.setItem("selected_avatar_color", selectedAvatar);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Welcome to PeacePad!",
        description: "Your space for clear family communication",
        duration: 3000,
      });

      onAuthenticated();
    } catch (error: any) {
      console.error("[GuestEntry] Guest entry error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to authenticate. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedAvatarOption = COLOR_OPTIONS.find(a => a.id === selectedAvatar);

  return (
    <div className="min-h-[100dvh] flex flex-col overflow-hidden safe-area-top">
      {/* Subdued Hero Section */}
      <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 px-6 pt-12 pb-8 text-center transition-colors duration-500">
        {/* Subtle decorative accents */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-primary/10 rounded-full blur-2xl transition-colors duration-500" />
        <div className="absolute bottom-5 right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl transition-colors duration-500" />
        
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 backdrop-blur-sm rounded-2xl mb-4 border border-primary/20 transition-colors duration-300">
            <Heart className="h-8 w-8 text-primary transition-colors duration-300" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
            Welcome to PeacePad
          </h1>
          <p className="text-slate-300 text-base sm:text-lg max-w-sm mx-auto">
            Private beta access is being opened in stages
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-background px-6 py-6 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-6">
          
          {/* Compact Safety Notice */}
          <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-xl border border-border/50">
            <Shield className="h-4 w-4 text-primary flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Access sessions are managed internally. Review the Privacy Policy for how PeacePad
              handles information.
            </p>
          </div>

          {/* Color Palette Selection */}
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-medium text-foreground">Pick your color (Optional)</h3>
              <p className="text-xs text-muted-foreground">This sets the primary color for your PeacePad.</p>
            </div>
            
            {/* Colors - Compact Grid */}
            <div className="grid grid-cols-3 gap-3">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAvatarSelect(option.id)}
                  disabled={isLoading}
                  className={`
                    relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center
                    ${selectedAvatar === option.id 
                      ? "border-primary bg-primary/5 shadow-sm" 
                      : "border-border/50 bg-muted/20 hover:bg-muted/30"}
                  `}
                  data-testid={`button-color-${option.id}`}
                >
                  <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${option.gradient} flex-shrink-0 flex items-center justify-center`}>
                    {selectedAvatar === option.id && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <p className={`text-xs font-medium leading-none ${selectedAvatar === option.id ? "text-primary" : "text-foreground"}`}>
                    {option.label}
                  </p>
                </button>
              ))}
            </div>

            {/* Display Name & Profile Pic Row */}
            <div className="pt-4 space-y-4 border-t border-border/50">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="display-name" className="text-sm text-muted-foreground">
                    What should we call you?
                  </Label>
                  <Input
                    id="display-name"
                    placeholder="Stay anonymous or enter name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={isLoading}
                    className="h-10"
                    data-testid="input-display-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Photo</Label>
                  <div className="relative group">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                      {customImage ? (
                        <AvatarImage src={customImage} />
                      ) : (
                        <AvatarFallback>
                          <User className="h-5 w-5" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border shadow-sm">
                      <Upload className="h-2 w-2 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
          </div>

          {/* Entry Button */}
          <div className="space-y-3 pt-2">
            <Button
              className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 shadow-lg"
              onClick={handleGuestEntry}
              disabled={isLoading}
              data-testid="button-enter-peacepad"
            >
              {isLoading ? (
                "Getting things ready..."
              ) : (
                <>
                  Enter PeacePad Beta
                  <ChevronRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You'll see our onboarding wizard next to set up your profile
            </p>
          </div>

          {/* Footer Info */}
          <div className="pt-4 pb-6 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="h-3 w-3" />
              <span>Session-protected, partnership-scoped communications</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
