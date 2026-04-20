import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testarConexao() {
  console.log('=== Testando conexão com Supabase ===\n');
  
  // Teste 1: Verificar quantos registros existem
  const { count, error: errorCount } = await supabase
    .from('montadores_pendentes')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Total de registros na tabela: ${count}`);
  console.log(`Erro: ${errorCount?.message || 'Nenhum'}`);
  
  // Teste 2: Buscar alguns registros mesmo que seja 0
  const { data, error } = await supabase
    .from('montadores_pendentes')
    .select('id, nome_completo')
    .limit(5);
  
  console.log(`\nDados retornados: ${data?.length || 0}`);
  if (data && data.length > 0) {
    console.log('Primeiros registros:', data);
  }
}

testarConexao();