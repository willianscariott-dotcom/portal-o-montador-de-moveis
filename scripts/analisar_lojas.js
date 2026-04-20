import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Palavras que indicam COMÉRCIO/LOJA - não montador
const palavrasComercio = [
  'loja', 'lojas', 'atacadão', 'atacado', 'outlet', 'shopping', 'galeria',
  'marcenaria', 'serraria', 'marmoraria', 'estofaria', 'moveisplanejados',
  'fábrica', 'fabrica', 'industria', 'indústria', 'armazen', 'armazém', 'deposito', 'depósito',
  'comercial', 'varejo', 'atacado', 'multimarcas', 'megastore', 'lojas'
];

// Palavras que +provavelmente+ são montadores (para excluir)
const positivo = [
  'montador', 'montagem', 'montar', 'monta', 'assistência', 'assistencia',
  'reparo', 'reforma', 'manutenção', 'manutencao', 'conserto', 'instalação', 'instalacao',
  'serviço', 'servico', 'serviços', 'servicos', 'prestação', 'prestacao',
  'marceneiro', 'marcenário', 'carpinteiro', 'carpintaria'
];

// Exceções - palavras que parecem comércio mas podem ser montador
const excecoes = ['marceneiro', 'marcenário', 'carpinteiro'];

function eComercioOuLoja(nome) {
  if (!nome) return false;
  const nomeLower = nome.toLowerCase();
  
  // Se tem "montador" ou palavras claramente de serviço, NÃO é comércio
  const temMontador = positivo.some(p => nomeLower.includes(p));
  if (temMontador) return false;
  
  // Verificar se é uma exceção (marceneiro, etc)
  const temExcecao = excecoes.some(p => nomeLower.includes(p));
  if (temExcecao) return false;
  
  // Verificar se tem palavras de comércio
  const temComercio = palavrasComercio.some(p => nomeLower.includes(p));
  if (temComercio) return true;
  
  // Regra: se tem "móveis" ou "moveis" mas NÃO tem "montador" nem "serviço"
  const temMoveis = nomeLower.includes('móveis') || nomeLower.includes('moveis');
  const temServico = nomeLower.includes('serviço') || nomeLower.includes('servico');
  if (temMoveis && !temServico && !temMontador) {
    return true;
  }
  
  return false;
}

async function analisar() {
  console.log('=== Análise de Lojas/Comecios (Filtro Estricto) ===\n');
  
  const { data, error } = await supabase
    .from('montadores_pendentes')
    .select('id, nome_completo, cidade_estado');

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  console.log(`Total de registros: ${data?.length || 0}\n`);

  const somenteLojas = [];
  const montadoresReais = [];
  
  for (const registro of data) {
    if (eComercioOuLoja(registro.nome_completo)) {
      somenteLojas.push({
        id: registro.id,
        nome: registro.nome_completo,
        cidade_estado: registro.cidade_estado
      });
    } else {
      montadoresReais.push(registro.id);
    }
  }

  console.log(`=== RESULTADO ===`);
  console.log(`Total de registros: ${data.length}`);
  console.log(`Lojas/Comercios identificados: ${somenteLojas.length}`);
  console.log(`Montadores (prováveis): ${montadoresReais.length}\n`);

  // Salvar lista de lojas para deletar
  fs.writeFileSync('possiveis_lojas_remover.json', JSON.stringify(somenteLojas, null, 2));
  
  console.log('Arquivo salvo: possiveis_lojas_remover.json');
  console.log('\n=== PRIMEIRAS 20 LOJAS/COMÉRCIOS IDENTIFICADOS ===\n');
  
  somenteLojas.slice(0, 20).forEach((s, i) => {
    console.log(`${i + 1}. ${s.nome}`);
    console.log(`   📍 ${s.cidade_estado}\n`);
  });
  
  if (somenteLojas.length > 20) {
    console.log(`... e mais ${somenteLojas.length - 20} registros`);
  }
}

analisar().catch(console.error);