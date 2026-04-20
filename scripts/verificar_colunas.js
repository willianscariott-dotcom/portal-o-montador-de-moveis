import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificar() {
  const { data, error } = await supabase
    .from('montadores_pendentes')
    .select('nome_completo, telefone, foto_url, nota, avaliacoes, cidade_estado')
    .limit(5);

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  console.log('=== Verificando colunas ===\n');
  data.forEach(r => {
    console.log(`Nome: ${r.nome_completo}`);
    console.log(`Telefone: ${r.telefone}`);
    console.log(`Foto: ${r.foto_url}`);
    console.log(`Nota: ${r.nota}`);
    console.log(`Avaliações: ${r.avaliacoes}`);
    console.log(`Cidade: ${r.cidade_estado}`);
    console.log('---');
  });
}

verificar().catch(console.error);