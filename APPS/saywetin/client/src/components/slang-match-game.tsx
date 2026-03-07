import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, CheckCircle2, X, Trophy, RotateCcw, Sparkles } from 'lucide-react';

interface SlangTerm {
  term: string;
  meaning: string;
  language: string;
}

interface SlangMatchGameProps {
  slangTerms: SlangTerm[];
  onClose?: () => void;
}

export function SlangMatchGame({ slangTerms, onClose }: SlangMatchGameProps) {
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [selectedMeaning, setSelectedMeaning] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [wrongPair, setWrongPair] = useState<{ term: string; meaning: string } | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);

  const uniqueTerms = useMemo(() => {
    const seen = new Set<string>();
    return slangTerms.filter(t => {
      const key = t.term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 6);
  }, [slangTerms]);

  const shuffledMeanings = useMemo(() => {
    return [...uniqueTerms].sort(() => Math.random() - 0.5);
  }, [uniqueTerms]);

  useEffect(() => {
    if (selectedTerm && selectedMeaning) {
      const term = uniqueTerms.find(t => t.term === selectedTerm);
      if (term && term.meaning === selectedMeaning) {
        setMatchedPairs(prev => new Set(prev).add(selectedTerm));
        setScore(prev => prev + 1);
      } else {
        setWrongPair({ term: selectedTerm, meaning: selectedMeaning });
        setTimeout(() => setWrongPair(null), 600);
      }
      setAttempts(prev => prev + 1);
      setTimeout(() => {
        setSelectedTerm(null);
        setSelectedMeaning(null);
      }, 300);
    }
  }, [selectedTerm, selectedMeaning, uniqueTerms]);

  const isComplete = matchedPairs.size === uniqueTerms.length;
  const accuracy = attempts > 0 ? Math.round((score / attempts) * 100) : 0;

  const resetGame = () => {
    setSelectedTerm(null);
    setSelectedMeaning(null);
    setMatchedPairs(new Set());
    setWrongPair(null);
    setScore(0);
    setAttempts(0);
  };

  if (uniqueTerms.length < 2) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="card-slang-game">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gamepad2 className="h-5 w-5 text-primary" />
            Match the Slang
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-game">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Connect each slang term with its meaning
        </p>
      </CardHeader>
      <CardContent>
        {isComplete ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-primary">You Dey Learn!</h3>
              <p className="text-muted-foreground mt-1">
                {score}/{uniqueTerms.length} correct • {accuracy}% accuracy
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={resetGame} data-testid="button-play-again">
                <RotateCcw className="h-4 w-4 mr-2" />
                Play Again
              </Button>
              {onClose && (
                <Button onClick={onClose} data-testid="button-done">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Done
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{matchedPairs.size}/{uniqueTerms.length} matched</span>
              <span>{accuracy}% accuracy</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Slang Terms</p>
                {uniqueTerms.map((item) => {
                  const isMatched = matchedPairs.has(item.term);
                  const isSelected = selectedTerm === item.term;
                  const isWrong = wrongPair?.term === item.term;
                  
                  return (
                    <button
                      key={item.term}
                      onClick={() => !isMatched && setSelectedTerm(item.term)}
                      disabled={isMatched}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        isMatched 
                          ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30' 
                          : isWrong
                          ? 'bg-red-500/20 border border-red-500/50 animate-shake'
                          : isSelected 
                          ? 'bg-primary/20 border-2 border-primary' 
                          : 'bg-muted hover-elevate border border-transparent'
                      }`}
                      data-testid={`slang-term-${item.term}`}
                    >
                      <span className="font-medium">{item.term}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{item.language}</Badge>
                      {isMatched && <CheckCircle2 className="h-4 w-4 inline ml-2 text-green-500" />}
                    </button>
                  );
                })}
              </div>
              
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Meanings</p>
                {shuffledMeanings.map((item) => {
                  const isMatched = matchedPairs.has(item.term);
                  const isSelected = selectedMeaning === item.meaning;
                  const isWrong = wrongPair?.meaning === item.meaning;
                  
                  return (
                    <button
                      key={item.meaning}
                      onClick={() => !isMatched && setSelectedMeaning(item.meaning)}
                      disabled={isMatched}
                      className={`w-full p-3 rounded-lg text-left transition-all text-sm ${
                        isMatched 
                          ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30' 
                          : isWrong
                          ? 'bg-red-500/20 border border-red-500/50 animate-shake'
                          : isSelected 
                          ? 'bg-primary/20 border-2 border-primary' 
                          : 'bg-muted hover-elevate border border-transparent'
                      }`}
                      data-testid={`slang-meaning-${item.term}`}
                    >
                      {item.meaning}
                      {isMatched && <CheckCircle2 className="h-4 w-4 inline ml-2 text-green-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-4px); }
            75% { transform: translateX(4px); }
          }
          .animate-shake {
            animation: shake 0.3s ease-in-out;
          }
        `}</style>
      </CardContent>
    </Card>
  );
}
