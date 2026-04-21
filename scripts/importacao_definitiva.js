import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const estadosSigla = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
  'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
  'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
  'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
  'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO',
  'State of Rio Grande do Sul': 'RS', 'State of Santa Catarina': 'SC'
};

function parseCSV(texto) {
  const linhas = texto.split('\n').filter(l => l.trim());
  if (linhas.length === 0) return [];
  
  const primeiraLinha = linhas[0];
  const colunas = [];
  let atual = '';
  let dentroAspas = false;
  
  for (let i = 0; i < primeiraLinha.length; i++) {
    const char = primeiraLinha[i];
    if (char === '"') {
      dentroAspas = !dentroAspas;
    } else if (char === ',' && !dentroAspas) {
      colunas.push(atual.trim());
      atual = '';
    } else {
      atual += char;
    }
  }
  colunas.push(atual.trim());
  
  const dados = [];
  
  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!linha.trim()) continue;
    
    const valores = [];
    atual = '';
    dentroAspas = false;
    
    for (let j = 0; j < linha.length; j++) {
      const char = linha[j];
      if (char === '"') {
        dentroAspas = !dentroAspas;
      } else if (char === ',' && !dentroAspas) {
        valores.push(atual.trim());
        atual = '';
      } else {
        atual += char;
      }
    }
    valores.push(atual.trim());
    
    const obj = {};
    colunas.forEach((h, idx) => {
      obj[h] = valores[idx] || '';
    });
    dados.push(obj);
  }
  return dados;
}

function limparTelefone(tel) {
  if (!tel) return '';
  return tel.replace(/\D/g, '');
}

function gerarAvatar(nome) {
  if (!nome) return '';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=ffb800&color=6b4c00&size=200`;
}

function normalizarNota(nota) {
  if (!nota) return 0;
  const num = parseFloat(String(nota).replace(',', '.'));
  return isNaN(num) ? 0 : num;
}

function normalizarAvaliacoes(qtd) {
  if (!qtd) return 0;
  const num = parseInt(String(qtd).replace(/\D/g, ''));
  return isNaN(num) ? 0 : num;
}

function formatarCidadeEstado(cidade, estado) {
  const cidadeClean = (cidade || '').replace(/"/g, '').trim();
  let estadoSigla = '';
  
  if (estadosSigla[estado]) {
    estadoSigla = estadosSigla[estado];
  } else if ((estado || '').length === 2) {
    estadoSigla = estado.toUpperCase();
  } else {
    estadoSigla = (estado || '').substring(0, 2).toUpperCase();
  }
  
  return `${cidadeClean} - ${estadoSigla}`;
}

async function importarDados() {
  console.log('🔄 Iniciando importação...\n');
  
  console.log('📂 Lendo Montadores_Brasil.csv...');
  const brasilRaw = fs.readFileSync('Montadores_Brasil.csv', 'utf-8');
  const brasilDados = parseCSV(brasilRaw);
  
  console.log('📂 Lendo Montadores_RS.csv...');
  const rsRaw = fs.readFileSync('Montadores_RS.csv', 'utf-8');
  const rsDados = parseCSV(rsRaw);
  
  const todos = [];
  
  for (const row of brasilDados) {
    todos.push({
      nome_completo: row.title || '',
      nota: normalizarNota(row.totalScore),
      avaliacoes: normalizarAvaliacoes(row.reviewsCount),
      cidade_estado: formatarCidadeEstado(row.city, row.state),
      whatsapp: limparTelefone(row.phone)
    });
  }
  
  for (const row of rsDados) {
    todos.push({
      nome_completo: row.name || '',
      nota: normalizarNota(row.rating),
      avaliacoes: normalizarAvaliacoes(row.reviews),
      cidade_estado: formatarCidadeEstado(row.city, row.state),
      whatsapp: limparTelefone(row['company_insights.phone'])
    });
  }
  
  console.log(`\n📊 Total antes deduplicação: ${todos.length}`);
  
  const semDuplicados = todos.filter((item, index, self) => 
    index === self.findIndex(t => 
      t.nome_completo === item.nome_completo && 
      t.cidade_estado === item.cidade_estado
    )
  );
  
  console.log(`📊 Total após deduplicação: ${semDuplicados.length}`);
  console.log(`📊 Removidos duplicados: ${todos.length - semDuplicados.length}\n`);
  
  console.log('🗑️ Limpando tabela existente...');
  await supabase.from('montadores_pendentes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('📤 Inserindo dados no Supabase...\n');
  
  const batchSize = 50;
  let inseridos = 0;
  let erros = 0;
  
  for (let i = 0; i < semDuplicados.length; i += batchSize) {
    const batch = semDuplicados.slice(i, i + batchSize);
    const { error } = await supabase.from('montadores_pendentes').insert(batch);
    
    if (error) {
      erros++;
      console.log(`   Batch ${i/batchSize + 1}: Erro - ${error.message}`);
    } else {
      inseridos += batch.length;
    }
    
    if ((i + batchSize) % 200 === 0 || i + batchSize >= semDuplicados.length) {
      process.stdout.write(`\r   Progresso: ${Math.min(i + batchSize, semDuplicados.length)}/${semDuplicados.length}`);
    }
  }
  
  console.log('\n\n═══════════════════════════════════════════');
  console.log('✅ IMPORTAÇÃO CONCLUÍDA!');
  console.log('═══════════════════════════════════════════');
  console.log(`📊 Montadores importados: ${inseridos}`);
  console.log(`📊 Batches com erro: ${erros}`);
  console.log('═══════════════════════════════════════════');
}

importarDados().catch(console.error);