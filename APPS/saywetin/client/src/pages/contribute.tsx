import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Music, PenLine, Gift, Trophy, Star, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { useAuthStatus } from '@/hooks/use-auth-status';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';

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

export default function Contribute() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { isAuthAvailable, authStatus } = useAuthStatus();
  const { toast } = useToast();
  
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [language, setLanguage] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (data: {
      songTitle: string;
      songArtist: string;
      fullLyrics: string;
      language: string;
      languageName: string;
    }) => {
      const response = await apiRequest('POST', '/api/community-lyrics', data);
      return response.json();
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({
        title: 'Lyrics Submitted!',
        description: 'Thank you for contributing. Your submission is now pending review.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/contributions'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || 'Could not submit lyrics. Please try again.',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedLang = LANGUAGES.find(l => l.value === language);
    if (!selectedLang) {
      toast({
        variant: 'destructive',
        title: 'Please select a language',
      });
      return;
    }

    submitMutation.mutate({
      songTitle: songTitle.trim(),
      songArtist: songArtist.trim(),
      fullLyrics: lyrics.trim(),
      language: selectedLang.value,
      languageName: selectedLang.label,
    });
  };

  const resetForm = () => {
    setSongTitle('');
    setSongArtist('');
    setLanguage('');
    setLyrics('');
    setSubmitted(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-4">
            <Link href="/">
              <button className="flex items-center gap-2 hover-elevate" data-testid="button-home">
                <img src="/app-icon.jpg" alt="Saywetin" className="h-7 w-7 rounded-md" />
                <span className="text-xl font-bold bg-gradient-to-r from-orange-600 via-amber-500 to-green-500 bg-clip-text text-transparent">Saywetin</span>
              </button>
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <div className="container max-w-2xl mx-auto px-6 py-16 text-center">
          <Card>
            <CardContent className="py-12">
              <PenLine className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Sign in to Contribute</h2>
              <p className="text-muted-foreground mb-6">
                {isAuthAvailable
                  ? 'Join our community and earn rewards by contributing lyrics'
                  : authStatus?.message || 'Sign in is temporarily unavailable.'}
              </p>
              <div className="flex gap-4 justify-center">
                {isAuthAvailable ? (
                  <Button onClick={() => navigate('/login')} data-testid="button-login">
                    Sign in
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => navigate('/')}
                    data-testid="button-login-unavailable-back-home"
                  >
                    Back home
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-4">
          <Link href="/">
            <button className="flex items-center gap-2 hover-elevate" data-testid="button-home">
              <img src="/app-icon.jpg" alt="Saywetin" className="h-7 w-7 rounded-md" />
              <span className="text-xl font-bold bg-gradient-to-r from-orange-600 via-amber-500 to-green-500 bg-clip-text text-transparent">Saywetin</span>
            </button>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="container max-w-4xl mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Contribute Lyrics</h1>
            <p className="text-muted-foreground">
              Help build the world's best database of African music lyrics
            </p>
          </div>

          {/* Rewards Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">10 Points</p>
                  <p className="text-xs text-muted-foreground">Per submission</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">50 Bonus</p>
                  <p className="text-xs text-muted-foreground">When approved</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="font-medium">5 Per Vote</p>
                  <p className="text-xs text-muted-foreground">From community</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submission Form or Success */}
          {submitted ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Lyrics Submitted!</h3>
                <p className="text-muted-foreground mb-6">
                  Your contribution is now pending community review. You'll earn points once it's approved.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={resetForm} data-testid="button-submit-another">
                    <PenLine className="mr-2 h-4 w-4" />
                    Submit Another
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/')} data-testid="button-go-home">
                    Back to Home
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PenLine className="h-5 w-5" />
                  Submit Lyrics
                </CardTitle>
                <CardDescription>
                  Enter the song details and full lyrics below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="song-title">Song Title *</Label>
                      <Input
                        id="song-title"
                        placeholder="e.g., Essence"
                        value={songTitle}
                        onChange={(e) => setSongTitle(e.target.value)}
                        required
                        data-testid="input-song-title"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="artist">Artist Name *</Label>
                      <Input
                        id="artist"
                        placeholder="e.g., Wizkid ft. Tems"
                        value={songArtist}
                        onChange={(e) => setSongArtist(e.target.value)}
                        required
                        data-testid="input-artist"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Primary Language *</Label>
                    <Select value={language} onValueChange={setLanguage} required>
                      <SelectTrigger data-testid="select-language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lyrics">Full Lyrics *</Label>
                    <Textarea
                      id="lyrics"
                      placeholder="Paste or type the complete song lyrics here..."
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      required
                      rows={12}
                      className="font-mono text-sm"
                      data-testid="textarea-lyrics"
                    />
                    <p className="text-xs text-muted-foreground">
                      {lyrics.split('\n').filter(l => l.trim()).length} lines
                    </p>
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={submitMutation.isPending || !songTitle || !songArtist || !language || !lyrics}
                      data-testid="button-submit"
                    >
                      {submitMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Gift className="mr-2 h-4 w-4" />
                          Submit for Review
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Guidelines */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Submission Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>• Submit complete lyrics only - partial submissions will be rejected</p>
              <p>• Ensure accuracy - lyrics should match the official song</p>
              <p>• Include all verses, choruses, and ad-libs</p>
              <p>• Use proper line breaks to separate sections</p>
              <p>• Songs in African languages are especially valued</p>
              <p>• Community members will vote on accuracy before approval</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
