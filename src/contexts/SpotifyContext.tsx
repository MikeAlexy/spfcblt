import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';

interface Track {
  uri: string;
  id: string;
  name: string;
  duration_ms: number;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  artists: Array<{ name: string; id: string }>;
}

interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
  product: string;
}

interface PlaybackState {
  position: number;
  duration: number;
  shuffle: boolean;
  repeat: 'off' | 'context' | 'track';
  volume: number;
}

interface Device {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
  volume_percent: number;
}

interface SpotifyContextType {
  accessToken: string | null;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  authError: string | null;
  isAuthenticating: boolean;
  userProfile: UserProfile | null;
  playbackState: PlaybackState;
  devices: Device[];
  player: Spotify.Player | null;
  isPlayerReady: boolean;
  refreshPlaybackState: () => Promise<void>;
  play: (contextUri?: string, uris?: string[], offset?: number) => Promise<void>;
  pause: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setShuffle: (state: boolean) => Promise<void>;
  setRepeat: (state: 'off' | 'context' | 'track') => Promise<void>;
  transferPlayback: (deviceId: string) => Promise<void>;
  searchTracks: (query: string) => Promise<any>;
  getUserPlaylists: () => Promise<any>;
  getPlaylist: (playlistId: string) => Promise<any>;
  createPlaylist: (name: string, description?: string) => Promise<any>;
  addToPlaylist: (playlistId: string, uris: string[]) => Promise<void>;
  removeFromPlaylist: (playlistId: string, uris: string[]) => Promise<void>;
  getUserSavedTracks: () => Promise<any>;
  saveTrack: (trackId: string) => Promise<void>;
  removeTrack: (trackId: string) => Promise<void>;
  checkSavedTracks: (trackIds: string[]) => Promise<boolean[]>;
  getRecentlyPlayed: () => Promise<any>;
  getTopTracks: (timeRange?: string) => Promise<any>;
  getTopArtists: (timeRange?: string) => Promise<any>;
  getQueue: () => Promise<any>;
}

const SpotifyContext = createContext<SpotifyContextType | undefined>(undefined);

const CLIENT_ID = '9eb5722c806d4e078d639e4a10b3d2f0';
const REDIRECT_URI = 'https://fcsp.vercel.app/callback';
const SCOPES = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-read',
  'user-library-modify',
  'user-read-currently-playing',
  'user-read-recently-played',
  'user-top-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-follow-read',
  'user-follow-modify',
].join(' ');

const TOKEN_KEY = 'spotify_token';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const CODE_VERIFIER_KEY = 'code_verifier';
const AUTH_STATE_KEY = 'auth_state';
const AUTH_PENDING_KEY = 'auth_pending';
const AUTH_CODE_KEY = 'spotify_auth_code';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: typeof Spotify;
  }
}

