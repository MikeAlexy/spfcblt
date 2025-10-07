declare namespace Spotify {
  interface Player {
    connect(): Promise<boolean>;
    disconnect(): void;
    addListener(event: 'ready', callback: (data: { device_id: string }) => void): void;
    addListener(event: 'not_ready', callback: (data: { device_id: string }) => void): void;
    addListener(event: 'player_state_changed', callback: (state: PlaybackState | null) => void): void;
    addListener(event: 'initialization_error', callback: (error: Error) => void): void;
    addListener(event: 'authentication_error', callback: (error: Error) => void): void;
    addListener(event: 'account_error', callback: (error: Error) => void): void;
    addListener(event: 'playback_error', callback: (error: Error) => void): void;
    removeListener(event: string, callback?: () => void): void;
    getCurrentState(): Promise<PlaybackState | null>;
    setName(name: string): Promise<void>;
    getVolume(): Promise<number>;
    setVolume(volume: number): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    togglePlay(): Promise<void>;
    seek(position_ms: number): Promise<void>;
    previousTrack(): Promise<void>;
    nextTrack(): Promise<void>;
    activateElement(): Promise<void>;
  }

  interface PlaybackState {
    context: {
      uri: string | null;
      metadata: any;
    };
    disallows: {
      pausing: boolean;
      peeking_next: boolean;
      peeking_prev: boolean;
      resuming: boolean;
      seeking: boolean;
      skipping_next: boolean;
      skipping_prev: boolean;
    };
    paused: boolean;
    position: number;
    repeat_mode: 0 | 1 | 2;
    shuffle: boolean;
    track_window: {
      current_track: Track;
      previous_tracks: Track[];
      next_tracks: Track[];
    };
    duration: number;
    loading: boolean;
  }

  interface Track {
    uri: string;
    id: string;
    type: 'track' | 'episode' | 'ad';
    media_type: 'audio' | 'video';
    name: string;
    is_playable: boolean;
    album: {
      uri: string;
      name: string;
      images: Array<{ url: string; height: number; width: number }>;
    };
    artists: Array<{ uri: string; name: string }>;
    duration_ms: number;
  }

  interface PlayerOptions {
    name: string;
    getOAuthToken(callback: (token: string) => void): void;
    volume?: number;
  }

  interface Error {
    message: string;
  }
}

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady(): void;
    Spotify: {
      Player: new (options: Spotify.PlayerOptions) => Spotify.Player;
    };
  }
}