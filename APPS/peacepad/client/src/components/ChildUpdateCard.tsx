import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Heart } from "lucide-react";

interface ChildUpdateCardProps {
  childName: string;
  update: string;
  author: string;
  timestamp: string;
}

export default function ChildUpdateCard({ childName, update, author, timestamp }: ChildUpdateCardProps) {
  return (
    <Card className="p-4 hover-elevate">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary">
            {childName.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm text-foreground">{childName}</h3>
            <Heart className="h-3 w-3 text-chart-1 fill-chart-1" />
          </div>
          <p className="text-sm text-foreground mb-2">{update}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">by {author}</span>
            <span className="text-xs font-mono text-muted-foreground">{timestamp}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
