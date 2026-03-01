import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, Palette, Sparkles } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";

/**
 * Theme color system with personalized color schemes
 * Each theme includes primary action color, accent color, and description
 */
const THEME_COLORS = [
  { 
    id: "calm-purple", 
    label: "Purple", 
    description: "Playful & Empowering",
    hslPrimary: "255 97% 77%", 
    hslAccent: "9 100% 70%", 
    displayColor: "from-purple-400 to-purple-600",
    hex: "#A78BFE → #FF7F66"
  },
  { 
    id: "calm-blue", 
    label: "Blue", 
    description: "Calm & Trustworthy",
    hslPrimary: "207 100% 70%", 
    hslAccent: "146 61% 66%", 
    displayColor: "from-blue-400 to-blue-600",
    hex: "#64BAFF → #70E09E"
  },
  { 
    id: "calm-green", 
    label: "Green", 
    description: "Fresh & Balanced",
    hslPrimary: "146 61% 66%", 
    hslAccent: "43 100% 70%", 
    displayColor: "from-emerald-400 to-emerald-600",
    hex: "#70E09E → #FFD864"
  },
  { 
    id: "calm-orange", 
    label: "Orange", 
    description: "Warm & Inviting",
    hslPrimary: "39 100% 60%", 
    hslAccent: "255 97% 77%", 
    displayColor: "from-orange-400 to-orange-600",
    hex: "#FF9500 → #A78BFE"
  },
  { 
    id: "calm-pink", 
    label: "Pink", 
    description: "Nurturing & Caring",
    hslPrimary: "320 100% 70%", 
    hslAccent: "207 100% 70%", 
    displayColor: "from-pink-400 to-pink-600",
    hex: "#FF4D94 → #64BAFF"
  },
  { 
    id: "calm-teal", 
    label: "Teal", 
    description: "Serene & Protective",
    hslPrimary: "180 100% 50%", 
    hslAccent: "39 100% 60%", 
    displayColor: "from-teal-400 to-teal-600",
    hex: "#00D2A8 → #FF9500"
  },
];

interface ThemeColorSelectorProps {
  currentAvatarColor?: string;
}

export function ThemeColorSelector({ currentAvatarColor }: ThemeColorSelectorProps) {
  const { toast } = useToast();
  const [transitioningTheme, setTransitioningTheme] = useState<string | null>(null);

  const updateTheme = useMutation({
    mutationFn: async (avatarId: string) => {
      // Find the avatar with this ID
      const avatar = THEME_COLORS.find(a => a.id === avatarId);
      if (!avatar) return;

      // Convert to profile image format
      const profileImageUrl = `avatar:${avatarId}`;
      
      const res = await apiRequest("PATCH", "/api/user/profile", {
        profileImageUrl,
      });
      return await res.json();
    },
    onSuccess: (_, avatarId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      const theme = THEME_COLORS.find(t => t.id === avatarId);
      
      // Finish transition animation
      setTimeout(() => setTransitioningTheme(null), 350);
      
      toast({
        title: `${theme?.label} theme activated`,
        description: "Your PeacePad theme has been updated!",
        duration: 3000,
      });
    },
    onError: () => {
      setTransitioningTheme(null);
      toast({
        title: "Error",
        description: "Failed to update theme. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header with description */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <Label className="text-base font-semibold block">Personalized Color Theme</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Every color tells a story. Pick your theme and watch PeacePad transform.
            </p>
          </div>
        </div>
      </div>

      {/* Theme Color Grid with Enhanced Interactions */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select Your Theme</p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {THEME_COLORS.map((theme) => {
            const isSelected = currentAvatarColor?.includes(theme.id);
            const isTransitioning = transitioningTheme === theme.id;
            return (
              <div key={theme.id} className="space-y-2">
                <button
                  onClick={() => {
                    setTransitioningTheme(theme.id);
                    updateTheme.mutate(theme.id);
                  }}
                  disabled={updateTheme.isPending}
                  className="group relative w-full"
                  data-testid={`button-theme-color-${theme.id}`}
                  title={`${theme.label} theme - ${theme.description}`}
                >
                  <div
                    className={`
                      w-full aspect-square rounded-2xl
                      bg-gradient-to-br ${theme.displayColor}
                      shadow-sm group-hover:shadow-md
                      transition-all duration-300 ease-in-out
                      relative overflow-hidden
                      ${isTransitioning ? 'ring-4 ring-offset-2 ring-foreground scale-125 shadow-lg' : 'group-hover:scale-110'}
                      ${isSelected ? 'ring-2 ring-offset-2 ring-foreground scale-110' : ''}
                      ${updateTheme.isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-sm">
                        <Check className="h-6 w-6 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                </button>
                <div className="text-center space-y-0.5">
                  <p className="text-xs font-semibold text-foreground">{theme.label}</p>
                  <p className="text-[10px] text-muted-foreground">{theme.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Enhanced Theme Preview Card */}
      {currentAvatarColor && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Theme Preview</p>
          <Card className="bg-gradient-to-br from-primary/15 via-accent/10 to-primary/10 p-5 border border-primary/30 overflow-hidden relative">
            {/* Decorative accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
            
            <div className="relative space-y-4">
              {/* Color swatches with labels */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Primary Action Color</p>
                    <div className="h-10 rounded-xl bg-primary shadow-md border border-primary/20 transition-all duration-300" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Accent Highlight</p>
                    <div className="h-10 rounded-xl bg-accent shadow-md border border-accent/20 transition-all duration-300" />
                  </div>
                </div>
              </div>

              {/* Color info */}
              <div className="flex items-center justify-between pt-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    <p className="text-xs font-semibold text-foreground">Theme Active</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {THEME_COLORS.find(t => currentAvatarColor?.includes(t.id))?.description}
                  </p>
                </div>
              </div>
            </div>
          </Card>
          <p className="text-xs text-muted-foreground text-center px-2">
            All buttons, links, and accents throughout PeacePad will reflect your chosen theme
          </p>
        </div>
      )}

      {/* Theme Guide */}
      <Card className="bg-muted/40 p-4 border border-border">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Palette className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">How themes work</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your chosen theme personalizes button colors, highlights, and interactive elements throughout PeacePad. Changes are applied instantly with a smooth transition.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
