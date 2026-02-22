import { createClient } from '@supabase/supabase-js';

// WARNING: Checks for service role key. Ensure this is set in Netlify Environment Variables.
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl) {
    console.error('Missing VITE_SUPABASE_URL');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});
