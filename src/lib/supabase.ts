import { createClient } from "@supabase/supabase-js";

let supabase: ReturnType<typeof createClient> | null = null;

interface SupabaseConfig {
    supabaseUrl: string;
    supabaseAnonKey: string;
}
export const getSupabaseClient = async () => {
    if (!supabase) {
        if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
            supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
        } else {
            const res = await fetch("https://lineups.nicolasvlavianos.workers.dev");
            const text = await res.text(); // This will give you the raw text of the response
            console.log("Raw Response:", text);
            console.log("Response Status:", res.status);
            console.log("Response Headers:", res.headers);


            const { supabaseUrl, supabaseAnonKey } = await res.json() as SupabaseConfig;

            supabase = createClient(supabaseUrl, supabaseAnonKey);
        }
    }
    return supabase;
};
