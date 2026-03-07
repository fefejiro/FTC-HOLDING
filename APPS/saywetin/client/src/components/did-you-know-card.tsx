import { Card, CardContent } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

interface DidYouKnowCardProps {
  fact: string;
  className?: string;
}

export function DidYouKnowCard({ fact, className }: DidYouKnowCardProps) {
  return (
    <Card 
      className={`border-gold/30 bg-gradient-to-br from-gold/10 to-gold/5 ${className}`}
      data-testid="card-did-you-know"
    >
      <CardContent className="py-4 px-5">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
              <Lightbulb className="h-4 w-4 text-gold" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">
              Did You Know?
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">
              {fact}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
