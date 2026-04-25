import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const data22 = new Date('2026-04-22T00:00:00Z');

async function main() {
  const { data, error } = await supabase
    .from('montadores_pendentes')
    .select('nome_completo, cidade_estado, whatsapp, data_cadastro, link_google_empresas, nota, avaliacoes')
    .gte('data_cadastro', data22.toISOString())
    .order('data_cadastro', { ascending: false });

  if (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }

  console.log(`Total: ${data.length} montadores\n`);
  data.forEach((m, i) => {
    console.log(`${i + 1}. ${m.nome_completo}`);
    console.log(`   Cidade: ${m.cidade_estado}`);
    console.log(`   WhatsApp: ${m.whatsapp}`);
    console.log(`   Data: ${m.data_cadastro}`);
    console.log(`   Google: ${m.link_google_empresas || 'N/A'}`);
    console.log(`   Nota: ${m.nota}, Avaliações: ${m.avaliacoes}`);
    console.log('');
  });
}

main();