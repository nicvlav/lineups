import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { Toaster } from "sonner";
import Layout from "@/components/layout/layout";
import { AuthProvider } from "@/context/auth-context";

import { ThemeProvider } from "@/context/theme-provider";
import { queryClient } from "@/lib/query-client";

const App = () => {
    const currentUrl = new URL(window.location.href);
    // Only capture the "state" param (game state sharing URLs), not auth params like "code"
    const hasGameState = currentUrl.searchParams.has("state");
    const urlState = hasGameState ? currentUrl.search : null;

    useEffect(() => {
        if (hasGameState) {
            const url = new URL(window.location.href);
            url.searchParams.delete("state");
            window.history.replaceState(null, "", url.pathname + url.search);
        }
    }, [hasGameState]);

    return (
        <QueryClientProvider client={queryClient}>
            <div className="h-dvh flex flex-col">
                <AuthProvider url={urlState}>
                    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                        <Layout />
                        <Toaster />
                    </ThemeProvider>
                </AuthProvider>
            </div>
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
};

export default App;
