import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // First, get the current URL hash and search params
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        console.log('🔗 URL search params:', urlParams.toString());
        console.log('🔗 URL hash params:', hashParams.toString());
        
        // Check for errors first
        const authError = urlParams.get('error') || hashParams.get('error');
        const errorCode = urlParams.get('error_code') || hashParams.get('error_code');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        
        if (authError) {
          console.error('❌ Auth error from URL:', { authError, errorCode, errorDescription });
          
          if (errorCode === 'otp_expired') {
            setError('Email verification link has expired. Please sign up again to get a new link.');
          } else {
            setError(errorDescription ? decodeURIComponent(errorDescription) : authError);
          }
          setLoading(false);
          return;
        }
        
        // Check if we have auth tokens in the hash
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
          console.log('✅ Found access token in URL, setting session...');
          
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });
          
          if (error) {
            console.error('❌ Error setting session:', error);
            setError(error.message);
          } else if (data.session) {
            console.log('✅ Session set successfully:', data.session.user.email);
            navigate('/', { replace: true });
          } else {
            setError('Failed to create session from tokens');
          }
          setLoading(false);
          return;
        }
        
        // Fallback: Handle the OAuth callback with URL parameters
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          setError(error.message);
        } else if (data.session) {
          console.log('Session found:', data.session.user.email);
          // Successfully authenticated, redirect to home
          navigate('/', { replace: true });
        } else {
          console.log('No session found, checking for auth code...');
          
          // If no session but we have URL params, try to handle the callback
          if (urlParams.has('code') || hashParams.has('access_token')) {
            console.log('Found auth parameters, attempting to exchange...');
            // The auth state change listener should pick this up
            setTimeout(() => {
              // Re-check session after a delay
              supabase.auth.getSession().then(({ data: sessionData, error: sessionError }) => {
                if (sessionError) {
                  console.error('Session check error:', sessionError);
                  setError(sessionError.message);
                  setLoading(false);
                } else if (sessionData.session) {
                  console.log('Session found on retry:', sessionData.session.user.email);
                  navigate('/', { replace: true });
                } else {
                  console.log('Still no session found');
                  setError('Authentication failed - no session created');
                  setLoading(false);
                }
              });
            }, 2000);
          } else {
            setError('No authentication data received');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError('An unexpected error occurred during authentication');
        setLoading(false);
      }
    };

    // Add a small delay to ensure the auth state has time to update
    const timer = setTimeout(handleAuthCallback, 1000);

    return () => clearTimeout(timer);
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardTitle>Completing sign in...</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground text-center">
              Please wait while we complete your authentication.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Authentication Error</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Button 
                onClick={() => navigate('/auth/sign-in', { replace: true })}
                className="w-full"
              >
                Try Again
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/', { replace: true })}
                className="w-full"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This shouldn't render, but just in case
  return null;
}