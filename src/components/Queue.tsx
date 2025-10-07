import { useEffect, useState } from 'react';
import { useSpotify } from '@/contexts/SpotifyContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Play } from 'lucide-react';

export const Queue = () => {
  const { getQueue, play } = useSpotify();
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
    // Optionally, poll every few seconds for live updates
    // const interval = setInterval(loadQueue, 5000);
    // return () => clearInterval(interval);
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await getQueue();
      setQueue(data);
    } catch (error) {
      setQueue(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center bg-card/50 backdrop-blur-xl border-border/50">
        <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
        <p className="text-muted-foreground mt-4">Loading queue...</p>
      </Card>
    );
  }

  if (!queue || (!queue.currently_playing && (!queue.queue || queue.queue.length === 0))) {
    return (
      <Card className="p-8 text-center bg-card/50 backdrop-blur-xl border-border/50">
        <p className="text-muted-foreground">No tracks in queue</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Playback Queue</h2>
      <div className="space-y-4">
        {queue.currently_playing && (
          <Card className="p-4 bg-card/30 border-border/50">
            <div className="flex gap-4 items-center">
              <img
                src={queue.currently_playing.album?.images?.[0]?.url}
                alt={queue.currently_playing.name}
                className="w-16 h-16 rounded"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{queue.currently_playing.name}</h3>
                <p className="text-sm text-muted-foreground truncate">
                  {queue.currently_playing.artists?.map((a: any) => a.name).join(', ')}
                </p>
              </div>
              <Button size="icon" onClick={() => play(undefined, [queue.currently_playing.uri])}>
                <Play className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        )}
        {queue.queue && queue.queue.length > 0 && (
          <div className="space-y-2">
            {queue.queue.map((track: any, idx: number) => (
              <Card key={track.id || idx} className="p-4 bg-card/20 border-border/50 flex gap-4 items-center">
                <img
                  src={track.album?.images?.[0]?.url}
                  alt={track.name}
                  className="w-12 h-12 rounded"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{track.name}</h4>
                  <p className="text-sm text-muted-foreground truncate">
                    {track.artists?.map((a: any) => a.name).join(', ')}
                  </p>
                </div>
                <Button size="icon" onClick={() => play(undefined, [track.uri])}>
                  <Play className="w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