export const SpotifyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [player, setPlayer] = useState<Spotify.Player | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    position: 0,
    duration: 0,
    shuffle: false,
    repeat: 'off',
    volume: 100,
  });

  const playerRef = useRef<Spotify.Player | null>(null);
  const deviceIdRef = useRef<string | null>(null);

  const generateRandomString = (length: number) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
  };

  const generateCodeChallenge = async (codeVerifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  const exchangeCodeForToken = async (code: string, codeVerifier: string) => {
    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          code_verifier: codeVerifier,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error_description || 'Token exchange failed');
      }

      const data = await response.json();
      
      if (data.access_token) {
        setAccessToken(data.access_token);
        localStorage.setItem(TOKEN_KEY, data.access_token);
        
        if (data.refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        }
        
        localStorage.removeItem(CODE_VERIFIER_KEY);
        localStorage.removeItem(AUTH_STATE_KEY);
        localStorage.removeItem(AUTH_PENDING_KEY);
        
        setAuthError(null);
        setIsAuthenticating(false);
        return true;
      }
      
      return false;
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Token exchange failed');
      setIsAuthenticating(false);
      localStorage.removeItem(AUTH_PENDING_KEY);
      return false;
    }
  };

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const fetchDevices = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/devices', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices);
      }
    } catch (error) {
      console.error('Failed to fetch devices:', error);
    }
  };

  const refreshPlaybackState = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 204 || response.status === 404) {
        setCurrentTrack(null);
        setIsPlaying(false);
        return;
      }

      if (response.ok) {
        const data = await response.json();
        
        if (data.item) {
          setCurrentTrack({
            uri: data.item.uri,
            id: data.item.id,
            name: data.item.name,
            duration_ms: data.item.duration_ms,
            album: {
              name: data.item.album.name,
              images: data.item.album.images,
            },
            artists: data.item.artists,
          });
          setIsPlaying(data.is_playing);
          setPlaybackState({
            position: data.progress_ms || 0,
            duration: data.item.duration_ms || 0,
            shuffle: data.shuffle_state || false,
            repeat: data.repeat_state || 'off',
            volume: data.device?.volume_percent || 100,
          });
        }
      } else if (response.status === 401) {
        setAuthError('Session expired. Please login again.');
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch playback state:', error);
    }
  }, [accessToken]);

  const initializePlayer = useCallback(() => {
    if (!accessToken || playerRef.current || !window.Spotify) return;

    const spotifyPlayer = new window.Spotify.Player({
      name: 'FCPlayer Web Player',
      getOAuthToken: (cb) => { cb(accessToken); },
      volume: 1.0,
    });

    spotifyPlayer.addListener('ready', ({ device_id }) => {
      console.log('Ready with Device ID', device_id);
      deviceIdRef.current = device_id;
      setIsPlayerReady(true);
      fetchDevices();
    });

    spotifyPlayer.addListener('not_ready', ({ device_id }) => {
      console.log('Device ID has gone offline', device_id);
      setIsPlayerReady(false);
    });

    spotifyPlayer.addListener('player_state_changed', (state) => {
      if (!state) return;

      const track = state.track_window.current_track;
      setCurrentTrack({
        uri: track.uri,
        id: track.id,
        name: track.name,
        duration_ms: track.duration_ms,
        album: {
          name: track.album.name,
          images: track.album.images,
        },
        artists: track.artists,
      });

      setIsPlaying(!state.paused);
      setPlaybackState(prev => ({
        ...prev,
        position: state.position,
        duration: state.duration,
        shuffle: state.shuffle,
        repeat: state.repeat_mode === 0 ? 'off' : state.repeat_mode === 1 ? 'context' : 'track',
      }));
    });

    spotifyPlayer.connect();
    playerRef.current = spotifyPlayer;
    setPlayer(spotifyPlayer);
  }, [accessToken]);

  const play = async (contextUri?: string, uris?: string[], offset?: number) => {
    if (!accessToken) return;

    const deviceId = deviceIdRef.current || devices.find(d => d.is_active)?.id;
    if (!deviceId) return;

    const body: any = {};
    if (contextUri) body.context_uri = contextUri;
    if (uris) body.uris = uris;
    if (offset !== undefined) body.offset = { position: offset };

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      setTimeout(refreshPlaybackState, 500);
    } catch (error) {
      console.error('Play error:', error);
    }
  };

  const pause = async () => {
    if (!accessToken) return;

    try {
      await fetch('https://api.spotify.com/v1/me/player/pause', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTimeout(refreshPlaybackState, 500);
    } catch (error) {
      console.error('Pause error:', error);
    }
  };

  const skipNext = async () => {
    if (!accessToken) return;

    try {
      await fetch('https://api.spotify.com/v1/me/player/next', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTimeout(refreshPlaybackState, 500);
    } catch (error) {
      console.error('Skip next error:', error);
    }
  };

  const skipPrevious = async () => {
    if (!accessToken) return;

    try {
      await fetch('https://api.spotify.com/v1/me/player/previous', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setTimeout(refreshPlaybackState, 500);
    } catch (error) {
      console.error('Skip previous error:', error);
    }
  };

  const seek = async (position: number) => {
    if (!accessToken) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${position}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setPlaybackState(prev => ({ ...prev, position }));
    } catch (error) {
      console.error('Seek error:', error);
    }
  };

  const setVolume = async (volume: number) => {
    if (!accessToken) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/volume?volume_percent=${volume}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setPlaybackState(prev => ({ ...prev, volume }));
    } catch (error) {
      console.error('Volume error:', error);
    }
  };

  const setShuffle = async (state: boolean) => {
    if (!accessToken) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setPlaybackState(prev => ({ ...prev, shuffle: state }));
    } catch (error) {
      console.error('Shuffle error:', error);
    }
  };

  const setRepeat = async (state: 'off' | 'context' | 'track') => {
    if (!accessToken) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${state}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setPlaybackState(prev => ({ ...prev, repeat: state }));
    } catch (error) {
      console.error('Repeat error:', error);
    }
  };

  const transferPlayback = async (deviceId: string) => {
    if (!accessToken) return;

    try {
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ device_ids: [deviceId], play: true }),
      });
      fetchDevices();
    } catch (error) {
      console.error('Transfer playback error:', error);
    }
  };

  const searchTracks = async (query: string) => {
    if (!accessToken) return null;

    try {
      const response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track,album,artist,playlist&limit=20`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Search error:', error);
      return null;
    }
  };

  const getUserPlaylists = async () => {
    if (!accessToken) return null;

    try {
      const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Get playlists error:', error);
      return null;
    }
  };

  const getPlaylist = async (playlistId: string) => {
    if (!accessToken) return null;

    try {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Get playlist error:', error);
      return null;
    }
  };

  const createPlaylist = async (name: string, description?: string) => {
    if (!accessToken || !userProfile) return null;

    try {
      const response = await fetch(`https://api.spotify.com/v1/users/${userProfile.id}/playlists`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description, public: false }),
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Create playlist error:', error);
      return null;
    }
  };

  const addToPlaylist = async (playlistId: string, uris: string[]) => {
    if (!accessToken) return;

    try {
      await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ uris }),
      });
    } catch (error) {
      console.error('Add to playlist error:', error);
    }
  };

  const removeFromPlaylist = async (playlistId: string, uris: string[]) => {
    if (!accessToken) return;

    try {
      await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'DELETE',
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tracks: uris.map(uri => ({ uri })) }),
      });
    } catch (error) {
      console.error('Remove from playlist error:', error);
    }
  };

  const getUserSavedTracks = async () => {
    if (!accessToken) return null;

    try {
      const response = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Get saved tracks error:', error);
      return null;
    }
  };

  const saveTrack = async (trackId: string) => {
    if (!accessToken) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      console.error('Save track error:', error);
    }
  };

  const removeTrack = async (trackId: string) => {
    if (!accessToken) return;

    try {
      await fetch(`https://api.spotify.com/v1/me/tracks?ids=${trackId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (error) {
      console.error('Remove track error:', error);
    }
  };

  const checkSavedTracks = async (trackIds: string[]): Promise<boolean[]> => {
    if (!accessToken) return [];

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/tracks/contains?ids=${trackIds.join(',')}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Check saved tracks error:', error);
      return [];
    }
  };

  const getRecentlyPlayed = async () => {
    if (!accessToken) return null;

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=20', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Get recently played error:', error);
      return null;
    }
  };

  const getTopTracks = async (timeRange: string = 'medium_term') => {
    if (!accessToken) return null;

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/top/tracks?time_range=${timeRange}&limit=20`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Get top tracks error:', error);
      return null;
    }
  };

  const getTopArtists = async (timeRange: string = 'medium_term') => {
    if (!accessToken) return null;

    try {
      const response = await fetch(`https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=20`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Get top artists error:', error);
      return null;
    }
  };

  // Fetch the current playback queue
  const getQueue = async () => {
    if (!accessToken) return null;

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player/queue', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Get queue error:', error);
      return null;
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'spotify_auth_code') {
        const code = event.data.code;
        const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
        const authPending = localStorage.getItem(AUTH_PENDING_KEY);
        
        if (!authPending) return;
        
        if (codeVerifier && code) {
          setIsAuthenticating(true);
          await exchangeCodeForToken(code, codeVerifier);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    const checkForAuthCode = async () => {
      const authPending = localStorage.getItem(AUTH_PENDING_KEY);
      if (!authPending) return;

      const storedCode = localStorage.getItem(AUTH_CODE_KEY);
      
      if (storedCode) {
        const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
        
        if (codeVerifier) {
          setIsAuthenticating(true);
          localStorage.removeItem(AUTH_CODE_KEY);
          await exchangeCodeForToken(storedCode, codeVerifier);
        }
      }
    };

    checkForAuthCode();

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken && !accessToken) {
      setAccessToken(savedToken);
    }
  }, []);

  useEffect(() => {
    if (!accessToken) return;

    fetchUserProfile(accessToken);
    refreshPlaybackState();

    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      initializePlayer();
    };

    const interval = setInterval(() => {
      refreshPlaybackState();
      fetchDevices();
    }, 3000);

    return () => {
      clearInterval(interval);
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, [accessToken, initializePlayer, refreshPlaybackState]);

  const login = async () => {
    try {
      setAuthError(null);
      setIsAuthenticating(true);
      
      const codeVerifier = generateRandomString(128);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateRandomString(16);
      
      localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
      localStorage.setItem(AUTH_STATE_KEY, state);
      localStorage.setItem(AUTH_PENDING_KEY, 'true');
      
      const params = new URLSearchParams({
        client_id: CLIENT_ID,
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        scope: SCOPES,
        code_challenge_method: 'S256',
        code_challenge: codeChallenge,
        state: state,
        show_dialog: 'false',
      });

      const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;
      
      const width = 500;
      const height = 700;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      window.open(
        authUrl,
        'spotifyAuth',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
      );
      
    } catch (error) {
      setAuthError('Failed to start authentication');
      setIsAuthenticating(false);
      localStorage.removeItem(AUTH_PENDING_KEY);
    }
  };

  const logout = () => {
    if (playerRef.current) {
      playerRef.current.disconnect();
    }
    
    setAccessToken(null);
    setCurrentTrack(null);
    setIsPlaying(false);
    setAuthError(null);
    setIsAuthenticating(false);
    setUserProfile(null);
    setPlayer(null);
    setIsPlayerReady(false);
    
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(CODE_VERIFIER_KEY);
    localStorage.removeItem(AUTH_STATE_KEY);
    localStorage.removeItem(AUTH_PENDING_KEY);
  };

  return (
    <SpotifyContext.Provider
      value={{
        accessToken,
        isAuthenticated: !!accessToken,
        login,
        logout,
        currentTrack,
        isPlaying,
        authError,
        isAuthenticating,
        userProfile,
        playbackState,
        devices,
        player,
        isPlayerReady,
        refreshPlaybackState,
        play,
        pause,
        skipNext,
        skipPrevious,
        seek,
        setVolume,
        setShuffle,
        setRepeat,
        transferPlayback,
        searchTracks,
        getUserPlaylists,
        getPlaylist,
        createPlaylist,
        addToPlaylist,
        removeFromPlaylist,
        getUserSavedTracks,
        saveTrack,
        removeTrack,
        checkSavedTracks,
        getRecentlyPlayed,
        getTopTracks,
        getTopArtists,
        getQueue,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
};

export const useSpotify = () => {
  const context = useContext(SpotifyContext);
  if (context === undefined) {
    throw new Error('useSpotify must be used within a SpotifyProvider');
  }
  return context;
};