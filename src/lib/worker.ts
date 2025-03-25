import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ExecutionContext } from '@cloudflare/workers-types';

export interface Env {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
}

let supabase: SupabaseClient | null = null;
let listeners: (() => void)[] = []; // Store functions to re-run when supabase updates

// Function to notify subscribers
const notifyListeners = () => {
    listeners.forEach((callback) => callback());
};

// Allow external components to subscribe to changes
export const onSupabaseChange = (callback: () => void) => {
    listeners.push(callback);
};

export default {
    async fetch(_: Request, env: Env, __: ExecutionContext): Promise<Response> {
        console.log("LOG", env);

        if (!supabase) {
            supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
            notifyListeners(); // Notify subscribers that supabase is ready
        }

        // Your complex async logic here (like querying Supabase)
        const { data, error } = await supabase.from('players').select('*');

        if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};

addEventListener('fetch', (event: Event) => {
    const fetchEvent = event as FetchEvent; // Type assertion to FetchEvent
    // Call your complex fetch method here, not handleRequest
    fetchEvent.respondWith(fetch(fetchEvent.request)); // You can directly use `fetch` here
});

let response_promise = fetch("https://lineups.nicolasvlavianos.workers.dev/*");

console.log(response_promise);

// Export the supabase reference
export { supabase };
