import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Track {
  uri: string;
  id: string;
  name: string;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  artists: Array<{ name: string }>;
}

interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  images: Array<{ url: string }>;
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
  refreshPlaybackState: () => Promise<void>;
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
  'user-read-currently-playing',
].join(' ');

// Storage keys
const TOKEN_KEY = 'spotify_token';
const REFRESH_TOKEN_KEY = 'spotify_refresh_token';
const CODE_VERIFIER_KEY = 'code_verifier';
const AUTH_STATE_KEY = 'auth_state';
const AUTH_PENDING_KEY = 'auth_pending';
const AUTH_CODE_KEY = 'spotify_auth_code';

export const SpotifyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Generate random string for PKCE
  const generateRandomString = (length: number) => {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const values = crypto.getRandomValues(new Uint8Array(length));
    return values.reduce((acc, x) => acc + possible[x % possible.length], '');
  };

  // Generate code challenge for PKCE
  const generateCodeChallenge = async (codeVerifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  };

  // Exchange authorization code for access token
  const exchangeCodeForToken = async (code: string, codeVerifier: string) => {
    try {
      console.log('Exchanging code for token...');
      
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
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
        console.log('Token received successfully');
        setAccessToken(data.access_token);
        localStorage.setItem(TOKEN_KEY, data.access_token);
        
        if (data.refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh_token);
        }
        
        // Clear auth state
        localStorage.removeItem(CODE_VERIFIER_KEY);
        localStorage.removeItem(AUTH_STATE_KEY);
        localStorage.removeItem(AUTH_PENDING_KEY);
        
        setAuthError(null);
        setIsAuthenticating(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token exchange error:', error);
      setAuthError(error instanceof Error ? error.message : 'Token exchange failed');
      setIsAuthenticating(false);
      localStorage.removeItem(AUTH_PENDING_KEY);
      return false;
    }
  };

  // Fetch user profile
  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch('https://api.spotify.com/v1/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data);
        console.log('User profile loaded:', data.display_name);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  // Fetch current playback state
  const refreshPlaybackState = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch('https://api.spotify.com/v1/me/player', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.status === 204 || response.status === 404) {
        // No active playback
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
            album: {
              name: data.item.album.name,
              images: data.item.album.images,
            },
            artists: data.item.artists,
          });
          setIsPlaying(data.is_playing);
        }
      } else if (response.status === 401) {
        // Token expired
        setAuthError('Session expired. Please login again.');
        logout();
      }
    } catch (error) {
      console.error('Failed to fetch playback state:', error);
    }
  };

  // Listen for auth code from popup callback window
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'spotify_auth_code') {
        console.log('Auth code received via postMessage');
        
        const code = event.data.code;
        const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
        const authPending = localStorage.getItem(AUTH_PENDING_KEY);
        
        if (!authPending) {
          console.log('No auth pending, ignoring message');
          return;
        }
        
        if (codeVerifier && code) {
          setIsAuthenticating(true);
          
          const success = await exchangeCodeForToken(code, codeVerifier);
          
          if (!success) {
            setAuthError('Failed to authenticate with Spotify');
          }
        } else {
          console.error('Code verifier not found or code missing');
          setAuthError('Authentication state lost');
          setIsAuthenticating(false);
          localStorage.removeItem(AUTH_PENDING_KEY);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Also check localStorage as fallback
    const checkForAuthCode = async () => {
      const authPending = localStorage.getItem(AUTH_PENDING_KEY);
      if (!authPending) return;

      const storedCode = localStorage.getItem(AUTH_CODE_KEY);
      
      if (storedCode) {
        console.log('Auth code received from localStorage');
        
        const codeVerifier = localStorage.getItem(CODE_VERIFIER_KEY);
        
        if (codeVerifier) {
          setIsAuthenticating(true);
          localStorage.removeItem(AUTH_CODE_KEY);
          
          const success = await exchangeCodeForToken(storedCode, codeVerifier);
          
          if (!success) {
            setAuthError('Failed to authenticate with Spotify');
          }
        }
      }
    };

    checkForAuthCode();

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Check for existing token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken && !accessToken) {
      console.log('Using saved token');
      setAccessToken(savedToken);
    }
  }, []);

  // Fetch user profile and start playback polling when authenticated
  useEffect(() => {
    if (!accessToken) return;

    // Fetch user profile
    fetchUserProfile(accessToken);

    // Initial playback state fetch
    refreshPlaybackState();

    // Poll playback state every 3 seconds
    const interval = setInterval(refreshPlaybackState, 3000);

    return () => clearInterval(interval);
  }, [accessToken]);

  const login = async () => {
    try {
      setAuthError(null);
      setIsAuthenticating(true);
      
      // Generate PKCE code verifier and challenge
      const codeVerifier = generateRandomString(128);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Generate state for CSRF protection
      const state = generateRandomString(16);
      
      // Store for later verification
      localStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
      localStorage.setItem(AUTH_STATE_KEY, state);
      localStorage.setItem(AUTH_PENDING_KEY, 'true');
      
      // Build authorization URL
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
      
      console.log('Opening Spotify auth popup...');
      
      // Open in popup window
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
      console.error('Login error:', error);
      setAuthError('Failed to start authentication');
      setIsAuthenticating(false);
      localStorage.removeItem(AUTH_PENDING_KEY);
    }
  };

  const logout = () => {
    setAccessToken(null);
    setCurrentTrack(null);
    setIsPlaying(false);
    setAuthError(null);
    setIsAuthenticating(false);
    setUserProfile(null);
    
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
        refreshPlaybackState,
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
