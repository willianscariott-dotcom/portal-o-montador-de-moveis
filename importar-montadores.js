import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import Papa from 'papaparse';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CSV_FILE = './novos-montadores.csv';
const BATCH_SIZE = 50;

async function processarRegistros(registros) {
  return registros.map(r => {
    const linkGoogle = r.link_google_empresas;
    
    const totalScore = (!linkGoogle || linkGoogle === '' || linkGoogle === null || linkGoogle === undefined) 
      ? 5 
      : (r.totalScore || r.total_score || r.nota || r.nota_media || 5);
    
    const reviewsCount = (!linkGoogle || linkGoogle === '' || linkGoogle === null || linkGoogle === undefined) 
      ? 1 
      : (r.reviewsCount || r.reviews_count || r.quantidade_avaliacoes || r.qtd_avaliacoes || 0);
    
    return {
      nome_completo: r.nome_completo || r.nome || r.name,
      whatsapp: r.whatsapp || r.telefone || r.phone,
      cidade_estado: r.cidade_estado || r.cidade || `${r.cidade}-${r.estado}`,
      link_google_empresas: linkGoogle || null,
      totalScore: parseFloat(totalScore) || 5,
      reviewsCount: parseInt(reviewsCount) || 0,
      status: 'pendente'
    };
  });
}

async function importar() {
  console.log('🚀 Importador de Montadores\n');
  console.log('===========================\n');

  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ Arquivo '${CSV_FILE}' não encontrado!`);
    console.log('   Crie o arquivo com os dados e tente novamente.');
    process.exit(1);
  }

  console.log(`📂 Lendo arquivo: ${CSV_FILE}`);
  
  const fileContent = fs.readFileSync(CSV_FILE, 'utf8');
  
  const { data: registros, errors: parseErrors } = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim()
  });

  if (parseErrors?.length) {
    console.error('❌ Erro ao parsear CSV:', parseErrors);
    process.exit(1);
  }

  if (!registros || registros.length === 0) {
    console.error('❌ Nenhum registro encontrado no CSV!');
    process.exit(1);
  }

  console.log(`   ✓ ${registros.length} registros encontrados`);

  const montadoresProcessados = await processarRegistros(registros);

  console.log('\n📊 Processando registros...');

  const comLink = montadoresProcessados.filter(m => m.link_google_empresas).length;
  const semLink = montadoresProcessados.filter(m => !m.link_google_empresas).length;

  console.log(`   - Com link do Google: ${comLink}`);
  console.log(`   - Sem link do Google: ${semLink}`);
  console.log(`     (Serão assignados nota=5 e avaliações=1)`);

  console.log('\n📤 Inserindo em lote no Supabase...');

  let inseridos = 0;
  let erros = 0;

  for (let i = 0; i < montadoresProcessados.length; i += BATCH_SIZE) {
    const batch = montadoresProcessados.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(montadoresProcessados.length / BATCH_SIZE);

    console.log(`   Batch ${batchNum}/${totalBatches}: ${batch.length} registros...`);

    const { error } = await supabase
      .from('montadores_pendentes')
      .insert(batch);

    if (error) {
      console.error(`   ❌ Erro no batch ${batchNum}:`, error.message);
      erros += batch.length;
    } else {
      inseridos += batch.length;
      console.log(`      ✓ ${batch.length} inseridos`);
    }
  }

  console.log('\n===========================');
  console.log('✅ Importação concluída!');
  console.log(`   Total processado: ${montadoresProcessados.length}`);
  console.log(`   Inseridos com sucesso: ${inseridos}`);
  console.log(`   Erros: ${erros}`);
  console.log('===========================\n');
}

importar().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});