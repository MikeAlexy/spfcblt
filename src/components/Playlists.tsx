import { useState, useEffect } from 'react';
import { useSpotify } from '@/contexts/SpotifyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Play, Plus, Music, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const Playlists = () => {
  const { getUserPlaylists, createPlaylist, play } = useSpotify();
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [newPlaylistDesc, setNewPlaylistDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadPlaylists();
  }, []);

  const loadPlaylists = async () => {
    setLoading(true);
    try {
      const data = await getUserPlaylists();
      if (data?.items) {
        setPlaylists(data.items);
      }
    } catch (error) {
      toast({
        title: "Failed to load playlists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;

    setIsCreating(true);
    try {
      await createPlaylist(newPlaylistName, newPlaylistDesc);
      toast({ title: "Playlist created successfully" });
      setNewPlaylistName('');
      setNewPlaylistDesc('');
      loadPlaylists();
    } catch (error) {
      toast({
        title: "Failed to create playlist",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handlePlayPlaylist = async (uri: string) => {
    try {
      await play(uri);
      toast({ title: "Playing playlist" });
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
        <p className="text-muted-foreground mt-4">Loading playlists...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your Playlists</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Playlist
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  placeholder="My Playlist"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description (optional)</label>
                <Input
                  placeholder="My awesome playlist"
                  value={newPlaylistDesc}
                  onChange={(e) => setNewPlaylistDesc(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreatePlaylist}
                disabled={isCreating || !newPlaylistName.trim()}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {playlists.map((playlist) => (
          <Card key={playlist.id} className="p-4 bg-card/30 backdrop-blur-xl border-border/50 hover:bg-card/50 transition-colors group">
            <div className="flex gap-4">
              <div className="relative flex-shrink-0">
                {playlist.images?.[0]?.url ? (
                  <img
                    src={playlist.images[0].url}
                    alt={playlist.name}
                    className="w-20 h-20 rounded"
                  />
                ) : (
                  <div className="w-20 h-20 rounded bg-muted flex items-center justify-center">
                    <Music className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <Button
                  size="icon"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                  onClick={() => handlePlayPlaylist(playlist.uri)}
                >
                  <Play className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{playlist.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {playlist.description || 'No description'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {playlist.tracks.total} tracks
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {playlists.length === 0 && (
        <Card className="p-8 text-center bg-card/50 backdrop-blur-xl border-border/50">
          <Music className="w-12 h-12 mx-auto text-muted-foreground/50" />
          <p className="text-muted-foreground mt-4">No playlists yet</p>
          <p className="text-sm text-muted-foreground/70">Create your first playlist to get started</p>
        </Card>
      )}
    </div>
  );
};