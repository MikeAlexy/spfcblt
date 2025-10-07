import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function Callback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const state = params.get('state');
        const error = params.get('error');

        if (error) {
          throw new Error(`Spotify authentication error: ${error}`);
        }

        if (!code) {
          throw new Error('No authorization code received');
        }

        const savedState = localStorage.getItem('auth_state');
        if (state !== savedState) {
          throw new Error('State mismatch - possible CSRF attack');
        }

        console.log('Auth code received, sending to parent window...');

        if (window.opener) {
          window.opener.postMessage(
            { type: 'spotify_auth_code', code },
            window.location.origin
          );

          localStorage.setItem('spotify_auth_code', code);

          setStatus('success');
          setMessage('Authentication successful! Closing window...');

          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          console.log('No opener, saving to localStorage and redirecting...');
          localStorage.setItem('spotify_auth_code', code);

          setStatus('success');
          setMessage('Authentication successful! Redirecting...');

          setTimeout(() => {
            navigate('/');
          }, 1500);
        }
      } catch (err) {
        console.error('Callback error:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Authentication failed');

        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            navigate('/');
          }
        }, 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="p-8 max-w-md w-full text-center space-y-6 bg-card/50 backdrop-blur-xl border-border/50">
        {status === 'processing' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto animate-spin text-primary" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold">Connecting to Spotify</h2>
              <p className="text-muted-foreground">{message}</p>
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-green-500">Success!</h2>
              <p className="text-muted-foreground">{message}</p>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 mx-auto text-destructive" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-destructive">Error</h2>
              <p className="text-muted-foreground">{message}</p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
