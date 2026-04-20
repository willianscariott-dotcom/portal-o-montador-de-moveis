import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);