import { createClient } from "@supabase/supabase-js";

// anon public url/key
const supabaseUrl = "https://flgjxepsxnqkdlfiwded.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsZ2p4ZXBzeG5xa2RsZml3ZGVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4Njc3OTIsImV4cCI6MjA1ODQ0Mzc5Mn0.mXcK4aWDuTBlm2TEITMeZEjXIVyFQhf28xjrYO2sMUw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
