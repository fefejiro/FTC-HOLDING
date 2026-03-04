import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Copy,
  RefreshCw,
  Check,
  Pencil,
  ArrowUp,
  RotateCcw,
  Send
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import CalmBreathModal from "@/components/CalmBreathModal";
import { PracticeVoiceRecorder } from "@/components/PracticeVoiceRecorder";

interface AnalysisResult {
  overallTone: string;
  toneScore: number;
  potentialTriggers: string[];
  howItMightBePerceived: string;
  suggestedRevision?: string;
  strengthsIdentified: string[];
}

const PERSONALITY_TYPES = [
  { value: 'INTJ', label: 'The Strategist' },
  { value: 'INTP', label: 'The Thinker' },
  { value: 'ENTJ', label: 'The Commander' },
  { value: 'ENTP', label: 'The Debater' },
  { value: 'INFJ', label: 'The Advocate' },
  { value: 'INFP', label: 'The Mediator' },
  { value: 'ENFJ', label: 'The Teacher' },
  { value: 'ENFP', label: 'The Enthusiast' },
  { value: 'ISTJ', label: 'The Inspector' },
  { value: 'ISFJ', label: 'The Protector' },
  { value: 'ESTJ', label: 'The Executive' },
  { value: 'ESFJ', label: 'The Caregiver' },
  { value: 'ISTP', label: 'The Craftsman' },
  { value: 'ISFP', label: 'The Artist' },
  { value: 'ESTP', label: 'The Dynamo' },
  { value: 'ESFP', label: 'The Performer' },
];

