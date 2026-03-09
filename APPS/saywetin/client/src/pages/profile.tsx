import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SongCard } from "@/components/song-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Music, History, ArrowLeft, Star, Trophy, TrendingUp, Sparkles, LogOut } from "lucide-react";
import type { Song, UserLyricTranslation, UserRewards } from "@shared/schema";

export default function Profile() {
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: favorites = [], isLoading: favoritesLoading } = useQuery<Song[]>({
    queryKey: ["/api/favorites"],
    enabled: isAuthenticated,
  });

  const { data: translations = [], isLoading: translationsLoading } = useQuery<UserLyricTranslation[]>({
    queryKey: ["/api/user/translations"],
    enabled: isAuthenticated,
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery<UserRewards>({
    queryKey: ["/api/user/rewards"],
    enabled: isAuthenticated,
  });

  const getLevelName = (level: number) => {
    switch (level) {
      case 1: return "Newcomer";
      case 2: return "Contributor";
      case 3: return "Cultural Expert";
      default: return "Newcomer";
    }
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "bg-muted text-muted-foreground";
      case 2: return "bg-primary/20 text-primary";
      case 3: return "bg-gold/20 text-gold";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Music className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Abeg sign in</CardTitle>
            <CardDescription>
              Make you sign in to see your profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" onClick={() => setLocation("/login")} data-testid="button-login">
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = user?.firstName 
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.email || 'User';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-primary">Profile</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-6 flex items-center gap-4">
          {user?.profileImageUrl && (
            <img 
              src={user.profileImageUrl} 
              alt={displayName}
              className="h-14 w-14 rounded-full object-cover"
              data-testid="img-profile"
            />
          )}
          <div>
            <h2 className="text-3xl font-bold mb-1" data-testid="text-display-name">{displayName}</h2>
            {user?.email && <p className="text-muted-foreground">{user.email}</p>}
          </div>
        </div>

        <Card className="mb-6 border-gold/30 bg-gradient-to-br from-gold/5 to-transparent" data-testid="card-rewards">
          <CardContent className="py-5">
            {rewardsLoading ? (
              <div className="flex gap-6">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gold/20 flex items-center justify-center">
                    <Trophy className="h-7 w-7 text-gold" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold" data-testid="text-total-points">
                        {rewards?.totalPoints || 0}
                      </span>
                      <span className="text-muted-foreground">points</span>
                    </div>
                    <Badge className={getLevelColor(rewards?.level || 1)} data-testid="badge-level">
                      Level {rewards?.level || 1}: {getLevelName(rewards?.level || 1)}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex gap-4 sm:gap-6 sm:ml-auto text-center">
                  <div>
                    <div className="flex items-center gap-1 justify-center">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="font-semibold" data-testid="text-lyrics-contributed">
                        {rewards?.lyricsContributed || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Contributed</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 justify-center">
                      <Star className="h-4 w-4 text-gold" />
                      <span className="font-semibold" data-testid="text-lyrics-approved">
                        {rewards?.lyricsApproved || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Approved</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 justify-center">
                      <TrendingUp className="h-4 w-4 text-orange" />
                      <span className="font-semibold" data-testid="text-votes-received">
                        {rewards?.votesReceived || 0}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Votes</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {rewards && rewards.totalPoints === 0 && (
          <Card className="mb-6 border-primary/30" data-testid="card-points-explainer">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground mb-2">
                <span className="font-medium text-foreground">How to earn points:</span>
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>+10 points when you contribute lyrics</li>
                <li>+50 points when your lyrics get approved</li>
                <li>+5 points for each vote your contribution receives</li>
              </ul>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="favorites" className="w-full">
          <TabsList>
            <TabsTrigger value="favorites" data-testid="tab-favorites">
              <Heart className="h-4 w-4 mr-2" />
              Favorites ({favorites.length})
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="h-4 w-4 mr-2" />
              Your Story ({translations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="favorites" className="mt-6">
            {favoritesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-square w-full rounded-xl" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : favorites.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">You never save any song yet</p>
                  <Button
                    className="mt-4"
                    onClick={() => setLocation("/")}
                    data-testid="button-browse"
                  >
                    Go discover
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {favorites.map((song) => (
                  <SongCard key={song.id} song={song} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            {translationsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : translations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No translation history yet</p>
                  <Button
                    className="mt-4"
                    onClick={() => setLocation("/")}
                    data-testid="button-browse-translations"
                  >
                    Explore songs
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {translations.map((translation) => (
                  <Card key={translation.id} data-testid={`translation-${translation.id}`}>
                    <CardHeader>
                      <CardTitle className="text-lg">{translation.lyricText}</CardTitle>
                      <CardDescription>{translation.language}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Translation:</h4>
                          <p className="text-muted-foreground">{translation.translation}</p>
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">Cultural Meaning:</h4>
                          <p className="text-muted-foreground">{translation.culturalMeaning}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
