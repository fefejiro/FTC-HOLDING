import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lightbulb, FileText, Download, Check, CheckCheck, Reply } from "lucide-react";
import TonePill, { type ToneType } from "./TonePill";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "./AudioPlayer";
import { VoiceNoteMessage } from "./VoiceNoteMessage";
import { SharedItemCard } from "./SharedItemCard";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ReplyToMessage {
  id: string;
  content: string;
  senderName: string;
}

interface MessageBubbleProps {
  content: string;
  sender: "me" | "coparent";
  timestamp: string;
  senderName: string;
  senderAvatar?: string;
  tone?: ToneType;
  toneSummary?: string;
  toneEmoji?: string;
  rewordingSuggestion?: string;
  messageType?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  duration?: string;
  transcript?: string;
  sharedItemType?: "event" | "expense" | "task";
  isDeleted?: boolean;
  status?: "sent" | "delivered" | "read";
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt?: string;
  replyToMessage?: ReplyToMessage | null;
  onReply?: () => void;
}

export default function MessageBubble({
  content,
  sender,
  timestamp,
  senderName,
  senderAvatar,
  tone,
  toneSummary,
  toneEmoji,
  rewordingSuggestion,
  messageType = "text",
  fileUrl,
  fileName,
  mimeType,
  duration,
  transcript,
  sharedItemType,
  isDeleted,
  status = "sent",
  deliveredAt,
  readAt,
  createdAt,
  replyToMessage,
  onReply,
}: MessageBubbleProps) {
  const isMe = sender === "me";
  
  const formatDetailedTime = (dateString?: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };
  
  const StatusIndicator = () => {
    if (!isMe) return null;
    
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button 
            className="inline-flex items-center gap-0.5 ml-1 cursor-pointer hover:opacity-70 transition-opacity"
            data-testid="button-message-status"
          >
            {status === "read" ? (
              <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
            ) : status === "delivered" ? (
              <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3" align="end">
          <div className="space-y-2 text-xs">
            <div className="font-medium text-foreground mb-2">Message Status</div>
            <div className="flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Sent:</span>
              <span className="text-foreground ml-auto">{formatDetailedTime(createdAt) || timestamp}</span>
            </div>
            {(status === "delivered" || status === "read") && (
              <div className="flex items-center gap-2">
                <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Delivered:</span>
                <span className="text-foreground ml-auto">{formatDetailedTime(deliveredAt) || "---"}</span>
              </div>
            )}
            {status === "read" && (
              <div className="flex items-center gap-2">
                <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-muted-foreground">Read:</span>
                <span className="text-foreground ml-auto">{formatDetailedTime(readAt) || "---"}</span>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const renderMessageContent = () => {
    switch (messageType) {
      case "image":
        return (
          <div className="space-y-2">
            {fileUrl && (
              <img
                src={fileUrl}
                alt={fileName || "Image"}
                className="max-w-full max-h-96 rounded-lg object-cover"
                data-testid="message-image"
              />
            )}
            {content && <p className="text-sm">{content}</p>}
          </div>
        );
      
      case "audio":
        // Voice notes with transcripts use VoiceNoteMessage component
        if (transcript && fileUrl) {
          return (
            <VoiceNoteMessage 
              audioUrl={fileUrl}
              duration={duration}
              transcript={transcript}
              isSender={isMe}
            />
          );
        }
        // Legacy audio messages without transcript use simple player
        return (
          <div className="space-y-2 min-w-[280px]">
            {fileUrl && (
              <AudioPlayer audioUrl={fileUrl} />
            )}
            {content && <p className="text-sm mt-2">{content}</p>}
          </div>
        );
      
      case "video":
        return (
          <div className="space-y-2">
            {fileUrl && (
              <video controls className="max-w-full max-h-96 rounded-lg" data-testid="message-video">
                <source src={fileUrl} type={mimeType || "video/webm"} />
                Your browser does not support video playback.
              </video>
            )}
            {content && <p className="text-sm">{content}</p>}
          </div>
        );
      
      case "document":
        return (
          <div className="flex items-center gap-3 p-2">
            <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fileName || content}</p>
              <p className="text-xs text-muted-foreground">{mimeType}</p>
            </div>
            {fileUrl && (
              <Button
                size="sm"
                variant="ghost"
                asChild
                data-testid="button-download-file"
              >
                <a href={fileUrl} download={fileName} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        );
      
      case "shared":
        return (
          <SharedItemCard
            itemType={sharedItemType || "event"}
            content={content}
            isDeleted={isDeleted}
            isSender={isMe}
          />
        );
      
      default:
        return <p className="text-base leading-relaxed">{content}</p>;
    }
  };

  const isEmoji = senderAvatar?.startsWith("emoji:");
  const emojiValue = isEmoji && senderAvatar ? senderAvatar.replace("emoji:", "") : "";

  return (
    <div className={`flex gap-2 sm:gap-3 animate-slide-up mb-1 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      <Avatar className="h-7 w-7 flex-shrink-0 border border-background shadow-sm">
        {isEmoji ? (
          <div className="flex items-center justify-center text-sm">{emojiValue}</div>
        ) : senderAvatar ? (
          <AvatarImage src={senderAvatar} alt={senderName} />
        ) : (
          <AvatarFallback className={`font-medium text-xs ${isMe ? "bg-purple-200 text-purple-700" : "bg-purple-400 text-white"}`}>{senderName.slice(0, 2).toUpperCase()}</AvatarFallback>
        )}
      </Avatar>

      <div className={`flex flex-col max-w-[75%] sm:max-w-[65%] ${isMe ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-1.5 mb-1 px-1">
          <span className="text-xs font-semibold text-foreground">
            {senderName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {timestamp}
          </span>
          <StatusIndicator />
        </div>

        <div className="relative group">
          <div
            className={`rounded-2xl shadow-md hover:shadow-lg transition-shadow ${messageType === "text" ? "px-3 py-2.5" : "p-2 overflow-hidden"} ${
              isMe
                ? "bg-white dark:bg-slate-800 text-foreground rounded-tr-none border border-slate-200/70 dark:border-slate-700/70"
                : "bg-purple-500 dark:bg-purple-600 text-white rounded-tl-none font-medium"
            }`}
            data-testid={`message-${sender}`}
          >
            {replyToMessage && (
              <div
                className={`mb-2 p-2 rounded-md border-l-2 ${
                  isMe
                    ? "bg-slate-100 dark:bg-slate-700 border-primary"
                    : "bg-purple-400 dark:bg-purple-500 border-purple-200"
                }`}
                data-testid="quoted-message"
              >
                <p className={`text-xs font-medium ${isMe ? "text-primary" : "text-purple-100"}`}>
                  {replyToMessage.senderName}
                </p>
                <p className={`text-xs ${isMe ? "text-muted-foreground" : "text-purple-100"} line-clamp-2`}>
                  {replyToMessage.content}
                </p>
              </div>
            )}
            {renderMessageContent()}
          </div>
          
          {onReply && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
              onClick={onReply}
              data-testid="button-reply"
            >
              <Reply className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {tone && !["neutral", "calm", "cooperative"].includes(tone) && (
          <div className={`flex items-center gap-1.5 mt-2 px-0.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
            <div className="flex-1 min-w-0">
              <TonePill tone={tone} summary={toneSummary || ""} />
            </div>
          </div>
        )}

        {rewordingSuggestion && (
          <Alert className="mt-2 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/30 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/40 rounded-lg shadow-sm animate-scale-in max-w-full transition-shadow" data-testid="rewording-suggestion">
            <Lightbulb className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <AlertDescription className="text-xs text-foreground leading-relaxed ml-1">
              <span className="font-semibold text-blue-600 dark:text-blue-400">AI Suggestion: </span>
              <span className="text-muted-foreground italic ml-1">{rewordingSuggestion}</span>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
