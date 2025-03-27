/// <reference types="@cloudflare/workers-types" />


interface Env {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
}

export default {
    async fetch(request: Request, env: Env, _: ExecutionContext): Promise<Response> {
        // 🔒 Security Check: Only allow requests from your domain
        const allowedOrigins = ["https://your-site.com", "https://staging.your-site.com"];
        const origin = request.headers.get("Origin");

        if (!origin || !allowedOrigins.includes(origin)) {
            return new Response("Unauthorized", { status: 403 });
        }

        return new Response(
            JSON.stringify({
                supabaseUrl: env.SUPABASE_URL,
                supabaseAnonKey: env.SUPABASE_ANON_KEY,
            }),
            {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": origin, // ✅ Allow only your frontend
                },
            }
        );
    },
};
