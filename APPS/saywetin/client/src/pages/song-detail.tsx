import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Music2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LicenseBadge } from "@/components/license-badge";
import { LyricLineCard } from "@/components/lyric-line-card";
import { UserLyricInput } from "@/components/user-lyric-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Song, LyricLine } from "@shared/schema";
import { ThemeToggle } from "@/components/theme-toggle";
import { ExportButton } from "@/components/export-button";

export default function SongDetail() {
  const [, params] = useRoute("/song/:id");
  const songId = params?.id;
  const { toast } = useToast();
  const [generatingLineId, setGeneratingLineId] = useState<string | null>(null);

  const { data: song, isLoading: songLoading } = useQuery<Song>({
    queryKey: ["/api/songs", songId],
    enabled: !!songId,
  });

  const { data: lyricLines = [], isLoading: lyricsLoading } = useQuery<
    LyricLine[]
  >({
    queryKey: ["/api/lyrics", songId],
    enabled: !!songId && song?.lyricsStorageAllowed,
  });

  const generateMeaningMutation = useMutation({
    mutationFn: async (lyricLineId: string) => {
      const response = await apiRequest(
        "POST",
        "/api/lyrics/generate-meaning",
        {
          lyricLineId,
          language: song?.language,
        }
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lyrics", songId] });
      setGeneratingLineId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate translation. Please try again.",
        variant: "destructive",
      });
      setGeneratingLineId(null);
    },
  });

  const voteMutation = useMutation({
    mutationFn: async ({
      lyricLineId,
      voteType,
    }: {
      lyricLineId: string;
      voteType: "upvote" | "downvote";
    }) => {
      return await apiRequest("POST", "/api/lyrics/vote", {
        lyricLineId,
        voteType,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lyrics", songId] });
    },
  });

  const generateUserLyricMutation = useMutation({
    mutationFn: async (lyricText: string) => {
      const response = await apiRequest(
        "POST",
        "/api/lyrics/generate-user-meaning",
        {
          lyricText,
          language: song?.language,
          languageName: song?.languageName,
          songId: song?.id,
        }
      );
      return response as { translation: string; culturalMeaning: string };
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate translation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateMeaning = (lineId: string) => {
    setGeneratingLineId(lineId);
    generateMeaningMutation.mutate(lineId);
  };

  const handleVote = (lineId: string, voteType: "upvote" | "downvote") => {
    voteMutation.mutate({ lyricLineId: lineId, voteType });
  };

  const handleGenerateUserLyric = async (lyricText: string) => {
    return await generateUserLyricMutation.mutateAsync(lyricText);
  };

  if (songLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <Skeleton className="h-10 w-32 mb-8" />
          <div className="grid md:grid-cols-[auto_1fr] gap-8">
            <Skeleton className="w-64 h-64 rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Song not found</h2>
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/10 via-amber-500/5 to-background dark:from-orange-500/20 dark:via-amber-900/10 dark:to-background" />
        <div className="absolute top-0 left-0 w-64 h-64 rounded-full bg-orange-500/5 dark:bg-orange-500/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />

        <div className="relative container mx-auto px-6 pt-8 pb-6 sm:pt-12 sm:pb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden shadow-xl shadow-orange-500/20 shrink-0">
              {song.coverArtUrl ? (
                <img
                  src={song.coverArtUrl}
                  alt={`${song.title} cover art`}
                  className="w-full h-full object-cover"
                  data-testid="img-song-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-orange-500 via-amber-500 to-green-500 flex items-center justify-center">
                  <Music2 className="w-14 h-14 sm:w-16 sm:h-16 text-white/90" />
                </div>
              )}
            </div>

            <div className="space-y-3 min-w-0 flex-1">
              <div>
                <h1
                  className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 break-words"
                  data-testid="text-song-title"
                >
                  {song.title}
                </h1>
                <p
                  className="text-lg sm:text-xl text-muted-foreground"
                  data-testid="text-song-artist"
                >
                  {song.artist}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <LicenseBadge licenseType={song.licenseType} />
                <span className="text-sm text-muted-foreground">
                  {song.languageName}
                </span>
                {song.licenseUrl && (
                  <a
                    href={song.licenseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    data-testid="link-license"
                  >
                    License
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              {song.lyricsStorageAllowed && !song.userGeneratedMode && lyricLines.length > 0 && (
                <ExportButton songId={song.id} songTitle={song.title} />
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8">

        {/* Lyrics Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Lyrics</h2>

          {song.lyricsStorageAllowed && !song.userGeneratedMode ? (
            lyricsLoading ? (
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i} className="p-6">
                    <Skeleton className="h-4 w-24 mb-4" />
                    <Skeleton className="h-6 w-full mb-2" />
                    <Skeleton className="h-6 w-5/6" />
                  </Card>
                ))}
              </div>
            ) : lyricLines.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  No lyrics available for this song yet.
                </p>
              </Card>
            ) : (
              lyricLines.map((line) => (
                <LyricLineCard
                  key={line.id}
                  lyricLine={line}
                  language={song.language}
                  onGenerateMeaning={handleGenerateMeaning}
                  onVote={handleVote}
                  isGenerating={generatingLineId === line.id}
                />
              ))
            )
          ) : (
            <UserLyricInput
              language={song.language}
              languageName={song.languageName}
              songId={song.id}
              onGenerate={handleGenerateUserLyric}
            />
          )}
        </div>
      </main>
    </div>
  );
}
