import { useState } from "react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function MBTIExplainer() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardContent className="p-4 space-y-3">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between p-0 h-auto font-normal hover:bg-transparent"
          data-testid="button-mbti-explainer-toggle"
        >
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium">What is Myers-Briggs?</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </Button>

        {isExpanded && (
          <div className="space-y-3 text-sm text-muted-foreground animate-in slide-in-from-top-2">
            <p>
              Myers-Briggs (MBTI) is a personality framework that describes how you naturally communicate and process information.
            </p>
            
            <div className="space-y-2">
              <p className="font-medium text-foreground">The 4 dimensions:</p>
              <div className="grid grid-cols-1 gap-2 pl-2">
                <div>
                  <span className="font-medium text-foreground">I vs E:</span> Introvert (recharge alone) or Extrovert (recharge with others)
                </div>
                <div>
                  <span className="font-medium text-foreground">S vs N:</span> Sensing (focus on facts) or iNtuition (focus on patterns)
                </div>
                <div>
                  <span className="font-medium text-foreground">T vs F:</span> Thinking (logic-based) or Feeling (values-based)
                </div>
                <div>
                  <span className="font-medium text-foreground">J vs P:</span> Judging (organized) or Perceiving (flexible)
                </div>
              </div>
            </div>

            <div className="bg-background rounded-lg p-3 space-y-2">
              <p className="font-medium text-foreground">Why it helps PeacePad:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>AI understands your natural communication style</li>
                <li>Get personalized suggestions that match how you think</li>
                <li>Better conflict resolution strategies tailored to you</li>
              </ul>
            </div>

            <p className="text-xs italic">
              Don't know your type? You can skip this or take a free test at{" "}
              <a 
                href="https://www.16personalities.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
                data-testid="link-mbti-test"
              >
                16personalities.com
              </a>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
