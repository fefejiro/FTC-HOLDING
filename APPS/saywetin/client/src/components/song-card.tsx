import { Music2, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LicenseBadge } from "./license-badge";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Song } from "@shared/schema";
import { Link } from "wouter";

interface SongCardProps {
  song: Song;
}

export function SongCard({ song }: SongCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: favoriteStatus } = useQuery<{ isFavorited: boolean }>({
    queryKey: ["/api/favorites", song.id],
    enabled: isAuthenticated,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: () => {
      if (favoriteStatus?.isFavorited) {
        return apiRequest("DELETE", `/api/favorites/${song.id}`, {});
      } else {
        return apiRequest("POST", `/api/favorites/${song.id}`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/favorites", song.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
      toast({
        title: favoriteStatus?.isFavorited ? "Removed from favorites" : "Added to favorites",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive",
      });
    },
  });

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavoriteMutation.mutate();
  };

  return (
    <Link href={`/song/${song.id}`}>
      <Card
        className="overflow-hidden transition-all duration-200 hover:shadow-lg hover-elevate cursor-pointer"
        data-testid={`card-song-${song.id}`}
      >
        <div className="relative aspect-square">
          {song.coverArtUrl ? (
            <img
              src={song.coverArtUrl}
              alt={`${song.title} cover art`}
              className="w-full h-full object-cover"
              data-testid={`img-cover-${song.id}`}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
              <Music2 className="w-16 h-16 text-primary" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <LicenseBadge licenseType={song.licenseType} />
          </div>
          {isAuthenticated && (
            <div className="absolute top-2 left-2">
              <Button
                size="icon"
                variant={favoriteStatus?.isFavorited ? "default" : "secondary"}
                className="h-8 w-8"
                onClick={handleFavoriteClick}
                disabled={toggleFavoriteMutation.isPending}
                data-testid={`button-favorite-${song.id}`}
              >
                <Heart
                  className="h-4 w-4"
                  fill={favoriteStatus?.isFavorited ? "currentColor" : "none"}
                />
              </Button>
            </div>
          )}
        </div>
        <CardContent className="p-4">
          <h3
            className="font-semibold text-lg mb-1 line-clamp-1"
            data-testid={`text-song-title-${song.id}`}
          >
            {song.title}
          </h3>
          <p
            className="text-sm text-muted-foreground line-clamp-1"
            data-testid={`text-song-artist-${song.id}`}
          >
            {song.artist}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {song.languageName}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
