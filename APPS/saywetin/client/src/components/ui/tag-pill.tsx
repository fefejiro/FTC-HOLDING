import { cn } from "@/lib/utils";

type TagVariant = 'genre' | 'language' | 'mood' | 'context' | 'default';

interface TagPillProps {
  children: React.ReactNode;
  variant?: TagVariant;
  className?: string;
}

const variantStyles: Record<TagVariant, string> = {
  genre: 'bg-primary/15 text-primary border-primary/20',
  language: 'bg-gold/15 text-gold border-gold/20',
  mood: 'bg-orange/15 text-orange border-orange/20',
  context: 'bg-accent text-accent-foreground border-accent',
  default: 'bg-muted text-muted-foreground border-muted',
};

export function TagPill({ children, variant = 'default', className }: TagPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide border',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface LanguageTagProps {
  language: string;
  className?: string;
}

const languageLabels: Record<string, string> = {
  yoruba: 'YOR',
  igbo: 'IGB',
  hausa: 'HAU',
  pidgin: 'PID',
  english: 'ENG',
  zulu: 'ZUL',
  xhosa: 'XHO',
  swahili: 'SWA',
};

export function LanguageTag({ language, className }: LanguageTagProps) {
  const label = languageLabels[language.toLowerCase()] || language.substring(0, 3).toUpperCase();
  return (
    <TagPill variant="language" className={className}>
      {label}
    </TagPill>
  );
}

interface MoodTagProps {
  mood: string;
  className?: string;
}

export function MoodTag({ mood, className }: MoodTagProps) {
  return (
    <TagPill variant="mood" className={className}>
      {mood}
    </TagPill>
  );
}

interface GenreTagProps {
  genre: string;
  className?: string;
}

export function GenreTag({ genre, className }: GenreTagProps) {
  return (
    <TagPill variant="genre" className={className}>
      {genre}
    </TagPill>
  );
}
