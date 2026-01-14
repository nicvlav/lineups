import { AlertCircle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleAuthCallback = async () => {
            try {
                // Check Facebook auth debug info
                const fbDebug = localStorage.getItem("fb_auth_debug");

                // Log mobile browser state and detect mode switching
                const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
                    navigator.userAgent
                );
                const currentViewport = window.innerWidth;
                const isDesktopMode = currentViewport > 768 && isMobileDevice;

                // Mobile state detection for recovery logic

                // Check if Facebook forced desktop mode on a mobile device
                if (fbDebug) {
                    const debugInfo = JSON.parse(fbDebug);
                    const wasInitiallyMobile = debugInfo.isMobileDevice && debugInfo.currentViewport < 768;
                    const nowInDesktopMode = isDesktopMode;

                    if (wasInitiallyMobile && nowInDesktopMode) {
                        // Store session tokens in localStorage for mobile mode recovery
                        const hashParams = new URLSearchParams(window.location.hash.substring(1));
                        const accessToken = hashParams.get("access_token");
                        const refreshToken = hashParams.get("refresh_token");

                        if (accessToken) {
                            localStorage.setItem(
                                "mobile_session_recovery",
                                JSON.stringify({
                                    access_token: accessToken,
                                    refresh_token: refreshToken,
                                    timestamp: Date.now(),
                                    originalViewport: debugInfo.currentViewport,
                                })
                            );
                        }
                    }
                }

                // First, get the current URL hash and search params
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(1));

                // Check for errors first
                const authError = urlParams.get("error") || hashParams.get("error");
                const errorCode = urlParams.get("error_code") || hashParams.get("error_code");
                const errorDescription = urlParams.get("error_description") || hashParams.get("error_description");

                if (authError) {
                    console.error("❌ Auth error from URL:", { authError, errorCode, errorDescription });

                    if (errorCode === "otp_expired") {
                        setError("Email verification link has expired. Please sign up again to get a new link.");
                    } else {
                        setError(errorDescription ? decodeURIComponent(errorDescription) : authError);
                    }
                    setLoading(false);
                    return;
                }

                // Check if we have auth tokens in the hash
                const accessToken = hashParams.get("access_token");
                const refreshToken = hashParams.get("refresh_token");

                if (accessToken) {
                    console.log("✅ Found access token in URL, setting session...");

                    // Set the session using the tokens from the URL
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: refreshToken || "",
                    });

                    if (error) {
                        console.error("❌ Error setting session:", error);
                        setError(error.message);
                    } else if (data.session) {
                        console.log("✅ Session set successfully:", data.session.user.email);
                        navigate("/", { replace: true });
                    } else {
                        setError("Failed to create session from tokens");
                    }
                    setLoading(false);
                    return;
                }

                // Fallback: Handle the OAuth callback with URL parameters or existing session
                console.log("🔄 CALLBACK: About to call getSession in callback...");

                // Add timeout to getSession in callback too (mobile issue)
                const callbackSessionPromise = supabase.auth.getSession();
                const callbackTimeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("callback getSession timeout")), 2000)
                );

                let sessionResult;
                try {
                    sessionResult = await Promise.race([callbackSessionPromise, callbackTimeoutPromise]);
                } catch (timeoutError) {
                    console.warn("⏰ CALLBACK: getSession timed out, assuming auth is already handled...");
                    // If getSession times out in callback, just redirect - auth context has already handled it
                    console.log("🏠 CALLBACK: Redirecting to home due to timeout...");
                    navigate("/", { replace: true });
                    return;
                }

                const { data, error } = sessionResult as any;
                console.log("📡 CALLBACK: getSession result:", { hasSession: !!data.session, error: error?.message });

                if (error) {
                    console.error("Auth callback error:", error);
                    setError(error.message);
                } else if (data.session) {
                    console.log("Session found:", data.session.user.email);
                    console.log("🏠 CALLBACK: Redirecting to home from session found...");
                    // Successfully authenticated, redirect to home
                    navigate("/", { replace: true });
                } else {
                    console.log("No session in callback, but user might already be signed in. Redirecting to home...");
                    console.log("🏠 CALLBACK: Redirecting to home from no session...");
                    // If we're here, the auth listener has likely already handled the session
                    // Just redirect to home and let the main app handle the auth state
                    navigate("/", { replace: true });
                }
            } catch (err) {
                console.error("Unexpected error:", err);
                setError("An unexpected error occurred during authentication");
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

    // This shouldn't render, but just in case
    return null;
}