export default function PrepChatPage() {
  const [message, setMessage] = useState("");
  const [originalMessage, setOriginalMessage] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [editedResult, setEditedResult] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [showBreathModal, setShowBreathModal] = useState(false);

  // Persistent style settings via localStorage
  const [coParentPersonality, setCoParentPersonality] = useState<string>(() => {
    return localStorage.getItem('peacepad_coparent_style') || "";
  });
  const [userPersonality, setUserPersonality] = useState<string>(() => {
    return localStorage.getItem('peacepad_user_style') || "";
  });

  // Persist style settings when changed
  useEffect(() => {
    if (userPersonality) {
      localStorage.setItem('peacepad_user_style', userPersonality);
    }
  }, [userPersonality]);

  useEffect(() => {
    if (coParentPersonality) {
      localStorage.setItem('peacepad_coparent_style', coParentPersonality);
    }
  }, [coParentPersonality]);

  const handleBreathContinue = () => {
    setShowBreathModal(false);
  };

  const { data: partnerships = [] } = useQuery<any[]>({
    queryKey: ['/api/partnerships'],
    staleTime: 30000,
  });
  const hasPartnership = partnerships.length > 0;

  const analyzeMutation = useMutation({
    mutationFn: async (draft: string) => {
      const res = await apiRequest('POST', '/api/prep-chat/analyze-draft', { 
        draft,
        coParentPersonality: coParentPersonality || undefined,
        userPersonality: userPersonality || undefined,
      });
      return res.json();
    },
    onSuccess: (data, draft) => {
      const safeRevision =
        typeof data?.suggestedRevision === "string" && data.suggestedRevision.trim().length > 0
          ? data.suggestedRevision.trim()
          : (draft || "").trim();

      setResult({ ...data, suggestedRevision: safeRevision });
      setEditedResult(safeRevision);
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    if (message.trim()) {
      setOriginalMessage(message.trim());
      analyzeMutation.mutate(message.trim());
    }
  };

  // Copy puts suggestion INTO the input field (ready to send)
  const handleCopy = () => {
    const textToCopy = isEditing ? editedResult : (result?.suggestedRevision || originalMessage || message);
    setMessage(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied to input",
      description: "Suggestion is now in your input field",
    });
    // Also copy to clipboard as a convenience
    navigator.clipboard.writeText(textToCopy);
  };

  // Redo requests a new alternative suggestion
  const handleRedo = () => {
    if (originalMessage) {
      analyzeMutation.mutate(originalMessage);
    }
  };

  // Reset clears suggestion but preserves originalMessage for future Redo
  const handleReset = () => {
    setResult(null);
    setEditedResult("");
    setIsEditing(false);
    // Only restore original if we have one, otherwise keep current input
    if (originalMessage) {
      setMessage(originalMessage);
    }
    // Keep originalMessage intact so Redo can still work
  };

  const handleSendToChat = () => {
    const messageToSend = isEditing ? editedResult : (result?.suggestedRevision || originalMessage || message);
    localStorage.setItem('preparedMessage', messageToSend);
    
    if (hasPartnership) {
      toast({
        title: "Opening Chat",
        description: "Your message is ready to send",
      });
      navigate('/chat');
    } else {
      toast({
        title: "Message Saved",
        description: "Connect with someone to send this message",
      });
      navigate('/chat');
    }
  };

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  // Auto-expand edit textarea
  useEffect(() => {
    if (editTextareaRef.current && isEditing) {
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = `${Math.min(editTextareaRef.current.scrollHeight, 200)}px`;
    }
  }, [editedResult, isEditing]);

  return (
    <>
      <CalmBreathModal isOpen={showBreathModal} onContinue={handleBreathContinue} />
      
      <div className="flex flex-col flex-1 min-h-0 bg-background">
        {/* TOP: Suggested Response Display Area (read-only) */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4">
          <div className="max-w-2xl mx-auto w-full">
            {!result ? (
              <div className="flex flex-col items-center pt-16 animate-in fade-in duration-700">
                <img 
                  src="/icon-512.png" 
                  alt="PeacePad" 
                  className="h-16 w-16 mb-4 opacity-70"
                  data-testid="img-peacepad-logo"
                />
                <h1 className="text-xl font-bold text-foreground mb-2 text-center">Before you send that message</h1>
                <p className="text-muted-foreground text-center text-sm max-w-xs">
                  Type or speak what you want to say. I'll help you find the right words.
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="text-center mb-6">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Here's a calmer way to say it</p>
                </div>
                
                {isEditing ? (
                  <div className="relative">
                    <Textarea
                      ref={editTextareaRef}
                      value={editedResult}
                      onChange={(e) => setEditedResult(e.target.value)}
                      className="text-lg leading-relaxed rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/30 p-4 bg-blue-50/40 dark:bg-blue-950/20"
                      data-testid="input-edit-suggestion"
                    />
                  </div>
                ) : (
                  <div className="p-6 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/40 dark:border-blue-800/30 rounded-2xl">
                    <p className="text-lg leading-relaxed whitespace-pre-wrap text-foreground" data-testid="text-suggested-message">
                      {result.suggestedRevision || originalMessage || message}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM: Action Buttons + Style Settings + Input (close together for easy access) */}
        <div className="border-t bg-background px-4 py-3 safe-area-bottom">
          <div className="max-w-2xl mx-auto w-full space-y-3">
            
            {/* Action Buttons - ONLY shown when there's a result, positioned close to input */}
            {result && (
              <div className="grid grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl"
                  data-testid="button-copy"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  <span className="text-xs">{copied ? "Done" : "Copy"}</span>
                </Button>
                
                <Button
                  variant={isEditing ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl"
                  data-testid="button-edit"
                >
                  <Pencil className="h-4 w-4" />
                  <span className="text-xs">{isEditing ? "Done" : "Edit"}</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRedo}
                  disabled={analyzeMutation.isPending}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl"
                  data-testid="button-redo"
                >
                  {analyzeMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="text-xs">Redo</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="flex flex-col items-center gap-1 py-2 rounded-xl"
                  data-testid="button-reset"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span className="text-xs">Reset</span>
                </Button>
              </div>
            )}

            {/* Send to Chat - only when there's a result */}
            {result && (
              <Button
                onClick={handleSendToChat}
                className="w-full rounded-xl"
                variant="default"
                data-testid="button-send-to-chat"
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Chat
              </Button>
            )}

            {/* Persistent Style Settings - Always Visible */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Your personality</Label>
                <Select value={userPersonality} onValueChange={setUserPersonality}>
                  <SelectTrigger data-testid="select-user-personality" className="text-xs rounded-lg bg-background">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSONALITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.value} - {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Their personality</Label>
                <Select value={coParentPersonality} onValueChange={setCoParentPersonality}>
                  <SelectTrigger data-testid="select-coparent-personality" className="text-xs rounded-lg bg-background">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSONALITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.value} - {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Input Field */}
            <div className="bg-background border-2 border-primary/20 rounded-2xl p-2 flex items-center gap-2 transition-colors">
              <div className="flex-1 relative flex items-center min-w-0 pl-2">
                <Textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="What do you want to say?"
                  className="w-full text-base resize-none border-0 bg-transparent p-2 leading-relaxed placeholder:text-muted-foreground/50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  data-testid="input-message"
                />
                <div className="absolute right-0 bottom-1">
                  <PracticeVoiceRecorder 
                    onRecordingStart={() => {
                      setMessage("");
                      setResult(null);
                    }}
                    onTranscription={(text) => {
                      if (text) {
                        setMessage(text);
                      }
                    }}
                    disabled={analyzeMutation.isPending}
                  />
                </div>
              </div>

              <Button
                size="icon"
                onClick={handleSend}
                disabled={!message.trim() || analyzeMutation.isPending}
                className="rounded-full shrink-0"
                variant={message.trim() ? "default" : "ghost"}
                data-testid="button-send"
              >
                {analyzeMutation.isPending ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <ArrowUp className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
