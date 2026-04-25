// /Users/mac/Desktop/PIDI/supabaseClient.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// IMPORTANT: In a real production environment, these keys should be loaded from environment variables
// (e.g., process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY) and ideally proxied through a backend
// to prevent direct exposure in client-side code. For this exercise, they are placed here.
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Replace with your Supabase Project URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your Supabase Public Anon Key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);