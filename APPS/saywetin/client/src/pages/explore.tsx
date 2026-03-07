import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TagPill, GenreTag, LanguageTag } from '@/components/ui/tag-pill';
import { DidYouKnowCard } from '@/components/did-you-know-card';
import { Search, Music, TrendingUp, Clock } from 'lucide-react';

interface RecognizedTrackInfo {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genres?: string[];
  languages?: string[];
}

interface ListeningSession {
  id: string;
  status: string;
  createdAt: string;
  recognizedTrack?: RecognizedTrackInfo;
}

const culturalFacts = [
  "Afrobeats fuse traditional Yoruba drums with modern electronic beats, creating a unique sound that's taken over the world.",
  "Nigerian Pidgin English is spoken by over 75 million people across West Africa.",
  "The 'Zanku' dance originated from the streets of Lagos and became a global phenomenon.",
  "Many Afrobeats songs contain proverbs and sayings passed down through generations.",
];

export default function Explore() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const { data: recentTracks, isLoading } = useQuery<ListeningSession[]>({
    queryKey: ['/api/listening-history'],
  });

  const genres = ['Afrobeats', 'Amapiano', 'Highlife', 'Juju', 'Fuji', 'Afropop'];
  const languages = ['Yoruba', 'Pidgin', 'Igbo', 'Hausa', 'English', 'Zulu'];

  const randomFact = culturalFacts[Math.floor(Math.random() * culturalFacts.length)];

  const handleTrackClick = (trackId: string) => {
    navigate(`/song/${trackId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" data-testid="heading-explore">
            Explore
          </h1>
          <p className="text-muted-foreground">
            Discover songs and their meanings
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, artist, or lyrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-explore"
          />
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Filter by Genre</p>
          <div className="flex flex-wrap gap-2">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                className={`transition-all ${selectedGenre === genre ? 'scale-105' : ''}`}
                data-testid={`filter-genre-${genre.toLowerCase()}`}
              >
                <GenreTag 
                  genre={genre} 
                  className={selectedGenre === genre ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Filter by Language</p>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(selectedLanguage === lang ? null : lang)}
                className={`transition-all ${selectedLanguage === lang ? 'scale-105' : ''}`}
                data-testid={`filter-lang-${lang.toLowerCase()}`}
              >
                <LanguageTag 
                  language={lang} 
                  className={selectedLanguage === lang ? 'ring-2 ring-gold ring-offset-2 ring-offset-background' : ''}
                />
              </button>
            ))}
          </div>
        </div>

        <DidYouKnowCard fact={randomFact} />

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Recently Explored</h2>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Skeleton className="h-14 w-14 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recentTracks && recentTracks.length > 0 ? (
            <div className="space-y-3">
              {recentTracks
                .filter(track => track.recognizedTrack)
                .slice(0, 10)
                .map((session) => {
                  const track = session.recognizedTrack!;
                  return (
                    <Card 
                      key={session.id} 
                      className="hover-elevate cursor-pointer"
                      onClick={() => handleTrackClick(track.id)}
                      data-testid={`track-card-${track.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex gap-4 items-center">
                          <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
                            <Music className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate" data-testid={`text-track-title-${track.id}`}>
                              {track.title}
                            </h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {track.artist}
                            </p>
                          </div>
                          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Music className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No songs explored yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Use the Interpret tab to discover songs
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
