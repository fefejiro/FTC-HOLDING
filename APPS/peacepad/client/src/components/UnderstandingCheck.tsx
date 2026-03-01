import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, X } from "lucide-react";

interface UnderstandingCheckProps {
  partnerName: string;
  originalMessage: string;
  onReflect: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

export function UnderstandingCheck({
  partnerName,
  originalMessage,
  onReflect,
  onSkip,
  onDismiss,
}: UnderstandingCheckProps) {
  return (
    <Card className="border-2 border-primary/20 bg-primary/5" data-testid="card-understanding-check">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <Heart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base" data-testid="text-understanding-title">
                Pause and reflect
              </CardTitle>
              <CardDescription data-testid="text-understanding-description">
                {partnerName}'s message seems important
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="shrink-0"
            data-testid="button-dismiss-understanding"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground italic" data-testid="text-partner-message">
          "{originalMessage.length > 150 ? originalMessage.slice(0, 150) + "..." : originalMessage}"
        </div>
        
        <p className="text-sm text-muted-foreground">
          Taking a moment to reflect on what {partnerName} shared can help build understanding.
        </p>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onSkip}
            data-testid="button-reply-directly"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Reply directly
          </Button>
          
          <Button
            onClick={onReflect}
            data-testid="button-reflect-first"
          >
            <Heart className="h-4 w-4 mr-1" />
            Reflect first
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
