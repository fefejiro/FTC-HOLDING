import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search as SearchIcon,
  Music,
  Globe,
  Tag,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { getApiUrl } from '@/lib/api-config';

interface SearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  releaseYear?: number;
  spotifyId?: string;
  youtubeId?: string;
  confidenceScore?: number;
  createdAt: string;
}

// Predefined language and category options
const LANGUAGES = [
  { value: 'yo', label: 'Yoruba' },
  { value: 'ig', label: 'Igbo' },
  { value: 'ha', label: 'Hausa' },
  { value: 'zu', label: 'Zulu' },
  { value: 'xh', label: 'Xhosa' },
  { value: 'sw', label: 'Swahili' },
  { value: 'am', label: 'Amharic' },
  { value: 'en-ng', label: 'Nigerian Pidgin' },
  { value: 'en', label: 'English' },
  { value: 'fr', label: 'French' },
  { value: 'pt', label: 'Portuguese' },
];

const CULTURAL_CATEGORIES = [
  'Proverbs',
  'Traditional',
  'Religious',
  'Historical',
  'Political',
  'Love & Romance',
  'Family',
  'Social Commentary',
  'Celebration',
  'Folklore',
];

const GENRES = [
  'Afrobeats',
  'Highlife',
  'Juju',
  'Fuji',
  'Gospel',
  'Hip Hop',
  'R&B',
  'Reggae',
  'Traditional',
  'Jazz',
];

export default function Search() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Build query string for API
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedLanguages.length > 0) params.set('languages', selectedLanguages.join(','));
    if (selectedGenres.length > 0) params.set('genres', selectedGenres.join(','));
    if (selectedCategories.length > 0) params.set('culturalCategories', selectedCategories.join(','));
    return params.toString();
  };

  const queryString = buildQueryString();

  const { data: results = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['search-page-results', queryString],
    enabled: hasSearched,
    queryFn: async () => {
      const response = await fetch(getApiUrl(`/api/search?${queryString}`), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to search songs');
      }

      return response.json();
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSearched(true);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedLanguages([]);
    setSelectedGenres([]);
    setSelectedCategories([]);
    setHasSearched(false);
  };

  const toggleSelection = (value: string, currentSelection: string[], setter: (val: string[]) => void) => {
    if (currentSelection.includes(value)) {
      setter(currentSelection.filter(v => v !== value));
    } else {
      setter([...currentSelection, value]);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-4">
          <Link href="/">
            <button className="flex items-center gap-2 hover-elevate active-elevate-2" data-testid="button-home">
              <Music className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Saywetin</span>
            </button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Songs</h1>
          <p className="text-muted-foreground">
            Discover songs by title, artist, language, or cultural themes
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Text Search */}
              <div className="space-y-2">
                <Label htmlFor="search-input">Search by title, artist, or album</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search-input"
                      type="text"
                      placeholder="Enter song title, artist name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search"
                    />
                  </div>
                  <Button type="submit" data-testid="button-search">
                    <SearchIcon className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Language Filter */}
                <div className="space-y-2">
                  <Label>
                    <Globe className="inline h-4 w-4 mr-1" />
                    Languages
                  </Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {LANGUAGES.map(lang => (
                      <div key={lang.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`lang-${lang.value}`}
                          checked={selectedLanguages.includes(lang.value)}
                          onCheckedChange={() => toggleSelection(lang.value, selectedLanguages, setSelectedLanguages)}
                          data-testid={`checkbox-language-${lang.value}`}
                        />
                        <label
                          htmlFor={`lang-${lang.value}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {lang.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Genre Filter */}
                <div className="space-y-2">
                  <Label>
                    <Music className="inline h-4 w-4 mr-1" />
                    Genres
                  </Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {GENRES.map(genre => (
                      <div key={genre} className="flex items-center space-x-2">
                        <Checkbox
                          id={`genre-${genre}`}
                          checked={selectedGenres.includes(genre)}
                          onCheckedChange={() => toggleSelection(genre, selectedGenres, setSelectedGenres)}
                          data-testid={`checkbox-genre-${genre}`}
                        />
                        <label
                          htmlFor={`genre-${genre}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {genre}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cultural Category Filter */}
                <div className="space-y-2">
                  <Label>
                    <Sparkles className="inline h-4 w-4 mr-1" />
                    Cultural Themes
                  </Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {CULTURAL_CATEGORIES.map(category => (
                      <div key={category} className="flex items-center space-x-2">
                        <Checkbox
                          id={`cat-${category}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => toggleSelection(category, selectedCategories, setSelectedCategories)}
                          data-testid={`checkbox-category-${category}`}
                        />
                        <label
                          htmlFor={`cat-${category}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {category}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Filters Display */}
              {(selectedLanguages.length > 0 || selectedGenres.length > 0 || selectedCategories.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">Active Filters:</span>
                  {selectedLanguages.map(lang => (
                    <Badge key={`badge-lang-${lang}`} variant="secondary" data-testid={`badge-language-${lang}`}>
                      {LANGUAGES.find(l => l.value === lang)?.label}
                    </Badge>
                  ))}
                  {selectedGenres.map(genre => (
                    <Badge key={`badge-genre-${genre}`} variant="secondary" data-testid={`badge-genre-${genre}`}>
                      {genre}
                    </Badge>
                  ))}
                  {selectedCategories.map(cat => (
                    <Badge key={`badge-cat-${cat}`} variant="secondary" data-testid={`badge-category-${cat}`}>
                      {cat}
                    </Badge>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    data-testid="button-clear-filters"
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </form>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">
                Search Results
                {results.length > 0 && (
                  <span className="text-muted-foreground ml-2">({results.length})</span>
                )}
              </h2>
            </div>

            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-muted-foreground mt-4">Searching...</p>
              </div>
            ) : results.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <SearchIcon className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No results found</h3>
                  <p className="text-muted-foreground text-sm">
                    Try adjusting your search terms or filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.map((track) => (
                  <Link key={track.id} href={`/recognized-track/${track.id}`}>
                    <Card className="hover-elevate cursor-pointer" data-testid={`card-track-${track.id}`}>
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-semibold line-clamp-1" data-testid={`text-title-${track.id}`}>
                              {track.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-1" data-testid={`text-artist-${track.id}`}>
                              {track.artist}
                            </p>
                          </div>

                          {track.album && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {track.album}
                              {track.releaseYear && ` (${track.releaseYear})`}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {track.genre && (
                              <Badge variant="outline" data-testid={`badge-genre-result-${track.id}`}>
                                <Tag className="h-3 w-3 mr-1" />
                                {track.genre}
                              </Badge>
                            )}
                            {track.confidenceScore && track.confidenceScore >= 90 && (
                              <Badge variant="secondary">
                                {track.confidenceScore}% match
                              </Badge>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {track.spotifyId && (
                              <a
                                href={`https://open.spotify.com/track/${track.spotifyId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm text-muted-foreground hover:text-primary"
                                data-testid={`link-spotify-${track.id}`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {track.youtubeId && (
                              <a
                                href={`https://youtube.com/watch?v=${track.youtubeId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-sm text-muted-foreground hover:text-primary"
                                data-testid={`link-youtube-${track.id}`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State (before search) */}
        {!hasSearched && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <SearchIcon className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Start Your Search</h3>
              <p className="text-muted-foreground max-w-md">
                Enter a search term or select filters above to discover songs with rich cultural context and translations
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
