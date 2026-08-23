import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://ducwpsyqorxccwovtdmi.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Y3dwc3lxb3J4Y2N3b3Z0ZG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0ODM1MDQsImV4cCI6MjEwMzA1OTUwNH0.hY8VM-oEIoG0Y8feGsxmXNKNuZ7kLGeNBF0PN-g-caU";

const browserKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseAnonKey;

export const supabase = createClient(supabaseUrl, browserKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
