import { useEffect, useState } from 'react';
import { useSpotify } from '@/contexts/SpotifyContext';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, Share2, RefreshCw, Shuffle, Repeat, Repeat1, VolumeX, Monitor } from 'lucide-react';
import { sdk } from '@farcaster/miniapp-sdk';
import { toast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export const MusicPlayer = () => {
  const { 
    currentTrack, 
    isPlaying, 
    playbackState,
    devices,
    pause,
    play,
    skipNext,
    skipPrevious,
    seek,
    setVolume,
    setShuffle,
    setRepeat,
    transferPlayback,
    saveTrack,
    removeTrack,
    checkSavedTracks,
    refreshPlaybackState 
  } = useSpotify();

  const [isSaved, setIsSaved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (currentTrack?.id) {
      checkSavedTracks([currentTrack.id]).then(([saved]) => setIsSaved(saved));
    }
  }, [currentTrack?.id]);

  const togglePlayback = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  const handleSaveTrack = async () => {
    if (!currentTrack) return;
    
    if (isSaved) {
      await removeTrack(currentTrack.id);
      setIsSaved(false);
      toast({ title: "Removed from Liked Songs" });
    } else {
      await saveTrack(currentTrack.id);
      setIsSaved(true);
      toast({ title: "Added to Liked Songs ❤️" });
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

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (value: number[]) => {
    const newPosition = value[0];
    seek(newPosition);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const toggleShuffle = () => {
    setShuffle(!playbackState.shuffle);
  };

  const toggleRepeat = () => {
    const states: Array<'off' | 'context' | 'track'> = ['off', 'context', 'track'];
    const currentIndex = states.indexOf(playbackState.repeat);
    const nextState = states[(currentIndex + 1) % states.length];
    setRepeat(nextState);
  };

  const handleDeviceChange = async (deviceId: string) => {
    await transferPlayback(deviceId);
    toast({ title: "Playback transferred" });
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
    <div className="space-y-4">
      <Card className="relative overflow-hidden bg-card/50 backdrop-blur-xl border-border/50 shadow-card">
        <div className="relative aspect-square">
          <img
            src={currentTrack.album.images[0]?.url}
            alt={currentTrack.album.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute top-4 right-4 flex gap-2">
            <Button
              size="icon"
              variant="secondary"
              className={`rounded-full bg-card/80 backdrop-blur-sm hover:bg-card shadow-glow-secondary ${isSaved ? 'text-red-500' : ''}`}
              onClick={handleSaveTrack}
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
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

          <div className="absolute bottom-0 left-0 right-0 p-6 space-y-1">
            <h3 className="text-2xl font-bold text-white truncate drop-shadow-lg">
              {currentTrack.name}
            </h3>
            <p className="text-white/80 truncate drop-shadow-lg">
              {currentTrack.artists.map(a => a.name).join(', ')}
            </p>
            <p className="text-xs text-white/60 drop-shadow-lg">
              {currentTrack.album.name}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-player-bg backdrop-blur-xl border-border/50 shadow-card space-y-4">
        <div className="space-y-2">
          <Slider
            value={[playbackState.position]}
            max={playbackState.duration}
            step={1000}
            onValueChange={handleSeek}
            onPointerDown={() => setIsDragging(true)}
            onPointerUp={() => setIsDragging(false)}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(playbackState.position)}</span>
            <span>{formatTime(playbackState.duration)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className={`rounded-full hover:bg-player-control ${playbackState.shuffle ? 'text-green-500' : ''}`}
              onClick={toggleShuffle}
            >
              <Shuffle className="w-4 h-4" />
            </Button>

            {devices.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="icon" variant="ghost" className="rounded-full hover:bg-player-control">
                    <Monitor className="w-4 h-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Available Devices</h4>
                    {devices.map(device => (
                      <Button
                        key={device.id}
                        variant={device.is_active ? "default" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleDeviceChange(device.id)}
                      >
                        <Monitor className="w-4 h-4 mr-2" />
                        {device.name}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full hover:bg-player-control"
              onClick={skipPrevious}
            >
              <SkipBack className="w-5 h-5" />
            </Button>

            <Button
              size="icon"
              className="w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-green-600 hover:opacity-90 shadow-lg transition-all hover:scale-105"
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
              onClick={skipNext}
            >
              <SkipForward className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className={`rounded-full hover:bg-player-control ${playbackState.repeat !== 'off' ? 'text-green-500' : ''}`}
              onClick={toggleRepeat}
            >
              {playbackState.repeat === 'track' ? (
                <Repeat1 className="w-4 h-4" />
              ) : (
                <Repeat className="w-4 h-4" />
              )}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full hover:bg-player-control">
                  {playbackState.volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <VolumeX className="w-4 h-4" />
                    <Slider
                      value={[playbackState.volume]}
                      max={100}
                      step={1}
                      onValueChange={handleVolumeChange}
                      className="flex-1"
                    />
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    {playbackState.volume}%
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </Card>
    </div>
  );
};