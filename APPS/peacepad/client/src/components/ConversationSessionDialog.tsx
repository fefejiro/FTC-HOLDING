
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PhoneOff, User, Volume2, VolumeX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { MoodRing } from "@/components/MoodRing";
import type { MoodEmotion } from "@/components/MoodRing";
import { motion, AnimatePresence } from "framer-motion";
import { StormEffect } from "./StormEffect";

interface ConversationSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sessionCode?: string;
  partnerName: string;
  partnerAvatar?: string;
  callType: "audio" | "video";
}

type TurnState = "my_turn" | "their_turn" | "transition";

export default function ConversationSessionDialog({
  isOpen,
  onClose,
  sessionCode,
  partnerName,
  partnerAvatar,
  callType,
}: ConversationSessionDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Turn management
  const [currentTurn, setCurrentTurn] = useState<TurnState>("my_turn");
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // AI Mood tracking
  const [myMood, setMyMood] = useState<MoodEmotion>("neutral");
  const [myMoodConfidence, setMyMoodConfidence] = useState(0);
  const [partnerMood, setPartnerMood] = useState<MoodEmotion>("neutral");
  const [partnerMoodConfidence, setPartnerMoodConfidence] = useState(0);
  
  // AI Mediator suggestions
  const [mediatorMessage, setMediatorMessage] = useState<string | null>(null);
  const [showMediatorPanel, setShowMediatorPanel] = useState(false);
  
  // Storm effect based on combined mood
  const [stormIntensity, setStormIntensity] = useState<'light' | 'medium' | 'heavy' | null>(null);
  
  // WebRTC and media refs
  const localAudioRef = useRef<HTMLAudioElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start call timer
  useEffect(() => {
    if (isOpen) {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [isOpen]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Pass the conch
  const passConch = () => {
    setCurrentTurn("transition");
    
    // Animate transition
    setTimeout(() => {
      setCurrentTurn("their_turn");
      toast({
        title: "Conch passed",
        description: `${partnerName} can now speak`,
        duration: 3000,
      });
    }, 1000);
  };

  // Receive conch
  const receiveConch = () => {
    setCurrentTurn("transition");
    
    setTimeout(() => {
      setCurrentTurn("my_turn");
      toast({
        title: "You have the conch",
        description: "Take your time to share your thoughts",
        duration: 3000,
      });
    }, 1000);
  };

  // Mock AI mediator suggestions (would connect to real AI in production)
  useEffect(() => {
    if (myMood === "frustrated" || myMood === "defensive" || myMood === "tense") {
      setMediatorMessage("I notice some tension. Would you like to take a breathing break?");
      setShowMediatorPanel(true);
    } else if (myMood === "calm" || myMood === "cooperative") {
      setMediatorMessage("Great emotional regulation. Keep up the constructive dialogue.");
      setShowMediatorPanel(true);
      
      // Auto-hide positive messages after 5s
      setTimeout(() => setShowMediatorPanel(false), 5000);
    }
  }, [myMood]);
  
  // Update storm intensity based on combined mood of both participants
  useEffect(() => {
    const moods = [myMood, partnerMood].filter(Boolean);
    const hasHostile = moods.some(m => m === 'frustrated' || m === 'defensive');
    const hasTense = moods.some(m => m === 'tense');
    
    if (hasHostile) {
      setStormIntensity('heavy');
    } else if (hasTense) {
      setStormIntensity('medium');
    } else if (moods.some(m => m !== 'calm' && m !== 'cooperative' && m !== 'neutral')) {
      setStormIntensity('light');
    } else {
      setStormIntensity(null);
    }
  }, [myMood, partnerMood]);

  const handleEndCall = () => {
    // Cleanup
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    onClose();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleEndCall}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
        {/* Storm Effect */}
        <StormEffect 
          intensity={stormIntensity || 'light'} 
          isActive={!!stormIntensity} 
        />
        {/* Header with timer */}
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">Guided Conversation</h3>
              <p className="text-xs text-muted-foreground">Mediated by AI</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono text-muted-foreground">
              {formatDuration(callDuration)}
            </span>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleEndCall}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              End
            </Button>
          </div>
        </div>

        {/* Main content area - Split screen participants */}
        <div className="flex-1 grid grid-cols-2 gap-0 relative overflow-hidden">
          {/* Left: Partner */}
          <motion.div 
            className={`relative flex flex-col items-center justify-center p-8 ${
              currentTurn === "their_turn" ? "bg-primary/10" : "bg-muted/30"
            }`}
            animate={{
              scale: currentTurn === "their_turn" ? 1.02 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            {/* Partner avatar */}
            <div className="relative mb-6">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                {partnerAvatar ? (
                  <AvatarImage src={partnerAvatar} alt={partnerName} />
                ) : (
                  <AvatarFallback>
                    <User className="h-16 w-16" />
                  </AvatarFallback>
                )}
              </Avatar>
              
              {/* Conch indicator */}
              <AnimatePresence>
                {currentTurn === "their_turn" && (
                  <motion.div
                    className="absolute -bottom-2 -right-2"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg">
                      <span className="text-3xl">🐚</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <h3 className="text-2xl font-semibold mb-2">{partnerName}</h3>
            
            {/* Partner mood */}
            <div className="mb-6">
              <MoodRing
                emotion={partnerMood}
                confidence={partnerMoodConfidence}
                isActive={true}
                showLabel={true}
              />
            </div>

            {/* Speaking status */}
            <motion.div
              className="text-center"
              animate={{
                opacity: currentTurn === "their_turn" ? 1 : 0.3,
              }}
            >
              {currentTurn === "their_turn" ? (
                <div className="flex items-center gap-2 text-primary">
                  <Volume2 className="h-5 w-5 animate-pulse" />
                  <span className="font-medium">Speaking...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <VolumeX className="h-5 w-5" />
                  <span className="text-sm">Listening</span>
                </div>
              )}
            </motion.div>
          </motion.div>

          {/* Divider */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 z-10" />

          {/* Right: You */}
          <motion.div 
            className={`relative flex flex-col items-center justify-center p-8 ${
              currentTurn === "my_turn" ? "bg-primary/10" : "bg-muted/30"
            }`}
            animate={{
              scale: currentTurn === "my_turn" ? 1.02 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            {/* Your avatar */}
            <div className="relative mb-6">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                {user?.profileImageUrl ? (
                  <AvatarImage src={user.profileImageUrl} alt="You" />
                ) : (
                  <AvatarFallback>
                    <User className="h-16 w-16" />
                  </AvatarFallback>
                )}
              </Avatar>
              
              {/* Conch indicator */}
              <AnimatePresence>
                {currentTurn === "my_turn" && (
                  <motion.div
                    className="absolute -bottom-2 -right-2"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 180 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <div className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg">
                      <span className="text-3xl">🐚</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <h3 className="text-2xl font-semibold mb-2">You</h3>
            
            {/* Your mood */}
            <div className="mb-6">
              <MoodRing
                emotion={myMood}
                confidence={myMoodConfidence}
                isActive={true}
                showLabel={true}
              />
            </div>

            {/* Speaking status */}
            <motion.div
              className="text-center"
              animate={{
                opacity: currentTurn === "my_turn" ? 1 : 0.3,
              }}
            >
              {currentTurn === "my_turn" ? (
                <div className="flex items-center gap-2 text-primary">
                  <Volume2 className="h-5 w-5 animate-pulse" />
                  <span className="font-medium">Your turn to speak</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <VolumeX className="h-5 w-5" />
                  <span className="text-sm">Listening actively</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom: Controls + AI Mediator */}
        <div className="border-t bg-card/80 backdrop-blur">
          {/* AI Mediator Panel */}
          <AnimatePresence>
            {showMediatorPanel && mediatorMessage && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-b overflow-hidden"
              >
                <div className="p-4 bg-primary/5">
                  <div className="flex items-start gap-3">
                    <div className="bg-primary text-primary-foreground rounded-full p-2 shrink-0">
                      <span className="text-xl">🤖</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-primary mb-1">AI Mediator</p>
                      <p className="text-sm">{mediatorMessage}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowMediatorPanel(false)}
                      className="shrink-0"
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="p-6">
            <div className="max-w-2xl mx-auto flex items-center justify-center gap-6">
              {/* Mute button */}
              <Button
                size="icon"
                variant={isMuted ? "destructive" : "secondary"}
                onClick={toggleMute}
                className="h-14 w-14 rounded-full"
              >
                {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
              </Button>

              {/* Pass the Conch button - only shows when it's your turn */}
              <AnimatePresence>
                {currentTurn === "my_turn" && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <Button
                      size="lg"
                      onClick={passConch}
                      className="gap-3 h-16 px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                    >
                      <span className="text-3xl">🐚</span>
                      <div className="flex flex-col items-start">
                        <span className="text-lg font-semibold">Pass the Conch</span>
                        <span className="text-xs opacity-80">Give {partnerName} a turn</span>
                      </div>
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Waiting message */}
              {currentTurn === "their_turn" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center"
                >
                  <p className="text-sm text-muted-foreground mb-2">
                    Listening to {partnerName}...
                  </p>
                  <p className="text-xs text-muted-foreground">
                    They will pass the conch when ready
                  </p>
                </motion.div>
              )}

              {/* Transition animation */}
              {currentTurn === "transition" && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1, rotate: 360 }}
                  className="text-6xl"
                >
                  🐚
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
