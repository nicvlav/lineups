import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60, // 1 minute
            refetchOnWindowFocus: false,
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
        mutations: {
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            onError: (error) => {
                // Only log mutation errors (user-initiated)
                console.error("Mutation error:", error);
            },
        },
    },
    logger: {
        log: console.log,
        warn: console.warn,
        error: (error) => {
            // Suppress CORS errors from background refetches (browser wake-up)
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes("CORS") || errorMessage.includes("Network request failed")) {
                // Silently ignore - these happen when browser throttles background tabs
                return;
            }
            // Log everything else
            console.error("Query error:", error);
        },
    },
});
