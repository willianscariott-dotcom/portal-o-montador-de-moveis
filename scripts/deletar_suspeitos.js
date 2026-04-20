import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deletar() {
  console.log('=== Deletando Registros Suspeitos ===\n');
  
  const suspeitos = JSON.parse(fs.readFileSync('restantes_suspeitos.json', 'utf-8'));
  const ids = suspeitos.map(s => s.id);
  
  console.log(`Total para deletar: ${ids.length}\n`);
  
  const { error } = await supabase
    .from('montadores_pendentes')
    .delete()
    .in('id', ids);
  
  if (error) {
    console.error('Erro:', error.message);
  } else {
    console.log(`✅ ${ids.length} registros deletados\n`);
  }
  
  const { count } = await supabase
    .from('montadores_pendentes')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Registros restantes no banco: ${count}`);
}

deletar().catch(console.error);