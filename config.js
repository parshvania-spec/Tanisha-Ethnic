'use strict';

const SUPABASE_URL = 'https://yeoccpkjhpgtmfsrabxy.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_rlhJUBPorEKqKLUgClj30Q_7EhBXUEd';

const SUPABASE_PROJECT_ID = 'yeoccpkjhpgtmfsrabxy';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
