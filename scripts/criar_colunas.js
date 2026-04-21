import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function adicionarColunas() {
  console.log('Adicionando colunas nota e avaliacoes...');
  
  await supabase.rpc('exec_sql', { 
    sql: 'ALTER TABLE montadores_pendentes ADD COLUMN IF NOT EXISTS nota numeric DEFAULT 0;' 
  });
  
  await supabase.rpc('exec_sql', { 
    sql: 'ALTER TABLE montadores_pendentes ADD COLUMN IF NOT EXISTS avaliacoes integer DEFAULT 0;' 
  });
  
  console.log('Colunas criadas!');
}

adicionarColunas().catch(console.error);