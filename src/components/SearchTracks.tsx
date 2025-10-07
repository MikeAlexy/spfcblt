import { useState } from 'react';
import { useSpotify } from '@/contexts/SpotifyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Play, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const SearchTracks = () => {
  const { searchTracks, play } = useSpotify();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const data = await searchTracks(query);
      setResults(data);
    } catch (error) {
      toast({
        title: "Search failed",
        description: "Unable to search tracks",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
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

  const handlePlayContext = async (uri: string) => {
    try {
      await play(uri);
      toast({ title: "Playing" });
    } catch (error) {
      toast({
        title: "Playback failed",
        description: "Make sure a device is active",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-card/50 backdrop-blur-xl border-border/50">
        <div className="flex gap-2">
          <Input
            placeholder="Search tracks, albums, artists, playlists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching} className="gap-2">
            <Search className="w-4 h-4" />
            Search
          </Button>
        </div>
      </Card>

      {results && (
        <Tabs defaultValue="tracks" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tracks">Tracks</TabsTrigger>
            <TabsTrigger value="albums">Albums</TabsTrigger>
            <TabsTrigger value="artists">Artists</TabsTrigger>
            <TabsTrigger value="playlists">Playlists</TabsTrigger>
          </TabsList>

          <TabsContent value="tracks" className="space-y-2">
            {results.tracks?.items.map((track: any) => (
              <Card key={track.id} className="p-4 bg-card/30 backdrop-blur-xl border-border/50 hover:bg-card/50 transition-colors">
                <div className="flex items-center gap-4">
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
            ))}
          </TabsContent>

          <TabsContent value="albums" className="space-y-2">
            {results.albums?.items.map((album: any) => (
              <Card key={album.id} className="p-4 bg-card/30 backdrop-blur-xl border-border/50 hover:bg-card/50 transition-colors">
                <div className="flex items-center gap-4">
                  <img
                    src={album.images[0]?.url}
                    alt={album.name}
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{album.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {album.artists.map((a: any) => a.name).join(', ')} • {album.release_date.split('-')[0]}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handlePlayContext(album.uri)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="artists" className="space-y-2">
            {results.artists?.items.map((artist: any) => (
              <Card key={artist.id} className="p-4 bg-card/30 backdrop-blur-xl border-border/50 hover:bg-card/50 transition-colors">
                <div className="flex items-center gap-4">
                  <img
                    src={artist.images[0]?.url || '/placeholder.png'}
                    alt={artist.name}
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{artist.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {artist.followers.total.toLocaleString()} followers
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handlePlayContext(artist.uri)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="playlists" className="space-y-2">
            {results.playlists?.items.map((playlist: any) => (
              <Card key={playlist.id} className="p-4 bg-card/30 backdrop-blur-xl border-border/50 hover:bg-card/50 transition-colors">
                <div className="flex items-center gap-4">
                  <img
                    src={playlist.images[0]?.url}
                    alt={playlist.name}
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{playlist.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      By {playlist.owner.display_name} • {playlist.tracks.total} tracks
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handlePlayContext(playlist.uri)}
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};