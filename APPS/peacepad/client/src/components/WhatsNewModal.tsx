import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bug, Zap, Heart } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    type: "feature" | "improvement" | "bugfix" | "announcement";
    title: string;
    description: string;
  }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.0.3",
    date: "January 31, 2026",
    changes: [
      {
        type: "improvement",
        title: "UX Overhaul",
        description: "Radical simplification of the 'pressure release valve' experience. Practice Chat is now always the homepage with a single input box for instant results.",
      },
      {
        type: "improvement",
        title: "Uniform Aesthetic",
        description: "Unified minimal design across all features. Clean, focused connection and empty states without promotional clutter.",
      },
      {
        type: "improvement",
        title: "Optimized Navigation",
        description: "Reordered navigation based on access: Practice, Calendar, Expenses, Chat, and Conch Mode.",
      },
      {
        type: "improvement",
        title: "Android Performance",
        description: "Improved compatibility and performance for the latest Android devices with version 1.0.3.",
      },
    ],
  },
];

const typeConfig = {
  feature: {
    icon: Sparkles,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    label: "New",
  },
  improvement: {
    icon: Zap,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    label: "Improved",
  },
  bugfix: {
    icon: Bug,
    color: "text-green-500",
    bg: "bg-green-500/10",
    label: "Fixed",
  },
  announcement: {
    icon: Heart,
    color: "text-pink-500",
    bg: "bg-pink-500/10",
    label: "Announcement",
  },
};

interface WhatsNewModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function WhatsNewModal({ open: controlledOpen, onOpenChange, trigger }: WhatsNewModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  const latestVersion = changelog[0].version;
  const LAST_SEEN_KEY = "lastSeenChangelogVersion";

  useEffect(() => {
    // Only auto-show if uncontrolled (no explicit trigger)
    if (!isControlled && !trigger) {
      // Check if user just joined a partnership (within last 2 minutes)
      // Skip What's New for brand new users - everything is new to them
      const justJoinedData = localStorage.getItem("just_joined_partnership");
      if (justJoinedData) {
        try {
          const { timestamp } = JSON.parse(justJoinedData);
          const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
          if (timestamp > twoMinutesAgo) {
            // User just joined, skip What's New and mark as seen
            localStorage.setItem(LAST_SEEN_KEY, latestVersion);
            return;
          }
        } catch (e) {
          // Invalid data, remove it
          localStorage.removeItem("just_joined_partnership");
        }
      }
      
      const lastSeenVersion = localStorage.getItem(LAST_SEEN_KEY);
      if (lastSeenVersion !== latestVersion) {
        setInternalOpen(true);
      }
    }
  }, [isControlled, trigger, latestVersion]);

  const handleClose = () => {
    localStorage.setItem(LAST_SEEN_KEY, latestVersion);
    setOpen?.(false);
  };

  const handleTriggerClick = () => {
    setOpen?.(true);
  };

  return (
    <>
      {trigger && <div onClick={handleTriggerClick}>{trigger}</div>}
      
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 sm:pb-4" data-testid="dialog-whats-new">
          <DialogHeader className="flex-shrink-0 p-6 pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <DialogTitle>What's New in PeacePad</DialogTitle>
            </div>
            <DialogDescription>
              Recent updates, improvements, and bug fixes
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 min-h-0">
            <div className="space-y-6 pb-6">
              {changelog.map((entry, entryIndex) => (
                <div key={entry.version}>
                  {entryIndex > 0 && <Separator className="my-6" />}
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">Version {entry.version}</h3>
                        <p className="text-sm text-muted-foreground">{entry.date}</p>
                      </div>
                      {entryIndex === 0 && (
                        <Badge variant="default" data-testid="badge-latest">Latest</Badge>
                      )}
                    </div>

                    <div className="space-y-3">
                      {entry.changes.map((change, changeIndex) => {
                        const config = typeConfig[change.type];
                        const Icon = config.icon;

                        return (
                          <Card key={changeIndex} className="overflow-visible mb-2">
                            <CardContent className="p-4">
                              <div className="flex gap-3">
                                <div className={`flex-shrink-0 rounded-full p-2 ${config.bg}`}>
                                  <Icon className={`h-4 w-4 ${config.color}`} />
                                </div>
                                <div className="flex-1 space-y-2 min-w-0">
                                  <div className="flex items-start gap-2 flex-wrap">
                                    <h4 className="font-medium text-sm leading-tight">{change.title}</h4>
                                    <Badge variant="outline" className="text-xs flex-shrink-0">
                                      {config.label}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-normal">
                                    {change.description}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end p-6 pt-4 border-t flex-shrink-0 bg-background/80 backdrop-blur-sm sticky bottom-0 sm:static">
            <Button onClick={handleClose} data-testid="button-got-it" className="w-full sm:w-auto">
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
