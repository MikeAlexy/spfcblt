import { useEffect, useState } from 'react';
import { useFarcaster } from '@/contexts/FarcasterContext';
import { useSpotify } from '@/contexts/SpotifyContext';
import { MusicPlayer } from '@/components/MusicPlayer';
import { SearchTracks } from '@/components/SearchTracks';
import { Playlists } from '@/components/Playlists';
import { Library } from '@/components/Library';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music2, LogOut, Loader2, AlertCircle, Search, ListMusic, Library as LibraryIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Index() {
  const { isReady, fid, username } = useFarcaster();
  const { isAuthenticated, login, logout, isAuthenticating, authError, userProfile, isPlayerReady } = useSpotify();
  const [activeTab, setActiveTab] = useState('player');

  useEffect(() => {
    document.title = 'FCPlayer - Spotify Music Player';
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">Initializing Farcaster...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      <div className="container max-w-4xl mx-auto px-4 py-8 space-y-6">
        <header className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <Music2 className="w-10 h-10 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              FCPlayer
            </h1>
          </div>
          <p className="text-muted-foreground">
            Full-Featured Spotify Player for Farcaster
          </p>

          {fid && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 text-sm">
              <span className="text-muted-foreground">Connected as</span>
              <span className="font-semibold">{username || `FID: ${fid}`}</span>
            </div>
          )}
        </header>

        {authError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{authError}</AlertDescription>
          </Alert>
        )}

        {!isAuthenticated ? (
          <Card className="p-8 text-center space-y-6 bg-card/50 backdrop-blur-xl border-border/50">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Connect Your Spotify</h2>
              <p className="text-muted-foreground">
                Sign in with your Spotify account to unlock full music experience
              </p>
            </div>

            <Button
              onClick={login}
              disabled={isAuthenticating}
              size="lg"
              className="gap-2"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Music2 className="w-4 h-4" />
                  Connect Spotify
                </>
              )}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>Features:</p>
              <ul className="list-disc list-inside">
                <li>Full playback control with Web Playback SDK</li>
                <li>Search tracks, albums, artists & playlists</li>
                <li>Manage your playlists</li>
                <li>View your library & listening history</li>
              </ul>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {userProfile && (
              <Card className="p-4 bg-card/50 backdrop-blur-xl border-border/50">
                <div className="flex items-center gap-4">
                  {userProfile.images?.[0]?.url && (
                    <img
                      src={userProfile.images[0].url}
                      alt={userProfile.display_name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{userProfile.display_name}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{userProfile.email}</span>
                      {userProfile.product === 'premium' && (
                        <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-xs font-semibold">
                          Premium
                        </span>
                      )}
                      {isPlayerReady && (
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                          Web Player Active
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </Button>
                </div>
              </Card>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="player" className="gap-2">
                  <Music2 className="w-4 h-4" />
                  Player
                </TabsTrigger>
                <TabsTrigger value="search" className="gap-2">
                  <Search className="w-4 h-4" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="playlists" className="gap-2">
                  <ListMusic className="w-4 h-4" />
                  Playlists
                </TabsTrigger>
                <TabsTrigger value="library" className="gap-2">
                  <LibraryIcon className="w-4 h-4" />
                  Library
                </TabsTrigger>
              </TabsList>

              <TabsContent value="player" className="space-y-6">
                <MusicPlayer />
                <Card className="p-6 bg-card/30 backdrop-blur-xl border-border/50 text-center">
                  <p className="text-sm text-muted-foreground">
                    Control playback from any Spotify device or use the built-in web player
                  </p>
                </Card>
              </TabsContent>

              <TabsContent value="search">
                <SearchTracks />
              </TabsContent>

              <TabsContent value="playlists">
                <Playlists />
              </TabsContent>

              <TabsContent value="library">
                <Library />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
