// /Users/mac/Desktop/PIDI/supabaseClient.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// IMPORTANT: In a real production environment, these keys should be loaded from environment variables
// (e.g., process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY) and ideally proxied through a backend
// to prevent direct exposure in client-side code. For this exercise, they are placed here.
const SUPABASE_URL = 'https://yiwxsxbnivlsshtmysey.supabase.co'; // Replace with your Supabase Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlpd3hzeGJuaXZsc3NodG15c2V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMDYzOTUsImV4cCI6MjA5MjY4MjM5NX0.8OeJD95K011qmCe2rnONv46L84kY6TStBwwVHdoYl0o'; // Replace with your Supabase Public Anon Key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);