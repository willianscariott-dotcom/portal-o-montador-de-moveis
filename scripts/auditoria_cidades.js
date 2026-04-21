import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const keywordsSuspeitas = [
  'loja', 'lojas', 'store', 'shop', 'atacado', 'atacadão',
  'fabrica', 'fábrica', 'indústria',
  'marcenaria', 'ebanisteria', 'carpintaria',
  ' planejados', 'modulados', 'sob medida',
  'ambientes', 'projetos', 'decoração',
  ' designer', 'design',
  ' reforma', 'manutenção',
  'estofaria', 'estofados', 'sofá', 'poltrona',
  'tapeçaria', 'cortina',
  'limpeza', 'higienização', 'lavagem',
  'marketing', 'instagram', 'whatsapp',
  'youtube', 'facebook', 'tiktok',
  'site', 'www', 'http',
  'online', 'virtual',
  'delivery', 'motoboy',
  'correios', 'frete',
  'aplicativo', 'app',
  ' segur', 'alarme',
  'elevador', 'portão',
  'ferramentas',
  'comercial', 'business',
  ' LTDA', ' EIRELI', ' S/A', ' ME',
];

function verificarLojaSuspeta(nome) {
  const nomeLower = nome.toLowerCase();
  return keywordsSuspeitas.some(keyword => nomeLower.includes(keyword));
}

async function executarAuditoria() {
  console.log('🔍 Baixando registros do banco de dados...\n');
  
  const { data: montadores, error } = await supabase
    .from('montadores_pendentes')
    .select('*');
  
  if (error) {
    console.error('❌ Erro ao buscar dados:', error.message);
    return;
  }
  
  console.log(`📊 Total de registros: ${montadores.length}\n`);
  
  const lojasSuspeitas = [];
  const montadoresReais = [];
  
  for (const m of montadores) {
    if (verificarLojaSuspeta(m.nome_completo)) {
      lojasSuspeitas.push({
        id: m.id,
        nome: m.nome_completo,
        cidade: m.cidade_estado,
        nota: m.nota,
        avaliacoes: m.avaliacoes
      });
    } else {
      montadoresReais.push(m);
    }
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('🔴 LOJAS IDENTIFICADAS (para remover):');
  console.log('═══════════════════════════════════════════════════');
  
  if (lojasSuspeitas.length === 0) {
    console.log('Nenhuma loja identificada.\n');
  } else {
    console.log(`Total: ${lojasSuspeitas.length}\n`);
    for (const loja of lojasSuspeitas) {
      console.log(`  - ${loja.nome} (${loja.cidade})`);
    }
    console.log();
  }
  
  fs.writeFileSync(
    './lojas_para_remover.json',
    JSON.stringify(lojasSuspeitas, null, 2)
  );
  console.log('💾 Salvo em lojas_para_remover.json\n');
  
  const porCidade = {};
  for (const m of montadoresReais) {
    const key = m.cidade_estado || 'NÃO INFORMADO';
    if (!porCidade[key]) porCidade[key] = [];
    porCidade[key].push(m);
  }
  
  const cidadesVazias = [];
  for (const [cidade, lista] of Object.entries(porCidade)) {
    if (lista.length === 0) {
      cidadesVazias.push(cidade);
    }
  }
  
  console.log('═══════════════════════════════════════════════════');
  console.log('📍 CIDADES COM MONTADORES REAIS:');
  console.log('═══════════════════════════════════════════��═══════');
  
  const cidadesOrdenadas = Object.entries(porCidade).sort((a, b) => b[1].length - a[1].length);
  for (const [cidade, lista] of cidadesOrdenadas) {
    if (lista.length > 0) {
      console.log(`  ${cidade}: ${lista.length} montador(es)`);
    }
  }
  console.log();
  
  fs.writeFileSync(
    './cidades_vazias.json',
    JSON.stringify(cidadesVazias, null, 2)
  );
  console.log('💾 Salvo em cidades_vazias.json\n');
  
  console.log('═══════════════════════════════════════════════════');
  console.log('📋 RESUMO FINAL:');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Lojas para remover: ${lojasSuspeitas.length}`);
  console.log(`  Montadores reais: ${montadoresReais.length}`);
  console.log(`  Cidades com montadores: ${Object.keys(porCidade).filter(k => porCidade[k].length > 0).length}`);
  console.log(`  Cidades vazias: ${cidadesVazias.length}`);
  console.log();
  console.log('Revise os arquivos antes de executar a exclusão real!');

  if (process.argv.includes('--executar')) {
    console.log('\n⚠️ EXECUTANDO EXCLUSÃO DAS LOJAS...\n');
    
    const idsParaRemover = lojasSuspeitas.map(l => l.id);
    console.log(`Removendo ${idsParaRemover.length} registros...`);
    
    const { error: deleteError } = await supabase
      .from('montadores_pendentes')
      .delete()
      .in('id', idsParaRemover);
    
    if (deleteError) {
      console.error('❌ Erro ao excluir:', deleteError.message);
    } else {
      console.log('✅ Exclusão concluída com sucesso!');
    }
  }
}

executarAuditoria().catch(console.error);