import { useState, useEffect } from 'react';
import { useSpotify } from '@/contexts/SpotifyContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Heart, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const Library = () => {
  const { getUserSavedTracks, getRecentlyPlayed, getTopTracks, getTopArtists, play } = useSpotify();
  const [savedTracks, setSavedTracks] = useState<any[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const [saved, recent, top, artists] = await Promise.all([
        getUserSavedTracks(),
        getRecentlyPlayed(),
        getTopTracks('short_term'),
        getTopArtists('short_term'),
      ]);

      if (saved?.items) setSavedTracks(saved.items);
      if (recent?.items) setRecentlyPlayed(recent.items);
      if (top?.items) setTopTracks(top.items);
      if (artists?.items) setTopArtists(artists.items);
    } catch (error) {
      toast({
        title: "Failed to load library",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = async (uri: string) => {
    try {
      await play(undefined, [uri]);
      toast({ title: "Playing track" });
    } catch (error) {
      toast({
        title: "Playback failed",
        description: "Make sure a device is active",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center bg-card/50 backdrop-blur-xl border-border/50">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading library...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Your Library</h2>

      <Tabs defaultValue="saved" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="saved" className="gap-2">
            <Heart className="w-4 h-4" />
            Liked
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-2">
            <Clock className="w-4 h-4" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="tracks" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Top Tracks
          </TabsTrigger>
          <TabsTrigger value="artists" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Top Artists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved" className="space-y-2">
          {savedTracks.length > 0 ? (
            savedTracks.map((item) => (
              <Card key={item.track.id} className="p-4 bg-card/30 backdrop-blur-xl border-border/50 hover:bg-card/50 transition-colors">
                <div className="flex items-center gap-4">
                  <img
                    src={item.track.album.images[0]?.url}
                    alt={item.track.name}
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{item.track.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.track.artists.map((a: any) => a.name).join(', ')}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handlePlayTrack(item.track.uri)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center bg-card/50 backdrop-blur-xl border-border/50">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">No liked songs yet</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recent" className="space-y-2">
          {recentlyPlayed.length > 0 ? (
            recentlyPlayed.map((item, index) => (
              <Card key={`${item.track.id}-${index}`} className="p-4 bg-card/30 backdrop-blur-xl border-border/50 hover:bg-card/50 transition-colors">
                <div className="flex items-center gap-4">
                  <img
                    src={item.track.album.images[0]?.url}
                    alt={item.track.name}
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{item.track.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.track.artists.map((a: any) => a.name).join(', ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.played_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handlePlayTrack(item.track.uri)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center bg-card/50 backdrop-blur-xl border-border/50">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">No recently played tracks</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tracks" className="space-y-2">
          {topTracks.length > 0 ? (
            topTracks.map((track, index) => (
              <Card key={track.id} className="p-4 bg-card/30 backdrop-blur-xl border-border/50 hover:bg-card/50 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-muted-foreground/50 w-8 text-center">
                    {index + 1}
                  </span>
                  <img
                    src={track.album.images[0]?.url}
                    alt={track.name}
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{track.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {track.artists.map((a: any) => a.name).join(', ')}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handlePlayTrack(track.uri)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center bg-card/50 backdrop-blur-xl border-border/50">
              <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">No top tracks yet</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="artists" className="space-y-2">
          {topArtists.length > 0 ? (
            topArtists.map((artist, index) => (
              <Card key={artist.id} className="p-4 bg-card/30 backdrop-blur-xl border-border/50 hover:bg-card/50 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-2xl font-bold text-muted-foreground/50 w-8 text-center">
                    {index + 1}
                  </span>
                  <img
                    src={artist.images[0]?.url}
                    alt={artist.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{artist.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {artist.followers.total.toLocaleString()} followers
                    </p>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center bg-card/50 backdrop-blur-xl border-border/50">
              <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground mt-4">No top artists yet</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};