import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://zjqgwkttdnvkfxnjumzg.supabase.co";

const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcWd3a3R0ZG52a2Z4bmp1bXpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNjQxNTUsImV4cCI6MjA4ODg0MDE1NX0.OfcI5HMSBTtDCKakCzqNtdOHx8ik8YD3om76-E0X_os";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);