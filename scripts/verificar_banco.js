import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verificar() {
  console.log('=== Verificação Final dos Registros ===\n');
  
  const { data, error } = await supabase
    .from('montadores_pendentes')
    .select('id, nome_completo, cidade_estado');

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  console.log(`Total de registros: ${data.length}\n`);
  
  // Mostrar primeiros 30 registros como amostra
  console.log('=== AMOSTRA DOS PRIMEIROS 30 REGISTROS ===\n');
  
  data.slice(0, 30).forEach((r, i) => {
    console.log(`${i + 1}. ${r.nome_completo}`);
    console.log(`   📍 ${r.cidade_estado}\n`);
  });
  
  // Contar por estado
  console.log('\n=== REGISTROS POR ESTADO ===\n');
  const porEstado = {};
  data.forEach(r => {
    const estado = r.cidade_estado?.split(' - ')[1] || 'Desconhecido';
    porEstado[estado] = (porEstado[estado] || 0) + 1;
  });
  
  Object.entries(porEstado).sort((a, b) => b[1] - a[1]).forEach(([estado, qtd]) => {
    console.log(`${estado}: ${qtd}`);
  });
}

verificar().catch(console.error);