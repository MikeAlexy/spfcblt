import { useSpotify } from '@/contexts/SpotifyContext';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, Share2, RefreshCw } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

export const MusicPlayer = () => {
  const { currentTrack, isPlaying, accessToken, refreshPlaybackState } = useSpotify();

  const togglePlayback = async () => {
    if (!accessToken) return;

    const endpoint = isPlaying 
      ? 'https://api.spotify.com/v1/me/player/pause'
      : 'https://api.spotify.com/v1/me/player/play';

    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok || response.status === 204) {
        // Refresh playback state after action
        setTimeout(refreshPlaybackState, 500);
      } else if (response.status === 404) {
        toast({
          title: "No active device",
          description: "Please start playing music on a Spotify device first",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Playback error:', error);
      toast({
        title: "Playback error",
        description: "Failed to control playback",
        variant: "destructive",
      });
    }
  };

  const skipTrack = async (direction: 'next' | 'previous') => {
    if (!accessToken) return;

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/player/${direction}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok || response.status === 204) {
        // Refresh playback state after skip
        setTimeout(refreshPlaybackState, 500);
      } else if (response.status === 404) {
        toast({
          title: "No active device",
          description: "Please start playing music on a Spotify device first",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Skip error:', error);
    }
  };

  const shareToFarcaster = async () => {
    if (!currentTrack) return;

    try {
      await sdk.actions.composeCast({
        text: `🎵 Now playing: ${currentTrack.name} by ${currentTrack.artists.map(a => a.name).join(', ')}\n\nListen on FCPlayer!`,
      });
      
      toast({
        title: "Cast composed!",
        description: "Share your music with Farcaster",
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (!currentTrack) {
    return (
      <Card className="flex flex-col items-center justify-center h-64 bg-card/50 backdrop-blur-xl border-border/50">
        <div className="text-center space-y-4">
          <Volume2 className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <div className="space-y-2">
            <p className="text-muted-foreground">No track playing</p>
            <p className="text-sm text-muted-foreground/70">Start playing music on your Spotify app</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshPlaybackState}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Album Art */}
      <Card className="relative overflow-hidden bg-card/50 backdrop-blur-xl border-border/50 shadow-card">
        <div className="relative aspect-square">
          <img
            src={currentTrack.album.images[0]?.url}
            alt={currentTrack.album.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-overlay" />
          
          {/* Floating actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full bg-card/80 backdrop-blur-sm hover:bg-card shadow-glow-secondary"
              onClick={() => toast({ title: "Added to favorites ❤️" })}
            >
              <Heart className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full bg-card/80 backdrop-blur-sm hover:bg-card shadow-glow-primary"
              onClick={shareToFarcaster}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Track info overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-6 space-y-1">
            <h3 className="text-2xl font-bold text-foreground truncate">
              {currentTrack.name}
            </h3>
            <p className="text-muted-foreground truncate">
              {currentTrack.artists.map(a => a.name).join(', ')}
            </p>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <Card className="p-6 bg-player-bg backdrop-blur-xl border-border/50 shadow-card">
        <div className="flex items-center justify-center gap-4">
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full hover:bg-player-control"
            onClick={() => skipTrack('previous')}
          >
            <SkipBack className="w-5 h-5" />
          </Button>

          <Button
            size="icon"
            className="w-16 h-16 rounded-full bg-gradient-primary hover:opacity-90 shadow-glow-primary transition-all hover:scale-105"
            onClick={togglePlayback}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="rounded-full hover:bg-player-control"
            onClick={() => skipTrack('next')}
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
