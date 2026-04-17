import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, X, Trophy, RotateCcw, Flame, Zap, Clock } from 'lucide-react';

interface SlangTerm {
  term: string;
  meaning: string;
  language: string;
}

interface SlangMatchGameProps {
  slangTerms: SlangTerm[];
  onClose?: () => void;
  onRestart?: () => void;
}

const ROUND_TIME = 20; // seconds per round
const POINTS_CORRECT = 100;
const POINTS_STREAK_BONUS = 50;
const POINTS_WRONG = -30;
const POINTS_TIMEOUT = -20;

function getRank(score: number, total: number): { label: string; emoji: string } {
  const pct = total > 0 ? score / (total * POINTS_CORRECT) : 0;
  if (pct >= 0.95) return { label: 'Naija Professor', emoji: '🎓' };
  if (pct >= 0.75) return { label: 'Street Scholar', emoji: '🔥' };
  if (pct >= 0.5)  return { label: 'Sharp Sharp', emoji: '⚡' };
  if (pct >= 0.25) return { label: 'Learner', emoji: '📖' };
  return { label: 'Just Dey Try', emoji: '😅' };
}

export function SlangMatchGame({ slangTerms, onClose, onRestart }: SlangMatchGameProps) {
  const uniqueTerms = useMemo(() => {
    const seen = new Set<string>();
    return slangTerms
      .filter(t => {
        const key = t.term.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [slangTerms]);

  // One term shown at a time — pick from 4 shuffled meanings
  const [queueOrder, setQueueOrder] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [choices, setChoices] = useState<SlangTerm[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [gameOver, setGameOver] = useState(false);
  const [results, setResults] = useState<Array<{ term: string; correct: boolean }>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialise queue once
  useEffect(() => {
    if (uniqueTerms.length < 2) return;
    const order = [...Array(uniqueTerms.length).keys()].sort(() => Math.random() - 0.5);
    setQueueOrder(order);
  }, [uniqueTerms]);

  // Build choices whenever currentIdx or queueOrder changes
  useEffect(() => {
    if (!queueOrder.length || currentIdx >= queueOrder.length) return;
    const correctTerm = uniqueTerms[queueOrder[currentIdx]];
    const distractors = uniqueTerms
      .filter((_, i) => i !== queueOrder[currentIdx])
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    setChoices([...distractors, correctTerm].sort(() => Math.random() - 0.5));
    setSelected(null);
    setFeedback(null);
    setTimeLeft(ROUND_TIME);
  }, [currentIdx, queueOrder, uniqueTerms]);

  // Timer
  useEffect(() => {
    if (gameOver || feedback !== null || !queueOrder.length) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [currentIdx, gameOver, feedback, queueOrder]);

  const handleTimeout = () => {
    const correctTerm = uniqueTerms[queueOrder[currentIdx]];
    setSelected('__timeout__');
    setFeedback('wrong');
    setScore(s => Math.max(0, s + POINTS_TIMEOUT));
    setStreak(0);
    setLives(l => {
      const next = l - 1;
      if (next <= 0) {
        setTimeout(() => endGame(), 900);
      } else {
        setTimeout(() => advance(), 900);
      }
      return next;
    });
    setResults(r => [...r, { term: correctTerm.term, correct: false }]);
  };

  const handleChoice = (meaning: string) => {
    if (feedback || gameOver) return;
    clearInterval(timerRef.current!);

    const correctTerm = uniqueTerms[queueOrder[currentIdx]];
    const isCorrect = meaning === correctTerm.meaning;
    setSelected(meaning);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setResults(r => [...r, { term: correctTerm.term, correct: isCorrect }]);

    if (isCorrect) {
      const newStreak = streak + 1;
      const bonus = newStreak >= 3 ? POINTS_STREAK_BONUS : 0;
      setScore(s => s + POINTS_CORRECT + bonus);
      setStreak(newStreak);
      setMaxStreak(m => Math.max(m, newStreak));
      setTimeout(() => advance(), 700);
    } else {
      setScore(s => Math.max(0, s + POINTS_WRONG));
      setStreak(0);
      const nextLives = lives - 1;
      setLives(nextLives);
      if (nextLives <= 0) {
        setTimeout(() => endGame(), 900);
      } else {
        setTimeout(() => advance(), 900);
      }
    }
  };

  const advance = () => {
    const next = currentIdx + 1;
    if (next >= queueOrder.length) {
      endGame();
    } else {
      setCurrentIdx(next);
    }
  };

  const endGame = () => {
    clearInterval(timerRef.current!);
    setGameOver(true);
  };

  const resetGame = () => {
    const order = [...Array(uniqueTerms.length).keys()].sort(() => Math.random() - 0.5);
    setQueueOrder(order);
    setCurrentIdx(0);
    setSelected(null);
    setFeedback(null);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setLives(3);
    setTimeLeft(ROUND_TIME);
    setGameOver(false);
    setResults([]);
  };

  if (uniqueTerms.length < 2) return null;

  const currentTerm = queueOrder.length ? uniqueTerms[queueOrder[currentIdx]] : null;
  const correctCount = results.filter(r => r.correct).length;
  const rank = getRank(score, uniqueTerms.length);
  const timerPct = (timeLeft / ROUND_TIME) * 100;
  const timerColor = timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-orange-500' : 'bg-primary';

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background overflow-hidden" data-testid="card-slang-game">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gamepad2 className="h-5 w-5 text-primary" />
            Match the Slang
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Score */}
            <span className="text-sm font-bold text-primary tabular-nums">{score} pts</span>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-game">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Status bar: lives + streak + progress */}
        {!gameOver && (
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className={`text-base ${i < lives ? 'opacity-100' : 'opacity-20'}`}>❤️</span>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {streak >= 2 && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1 text-orange-500"
                >
                  <Flame className="h-4 w-4" />
                  <span className="text-xs font-bold">{streak}x</span>
                </motion.div>
              )}
              <span className="text-xs text-muted-foreground">
                {currentIdx + 1}/{queueOrder.length}
              </span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          {gameOver ? (
            <motion.div
              key="game-over"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-4 space-y-4"
            >
              <div className="text-5xl">{rank.emoji}</div>
              <div>
                <p className="text-2xl font-bold">{score} pts</p>
                <p className="text-lg font-semibold text-primary mt-1">{rank.label}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {correctCount}/{uniqueTerms.length} correct
                  {maxStreak >= 3 && <span className="ml-2 text-orange-500">· 🔥 {maxStreak}x streak</span>}
                </p>
              </div>

              {/* Per-term results */}
              <div className="text-left space-y-1 mt-2">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={r.correct ? 'text-green-500' : 'text-red-400'}>
                      {r.correct ? '✓' : '✗'}
                    </span>
                    <span className={r.correct ? 'text-foreground' : 'text-muted-foreground line-through'}>
                      {r.term}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-center pt-2">
                <Button variant="outline" onClick={onRestart ?? resetGame} data-testid="button-play-again">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                {onClose && (
                  <Button onClick={onClose} data-testid="button-done">
                    Done
                  </Button>
                )}
              </div>
            </motion.div>
          ) : currentTerm ? (
            <motion.div
              key={`round-${currentIdx}`}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* Timer bar */}
              <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`absolute left-0 top-0 h-full rounded-full transition-colors ${timerColor}`}
                  style={{ width: `${timerPct}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* The term to match */}
              <div className="text-center py-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">What does this mean?</p>
                <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary/10 border border-primary/20">
                  <span className="text-2xl font-bold text-foreground">{currentTerm.term}</span>
                  <Badge variant="outline" className="text-xs shrink-0">{currentTerm.language}</Badge>
                </div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className={`text-xs font-mono font-bold ${timeLeft <= 5 ? 'text-red-500' : 'text-muted-foreground'}`}>
                    {timeLeft}s
                  </span>
                </div>
              </div>

              {/* 4 choices */}
              <div className="grid grid-cols-1 gap-2">
                {choices.map((choice, i) => {
                  const isCorrect = choice.meaning === currentTerm.meaning;
                  const isSelected = selected === choice.meaning;
                  const isTimeout = selected === '__timeout__';

                  let state: 'default' | 'correct' | 'wrong' | 'reveal' = 'default';
                  if (feedback) {
                    if (isCorrect) state = 'reveal';
                    else if (isSelected && !isCorrect) state = 'wrong';
                  } else if (isSelected) {
                    state = 'correct';
                  }

                  return (
                    <motion.button
                      key={choice.meaning}
                      onClick={() => handleChoice(choice.meaning)}
                      disabled={!!feedback}
                      whileTap={!feedback ? { scale: 0.97 } : {}}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium border transition-all ${
                        state === 'correct' || state === 'reveal'
                          ? 'bg-green-500/20 border-green-500/60 text-green-700 dark:text-green-400'
                          : state === 'wrong'
                          ? 'bg-red-500/20 border-red-500/60 text-red-700 dark:text-red-400'
                          : 'bg-muted/60 border-border hover:bg-muted hover:border-primary/30 active:scale-[0.98]'
                      }`}
                      data-testid={`choice-${i}`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span>{choice.meaning}</span>
                        {state === 'correct' || state === 'reveal' ? <span>✓</span> : null}
                        {state === 'wrong' ? <span>✗</span> : null}
                      </span>
                    </motion.button>
                  );
                })}
              </div>

              {/* Streak celebration */}
              <AnimatePresence>
                {feedback === 'correct' && streak >= 3 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-sm font-bold text-orange-500 flex items-center justify-center gap-1"
                  >
                    <Zap className="h-4 w-4" />
                    {streak}x Streak! +{POINTS_STREAK_BONUS} bonus
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
