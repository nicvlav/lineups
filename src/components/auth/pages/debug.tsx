import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export default function AuthDebugPage() {
    const navigate = useNavigate();
    const [debugInfo, setDebugInfo] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const debugOAuth = async () => {
            try {
                // Get URL parameters
                const urlParams = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.substring(1));

                // Parse specific auth errors
                const authError = urlParams.get("error") || hashParams.get("error");
                const errorCode = urlParams.get("error_code") || hashParams.get("error_code");
                const errorDescription = urlParams.get("error_description") || hashParams.get("error_description");

                // Get localStorage debug info
                const storedDebug = localStorage.getItem("fb_auth_debug");

                // Check current session
                const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

                // Try to get user info
                const { data: userData, error: userError } = await supabase.auth.getUser();

                const info = {
                    timestamp: new Date().toISOString(),
                    url: window.location.href,
                    urlParams: Object.fromEntries(urlParams.entries()),
                    hashParams: Object.fromEntries(hashParams.entries()),
                    authError: {
                        error: authError,
                        code: errorCode,
                        description: errorDescription ? decodeURIComponent(errorDescription) : null,
                    },
                    storedDebug: storedDebug ? JSON.parse(storedDebug) : null,
                    session: {
                        data: sessionData,
                        error: sessionError?.message,
                    },
                    user: {
                        data: userData,
                        error: userError?.message,
                    },
                };

                console.log("🔍 Debug Info:", info);
                setDebugInfo(info);

                // If we have a successful session, redirect after showing debug
                if (sessionData.session) {
                    console.log("✅ Session found! Redirecting in 3 seconds...");
                    setTimeout(() => {
                        navigate("/", { replace: true });
                    }, 3000);
                }
            } catch (error) {
                console.error("Debug error:", error);
                setDebugInfo({ error: error instanceof Error ? error.message : String(error) });
            } finally {
                setLoading(false);
            }
        };

        debugOAuth();
    }, [navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>Debugging OAuth...</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>Analyzing authentication state...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4">
            <div className="max-w-4xl mx-auto space-y-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Facebook OAuth Debug Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-96">
                            {JSON.stringify(debugInfo, null, 2)}
                        </pre>

                        <div className="mt-4 space-x-2">
                            <Button onClick={() => navigate("/")}>Go to Home</Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    localStorage.removeItem("fb_auth_debug");
                                    setDebugInfo({});
                                }}
                            >
                                Clear Debug Data
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
