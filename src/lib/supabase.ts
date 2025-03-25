import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Env } from '@/lib/worker';

// Factory function to create Supabase client using environment variables
export default function getSupabase(env: Env): SupabaseClient {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}