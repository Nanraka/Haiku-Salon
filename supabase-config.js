// Supabaseの接続設定
const SUPABASE_URL = "https://xdedsfixpbillcbhiact.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Qw6QKi9j8DluJga7huMEeg_ptRPslK0";

window.haikuSupabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);