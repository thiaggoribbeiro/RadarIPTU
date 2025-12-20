import { createClient } from '@supabase/supabase-js';

// Supabase configuration - IDs obtained via MCP
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://aqwuxqfsxnzfyhvjvugu.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFxd3V4cWZzeG56Znlodmp2dWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyMTA5MTgsImV4cCI6MjA4MTc4NjkxOH0.YyR9T2DS5vgbIVid1mb7dAqXgh_a8TRnJPqGrfzlOb0';

// Inicialização do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
