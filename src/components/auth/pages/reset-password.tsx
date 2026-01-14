import { AlertCircle, ArrowLeft, CheckCircle, Loader2, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth-context";

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const { user, resetPassword } = useAuth();

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Redirect if already signed in
    useEffect(() => {
        if (user) {
            navigate("/", { replace: true });
        }
    }, [user, navigate]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email) {
            setError("Please enter your email address");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error: authError } = await resetPassword(email);

            if (authError) {
                setError(authError.message);
            } else {
                setSuccess(true);
            }
        } catch (err) {
            setError("An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    // Success state
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle className="h-6 w-6 text-blue-600" />
                        </div>
                        <CardTitle>Check your email</CardTitle>
                        <CardDescription>We've sent a password reset link to {email}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground text-center">
                            Click the link in your email to reset your password. If you don't see it, check your spam
                            folder.
                        </p>
                        <div className="space-y-2">
                            <Button asChild className="w-full">
                                <Link to="/auth/sign-in">Back to Sign In</Link>
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                    setSuccess(false);
                                    setEmail("");
                                }}
                            >
                                Send another email
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">Reset password</h1>
                    <p className="text-muted-foreground">Enter your email and we'll send you a reset link</p>
                </div>

                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-2xl text-center">Forgot password?</CardTitle>
                        <CardDescription className="text-center">
                            No worries, we'll send you reset instructions
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Error Alert */}
                        {error && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Email Form */}
                        <form onSubmit={handleResetPassword} className="space-y-4">
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
                                <p className="text-xs text-muted-foreground">
                                    We'll email you a link to reset your password
                                </p>
                            </div>

                            <Button type="submit" className="w-full" size="lg" disabled={loading}>
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Mail className="mr-2 h-4 w-4" />
                                )}
                                Send reset email
                            </Button>
                        </form>

                        <Button asChild variant="ghost" className="w-full">
                            <Link to="/auth/sign-in" className="flex items-center">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to sign in
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
