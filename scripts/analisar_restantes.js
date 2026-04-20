import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

const maisSuspicious = [
  'mudança', 'mudancas', 'frete', 'fretes', 'transporte', 'carreto',
  'pintura', 'pintor', 'elétrica', 'eletrica', 'eletricista',
  'construção', 'construcao', 'hidraulica', 'encanador',
  'imóvel', 'imoveis', 'imobiliária', 'imobiliaria',
  'esquadria', 'vidro', 'vidraçaria', 'gesso', 'drywall',
  'ar condicionado', 'alarme', 'portão automatico',
  'jardinagem', 'paisagismo', 'limpeza',
  'buffet', 'decoração', 'fotografia',
  'veterinário', 'pet shop', 'pets',
  'academia', 'fitness', 'escola', 'curso',
  'consultorio', 'clinica', 'salão', 'cabeleireiro',
  'turismo', 'viagem', 'tradutor',
  'advogado', 'contador', 'marketing',
  'chaveiro', 'guincho', 'lava jato',
  'estética', 'banco', 'financeira'
];

const positivo = [
  'montador', 'montagem', 'montar', 'marceneiro', 'carpinteiro',
  'reparo', 'reforma', 'manutenção', 'conserto', 'instalação',
  'assistência', 'serviço', 'servico', 'planejado', 'sob medida',
  'desmontagem', 'móveis', 'moveis', 'movel'
];

function analisarNome(nome) {
  if (!nome) return { suspeito: false, motivos: [] };
  const nomeLower = nome.toLowerCase();
  const motivos = [];
  
  // Verificar se é claramente um montador
  const temPositivo = positivo.some(p => nomeLower.includes(p));
  if (temPositivo) return { suspeito: false, motivos: [] };
  
  // Verificar palavras suspeitas
  for (const p of maisSuspicious) {
    if (nomeLower.includes(p)) {
      motivos.push(p);
    }
  }
  
  // Se não tem "móveis" nem "montador", é suspeito
  const temMoveis = nomeLower.includes('móveis') || nomeLower.includes('moveis');
  if (!temMoveis && !nomeLower.includes('mont')) {
    motivos.push('não relacionado a móveis');
  }
  
  return { suspeito: motivos.length > 0, motivos };
}

async function analisar() {
  console.log('=== Análise Final do Banco de Dados ===\n');
  
  const { data, error } = await supabase
    .from('montadores_pendentes')
    .select('id, nome_completo, cidade_estado');

  if (error) {
    console.error('Erro:', error.message);
    return;
  }

  console.log(`Total de registros restantes: ${data.length}\n`);

  const restantes = [];
  
  for (const registro of data) {
    const { suspeito, motivos } = analisarNome(registro.nome_completo);
    if (suspeito) {
      restantes.push({
        id: registro.id,
        nome: registro.nome_completo,
        cidade_estado: registro.cidade_estado,
        motivos: motivos
      });
    }
  }

  console.log(`=== RESULTADO ===`);
  console.log(`Total analisado: ${data.length}`);
  console.log(`Registros suspeitos restantes: ${restantes.length}\n`);

  fs.writeFileSync('restantes_suspeitos.json', JSON.stringify(restantes, null, 2));
  
  console.log('Arquivo salvo: restantes_suspeitos.json\n');
  console.log('=== REGISTROS SUSPEITOS ===\n');
  
  restantes.forEach((s, i) => {
    console.log(`${i + 1}. ${s.nome}`);
    console.log(`   📍 ${s.cidade_estado}`);
    console.log(`   ⚠️ Motivos: ${s.motivos.join(', ')}\n`);
  });
}

analisar().catch(console.error);