import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://houyownfnnqgvhiokwow.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdXlvd25mbm5xZ3ZoaW9rd293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNTYxODUsImV4cCI6MjA5OTYzMjE4NX0.BiXbDUEdQrRtkL0tqVh5TCImQO6Sj2MzoCi1B2nz_54";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  realtime: { params: { eventsPerSecond: 12 } }
});

export const HCAPTCHA_SITE_KEY = "49706c84-5204-4b7e-b354-bade97e653ba";
export const HCAPTCHA_HOST = "cptspacedust-info.onrender.com";
