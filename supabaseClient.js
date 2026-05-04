// /Users/mac/Desktop/PIDI/supabaseClient.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Secure config loading strategy:
// - Create a local file at `supabase/supabase.config.js` (not committed to git) that sets
//   `window.SUPABASE_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY }`.
// - This file is ignored by .gitignore (see repo .gitignore entry).
// - For production, prefer server-side environment variables or a backend proxy for any
//   operation that requires elevated privileges (service_role key).

// Read config exposed on window by an optional script tag (see dashboard.html for where to include it)
const cfg = (typeof window !== 'undefined' && window.SUPABASE_CONFIG) ? window.SUPABASE_CONFIG : null;

const SUPABASE_URL = cfg?.SUPABASE_URL || 'https://wamtgsqxhapgxnlvxvez.supabase.co';
const SUPABASE_ANON_KEY = cfg?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhbXRnc3F4aGFwZ3hubHZ4dmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NTQ0NjcsImV4cCI6MjA5MzIzMDQ2N30.-BxFkAZlEPigJ5GNiKs-i2Kf4cpgvwDt2Srh9OQ4gWY';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
	console.warn('[supabaseClient] SUPABASE_URL or SUPABASE_ANON_KEY not found.\n' +
		'Create a local file at supabase/supabase.config.js that sets window.SUPABASE_CONFIG = { SUPABASE_URL, SUPABASE_ANON_KEY };\n' +
		'Example available at supabase/supabase.config.example.js (DO NOT commit your real keys).');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);