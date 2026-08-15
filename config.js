'use strict';
const SUPABASE_URL = 'https://yeoccpkjhpgtmfsrabxy.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_dAnb4fSaI_BI_UZ9gXX9aA_i0zxXqj3';
const SUPABASE_PROJECT_ID = 'cxydymcjgxgcdqgltnii';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
