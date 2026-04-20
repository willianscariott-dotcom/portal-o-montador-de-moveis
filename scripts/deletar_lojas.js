import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deletarLojas() {
  console.log('=== Deletando Lojas/Comércios ===\n');
  
  // Carregar lista de IDs para deletar
  const lojas = JSON.parse(fs.readFileSync('possiveis_lojas_remover.json', 'utf-8'));
  const ids = lojas.map(l => l.id);
  
  console.log(`Total de registros para deletar: ${ids.length}\n`);
  
  // Deletar em lotes
  const tamanhoLote = 100;
  let deletados = 0;
  let erros = 0;
  
  for (let i = 0; i < ids.length; i += tamanhoLote) {
    const lote = ids.slice(i, i + tamanhoLote);
    
    const { error } = await supabase
      .from('montadores_pendentes')
      .delete()
      .in('id', lote);
    
    if (error) {
      console.error(`Erro no lote ${Math.floor(i/tamanhoLote) + 1}:`, error.message);
      erros += lote.length;
    } else {
      deletados += lote.length;
      console.log(`Lote ${Math.floor(i/tamanhoLote) + 1}: ${lote.length} deletados`);
    }
  }
  
  console.log(`\n=== RESUMO ===`);
  console.log(`Total deletado: ${deletados}`);
  console.log(`Erros: ${erros}`);
  
  // Verificar quantos sobraram
  const { count } = await supabase
    .from('montadores_pendentes')
    .select('*', { count: 'exact', head: true });
  
  console.log(`Registros restantes no banco: ${count}`);
}

deletarLojas().catch(console.error);