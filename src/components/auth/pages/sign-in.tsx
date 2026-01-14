import { AlertCircle, Eye, EyeOff, Facebook, Loader2, Lock, LogIn, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/auth-context";

export default function SignInPage() {
    const navigate = useNavigate();
    const { user, signInWithEmail, signInWithFacebook } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Redirect if already signed in
    useEffect(() => {
        if (user) {
            navigate("/", { replace: true });
        }
    }, [user, navigate]);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setError("Please fill in all fields");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await signInWithEmail(email, password);

            if (authError) {
                if (authError.message === "Invalid login credentials") {
                    setError("Invalid email or password");
                } else if (authError.message === "Email not confirmed") {
                    setError("Please check your email and click the confirmation link");
                } else {
                    setError(authError.message);
                }
            } else {
                // Success - user will be redirected via useEffect
            }
        } catch (err) {
            setError("An unexpected error occurred");
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
            setError("Failed to sign in with Facebook");
            setLoading(false);
        }
    };

    // If user is already signed in, show loading
    if (user) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                    <p className="text-muted-foreground">Redirecting...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
                    <p className="text-muted-foreground">Sign in to your account to continue</p>
                </div>

                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center">Sign in</CardTitle>
                        <CardDescription className="text-center">Choose your preferred sign in method</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Facebook OAuth Button */}
                        <Button
                            onClick={handleFacebookAuth}
                            disabled={loading}
                            variant="outline"
                            className="w-full"
                            size="lg"
                        >
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Facebook className="mr-2 h-4 w-4" />
                            )}
                            Continue with Facebook
                        </Button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <Separator className="w-full" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                            </div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Email Form */}
                        <form onSubmit={handleEmailAuth} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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

                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
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
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center">
                                <Link to="/auth/reset-password" className="text-sm text-primary hover:underline">
                                    Forgot password?
                                </Link>
                            </div>

                            <Button type="submit" className="w-full" size="lg" disabled={loading}>
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <LogIn className="mr-2 h-4 w-4" />
                                )}
                                Sign in
                            </Button>
                        </form>

                        <div className="text-center text-sm text-muted-foreground">
                            Don't have an account?{" "}
                            <Link to="/auth/sign-up" className="text-primary hover:underline font-medium">
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
