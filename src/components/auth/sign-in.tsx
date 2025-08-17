import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Mail, Lock, LogIn, Facebook, AlertCircle, Loader2 } from 'lucide-react';
import { PAGE_LAYOUT } from '@/lib/design-tokens/page-tokens';
import { PADDING, SPACING_Y, SIZES } from '@/lib/design-tokens';
import { cn } from '@/lib/utils/cn';

export default function SignInPage() {
  const navigate = useNavigate();
  const { user, signInWithEmail, signInWithFacebook } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if already signed in
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await signInWithEmail(email, password);
      
      if (authError) {
        if (authError.message === 'Invalid login credentials') {
          setError('Invalid email or password');
        } else if (authError.message === 'Email not confirmed') {
          setError('Please check your email and click the confirmation link');
        } else {
          setError(authError.message);
        }
      } else {
        // Success - user will be redirected via useEffect
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await signInWithFacebook();
      
      if (authError) {
        setError(authError.message);
        setLoading(false);
      }
      // If successful, OAuth will redirect to callback page
    } catch (err) {
      setError('Failed to sign in with Facebook');
      setLoading(false);
    }
  };

  // If user is already signed in, show loading
  if (user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className={cn("text-center", SPACING_Y.md)}>
          <Loader2 className={cn(SIZES.icon.lg, "animate-spin mx-auto")} />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen flex items-center justify-center bg-background", PADDING.md)}>
      <div className={cn("w-full max-w-md", SPACING_Y.lg)}>
        {/* Header */}
        <div className={cn("text-center", PAGE_LAYOUT.header.wrapper)}>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className={PAGE_LAYOUT.header.description}>
            Sign in to your account to continue
          </p>
        </div>

        <Card>
          <CardHeader className={SPACING_Y.xs}>
            <CardTitle className="text-2xl text-center">Sign in</CardTitle>
            <CardDescription className="text-center">
              Choose your preferred sign in method
            </CardDescription>
          </CardHeader>
          <CardContent className={SPACING_Y.md}>
            {/* Facebook OAuth Button */}
            <Button
              onClick={handleFacebookAuth}
              disabled={loading}
              variant="outline"
              className="w-full"
              size="lg"
            >
              {loading ? (
                <Loader2 className={cn("mr-2 animate-spin", SIZES.icon.xs)} />
              ) : (
                <Facebook className={cn("mr-2", SIZES.icon.xs)} />
              )}
              Continue with Facebook
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className={cn("bg-background text-muted-foreground", PADDING.sm)}>
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className={SIZES.icon.xs} />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Email Form */}
            <form onSubmit={handleEmailAuth} className={SPACING_Y.md}>
              <div className={SPACING_Y.sm}>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className={cn("absolute left-3 top-3 text-muted-foreground", SIZES.icon.xs)} />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              <div className={SPACING_Y.sm}>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className={cn("absolute left-3 top-3 text-muted-foreground", SIZES.icon.xs)} />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    disabled={loading}
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className={SIZES.icon.xs} />
                    ) : (
                      <Eye className={SIZES.icon.xs} />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Link
                  to="/auth/reset-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className={cn("mr-2 animate-spin", SIZES.icon.xs)} />
                ) : (
                  <LogIn className={cn("mr-2", SIZES.icon.xs)} />
                )}
                Sign in
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                to="/auth/sign-up"
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </div>
    </div>
  );
}