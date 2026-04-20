import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

// Palavras que NÃO são montagem de móveis
const palavrasSuspicious = [
  'mudança', 'mudancas', 'mudança', 'mudanças',
  'frete', 'fretes', 'transporte', 'transportes',
  'entrega', 'entregas', 'carreto', 'carretos',
  'caminhão', 'caminhao', 'caminhonete',
  'motoboy', 'motofrete',
  'aluguel de', 'alugar',
  'reforma predial', 'reforma geral',
  'construção', 'construcao', 'constru civil',
  'pintura', 'pintor',
  'elétrica', 'eletrica', 'eletricista',
  'hidráulica', 'hidraulica', 'encanador',
  'jardinagem', 'paisagismo',
  'limpeza', 'limpeza pós-obra',
  'desentupimento', 'dedetização',
  'alarme', 'segurança',
  'ar condicionado', 'ar-condicionado', 'instalação de ar',
  'automação', 'automacao',
  'esquadria', 'esquadrias',
  'portão', 'portao automatico',
  'persiana', 'cortina',
  'vidro', 'vidraçaria',
  'gesso', 'drywall',
  'porcelanato', 'piso',
  'azulejo', 'cerâmica',
  'impermeabilização',
  'satelite', 'antena',
  'cuidado com idoso', 'cuidados',
  'domiciliar', 'enfermagem',
  'pets', 'pet shop', 'veterinário',
  'buffet', 'decoração de festa',
  'fotografia', 'filmagem',
  'buffet', 'churrascaria', 'restaurante',
  'taxi', 'uber', 'app',
  'guincho', 'socorro',
  'chaveiro',
  'toldo', 'cobertura',
  'solar', 'energia solar',
  'bombas', 'bombinha',
  'lava jato', 'lavajato',
  'estética', 'estetica', 'salão',
  'cabeleireiro', 'barbearia',
  'turismo', 'viagem',
  'tradutor', 'intérprete',
  'advogado', 'jurídico',
  'contador', 'contabilidade',
  'marketing', 'publicidade',
  'informática', 'informatica', 'ti',
  'web design', 'desenvolvedor',
  'academia', 'fitness',
  'escola', 'curso',
  'consultório', 'clínica',
  'imóvel', 'imoveis', 'imobiliária'
];

// Palavras que SÃO montagem de móveis (isentar)
const isentar = [
  'montador', 'montagem', 'montar', 'monta',
  'marceneiro', 'marcenário', 'carpinteiro', 'carpintaria',
  'reparo', 'reforma', 'manutenção', 'manutencao', 'conserto',
  'instalação', 'instalacao', 'instalar',
  'assistência', 'assistencia',
  'serviço', 'servico', 'serviços', 'servicos',
  'prestação', 'prestacao',
  'planejado', 'sob medida',
  'desmontagem', 'desmontar',
  'conserto', 'reparação',
  'móveis', 'moveis', 'movel'
];

function eSuspicious(nome) {
  if (!nome) return false;
  const nomeLower = nome.toLowerCase();
  
  // Se tem "montador" ou palavras de serviço de móveis, não é suspeito
  const temIsentar = isentar.some(p => nomeLower.includes(p));
  if (temIsentar) return false;
  
  // Verificar se tem palavras suspeitas
  const temSuspicious = palavrasSuspicious.some(p => nomeLower.includes(p));
  return temSuspicious;
}

async function analisar() {
  console.log('=== Buscando Serviços Que Não São Montagem de Móveis ===\n');
  
  const { data, error } = await supabase
    .from('montadores_pendentes')
    .select('id, nome_completo, cidade_estado');

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  console.log(`Total de registros: ${data?.length || 0}\n`);

  const suspicious = [];
  
  for (const registro of data) {
    if (eSuspicious(registro.nome_completo)) {
      suspicious.push({
        id: registro.id,
        nome: registro.nome_completo,
        cidade_estado: registro.cidade_estado
      });
    }
  }

  console.log(`=== RESULTADO ===`);
  console.log(`Serviços identificados (não montagem de móveis): ${suspicious.length}\n`);

  fs.writeFileSync('servicos_nao_montagem.json', JSON.stringify(suspicious, null, 2));
  
  console.log('Arquivo salvo: servicos_nao_montagem.json\n');
  console.log('=== LISTA COMPLETA ===\n');
  
  suspicious.forEach((s, i) => {
    console.log(`${i + 1}. ${s.nome}`);
    console.log(`   📍 ${s.cidade_estado}\n`);
  });
}

analisar().catch(console.error);