import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BetaNavProps {
  currentPage: number;
  totalPages: number;
  prevLink?: string;
  nextLink?: string;
  prevLabel?: string;
  nextLabel?: string;
}

const pages = [
  { path: '/beta/welcome', label: 'Welcome' },
  { path: '/beta/getting-started', label: 'Getting Started' },
  { path: '/beta/features', label: 'Features' },
  { path: '/beta/feedback-guide', label: 'Feedback' },
  { path: '/beta/faq', label: 'FAQ' },
];

export function BetaNav({ 
  currentPage, 
  totalPages, 
  prevLink, 
  nextLink,
  prevLabel = 'Back',
  nextLabel = 'Next'
}: BetaNavProps) {
  return (
    <div className="space-y-4">
      {/* Progress Dots */}
      <div className="flex justify-center gap-2">
        {Array.from({ length: totalPages }).map((_, i) => (
          <Link key={i} href={pages[i].path}>
            <button
              className={`h-2 rounded-full transition-all ${
                i === currentPage - 1
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted-foreground/30 hover-elevate'
              }`}
              aria-label={`Go to ${pages[i].label}`}
              data-testid={`beta-nav-dot-${i + 1}`}
            />
          </Link>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        {prevLink ? (
          <Link href={prevLink}>
            <Button 
              variant="outline" 
              className="gap-2"
              data-testid="button-beta-prev"
            >
              <ChevronLeft className="h-4 w-4" />
              {prevLabel}
            </Button>
          </Link>
        ) : (
          <div />
        )}

        {nextLink && (
          <Link href={nextLink}>
            <Button 
              className="gap-2"
              data-testid="button-beta-next"
            >
              {nextLabel}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
