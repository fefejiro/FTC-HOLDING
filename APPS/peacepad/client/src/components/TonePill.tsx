import { Badge } from "@/components/ui/badge";
import { Smile, Meh, Frown, Shield, Loader2 } from "lucide-react";

export type ToneType = "calm" | "cooperative" | "neutral" | "frustrated" | "defensive" | "hostile" | "analyzing";

interface TonePillProps {
  tone: ToneType;
  summary: string;
}

const toneConfig = {
  analyzing: {
    icon: Loader2,
    color: "bg-gradient-to-r from-muted/20 to-muted/5 text-muted-foreground border-border",
    label: "Analyzing",
    description: "Checking tone...",
    animate: true,
  },
  calm: {
    icon: Smile,
    color: "bg-gradient-to-r from-sky-100/60 to-sky-50/30 text-sky-600 dark:from-sky-900/30 dark:to-sky-950/20 dark:text-sky-400 border-sky-200/40 dark:border-sky-800/30",
    label: "Calm",
    description: "Peaceful and thoughtful",
  },
  cooperative: {
    icon: Smile,
    color: "bg-gradient-to-r from-teal-100/60 to-teal-50/30 text-teal-600 dark:from-teal-900/30 dark:to-teal-950/20 dark:text-teal-400 border-teal-200/40 dark:border-teal-800/30",
    label: "Cooperative",
    description: "Collaborative tone",
  },
  neutral: {
    icon: Meh,
    color: "bg-gradient-to-r from-muted/20 to-muted/5 text-muted-foreground border-border",
    label: "Neutral",
    description: "Matter-of-fact",
  },
  frustrated: {
    icon: Frown,
    color: "bg-gradient-to-r from-blue-100/60 to-blue-50/30 text-blue-600 dark:from-blue-900/30 dark:to-blue-950/20 dark:text-blue-400 border-blue-200/40 dark:border-blue-800/30",
    label: "Frustrated",
    description: "Showing tension",
  },
  defensive: {
    icon: Shield,
    color: "bg-gradient-to-r from-indigo-100/60 to-indigo-50/30 text-indigo-600 dark:from-indigo-900/30 dark:to-indigo-950/20 dark:text-indigo-400 border-indigo-200/40 dark:border-indigo-800/30",
    label: "Defensive",
    description: "Guarded tone",
  },
  hostile: {
    icon: Shield,
    color: "bg-gradient-to-r from-slate-200/60 to-slate-100/30 text-slate-600 dark:from-slate-800/30 dark:to-slate-900/20 dark:text-slate-400 border-slate-300/40 dark:border-slate-700/30",
    label: "Escalated",
    description: "High tension",
  },
};

export default function TonePill({ tone, summary }: TonePillProps) {
  const config = toneConfig[tone];
  if (!config) return null;
  
  const Icon = config.icon;
  const isAnalyzing = 'animate' in config && config.animate;

  return (
    <div className="flex flex-col gap-1.5">
      <Badge
        variant="outline"
        className={`${config.color} text-xs font-bold gap-1 px-2.5 py-1 shadow-sm hover:shadow-md border-0 rounded-full w-fit transition-shadow animate-scale-in`}
        data-testid={`badge-tone-${tone}`}
      >
        <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isAnalyzing ? 'animate-spin' : ''}`} />
        <span>{config.label}</span>
      </Badge>
      {summary && (
        <p className="text-xs text-muted-foreground leading-tight max-w-xs font-semibold">
          {summary}
        </p>
      )}
    </div>
  );
}
