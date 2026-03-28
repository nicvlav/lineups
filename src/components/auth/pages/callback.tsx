import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for OAuth errors in URL params
        const urlParams = new URLSearchParams(window.location.search);
        const authError = urlParams.get("error");
        const errorCode = urlParams.get("error_code");
        const errorDescription = urlParams.get("error_description");

        if (authError) {
            logger.error("Auth callback error:", { authError, errorCode, errorDescription });
            if (errorCode === "otp_expired") {
                setError("Email verification link has expired. Please sign up again to get a new link.");
            } else {
                setError(errorDescription ? decodeURIComponent(errorDescription) : authError);
            }
            setLoading(false);
            return;
        }

        // With PKCE flow, Supabase exchanges the ?code= param for a session automatically.
        // Wait for the session to establish, then redirect home.
        let redirected = false;
        const redirect = () => {
            if (!redirected) {
                redirected = true;
                navigate("/", { replace: true });
            }
        };

        // Listen for auth state change (PKCE code exchange triggers SIGNED_IN)
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
            if (event === "SIGNED_IN") {
                redirect();
            }
        });

        // Session may already be established before the listener was set up
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) redirect();
        });

        // Safety timeout — redirect home regardless after 5s
        const timeout = setTimeout(redirect, 5000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
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
                            <Button onClick={() => navigate("/auth/sign-in", { replace: true })} className="w-full">
                                Try Again
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => navigate("/", { replace: true })}
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

    return null;
}
