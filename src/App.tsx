import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { Toaster } from "sonner";
import Layout from "@/components/layout/layout";
import { AuthProvider } from "@/context/auth-context";
import { SupabaseProvider } from "@/context/supabase-provider";
import { ThemeProvider } from "@/context/theme-provider";
import { queryClient } from "@/lib/query-client";

const App = () => {
    const currentUrl = new URL(window.location.href);
    const urlState = currentUrl.search;

    useEffect(() => {
        if (urlState) {
            window.history.replaceState(null, "", currentUrl.pathname);
        }
    }, [urlState]);

    return (
        <QueryClientProvider client={queryClient}>
            <SupabaseProvider>
                <div className="h-dvh flex flex-col">
                    <AuthProvider url={urlState}>
                        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
                            <Layout />
                            <Toaster />
                        </ThemeProvider>
                    </AuthProvider>
                </div>
            </SupabaseProvider>
            {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
    );
};

export default App;
