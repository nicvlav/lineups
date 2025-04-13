/// <reference types="@cloudflare/workers-types" />

interface Env {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    ASSETS: Fetcher; // ✅ Add this line
}
export default {
    async fetch(request: Request, env: Env, _: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // Serve API only at /api
        if (url.pathname === "/api") {
            const allowedOrigins = [
                "https://lineups.nicolasvlavianos.workers.dev",
                "https://staging.lineups.nicolasvlavianos.workers.dev",
            ];
            const origin = request.headers.get("Origin");

            if (origin && !allowedOrigins.includes(origin)) {
                return new Response("Unauthorized", { status: 403 });
            }

            // URL and anon key are not super critical since we use supabase and RLS 
            return new Response(
                JSON.stringify({
                    supabaseUrl: env.SUPABASE_URL,
                    supabaseAnonKey: env.SUPABASE_ANON_KEY,
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": origin || "*",
                    },
                }
            );
        }

        // Serve static assets (React app) by default
        if (/\.(js|html|css|png|jpg|jpeg|svg|woff|woff2|ttf|eot|ico)$/.test(url.pathname)) {
            return env.ASSETS.fetch(request);
        }

        // Fallback, redirect to origin
        const statusCode = 301;
        return Response.redirect(url.origin, statusCode);
    },
};

