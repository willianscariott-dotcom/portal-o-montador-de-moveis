import fs from 'fs';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

const estadosSigla = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
  'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 'Espírito Santo': 'ES',
  'Goiás': 'GO', 'Maranhão': 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG', 'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR',
  'Pernambuco': 'PE', 'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR', 'Santa Catarina': 'SC',
  'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO',
  'State of Acre': 'AC', 'State of Alagoas': 'AL', 'State of Amapá': 'AP', 'State of Amazonas': 'AM',
  'State of Bahia': 'BA', 'State of Ceará': 'CE', 'State of Distrito Federal': 'DF', 'State of Espírito Santo': 'ES',
  'State of Goiás': 'GO', 'State of Maranhão': 'MA', 'State of Mato Grosso': 'MT', 'State of Mato Grosso do Sul': 'MS',
  'State of Minas Gerais': 'MG', 'State of Pará': 'PA', 'State of Paraíba': 'PB', 'State of Paraná': 'PR',
  'State of Pernambuco': 'PE', 'State of Piauí': 'PI', 'State of Rio de Janeiro': 'RJ', 'State of Rio Grande do Norte': 'RN',
  'State of Rio Grande do Sul': 'RS', 'State of Rondônia': 'RO', 'State of Roraima': 'RR', 'State of Santa Catarina': 'SC',
  'State of São Paulo': 'SP', 'State of Sergipe': 'SE', 'State of Tocantins': 'TO'
};

function obterSiglaEstado(estado) {
  if (!estado) return null;
  const estadoTrimmed = estado.trim();
  if (estadosSigla[estadoTrimmed]) {
    return estadosSigla[estadoTrimmed];
  }
  if (estadoTrimmed.length === 2 && /^[A-Z]{2}$/.test(estadoTrimmed.toUpperCase())) {
    return estadoTrimmed.toUpperCase();
  }
  return null;
}

function gerarAvatarUrl(nome) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=004E98&color=fff`;
}

function processarArquivo(nomeArquivo) {
  return new Promise((resolve, reject) => {
    const resultados = [];
    fs.createReadStream(nomeArquivo)
      .pipe(csv())
      .on('data', (data) => resultados.push(data))
      .on('end', () => resolve(resultados))
      .on('error', reject);
  });
}

async function main() {
  console.log('Processando arquivos CSV do RS...\n');

  const dados1 = await processarArquivo('Montadores_RS_1.csv');
  const dados2 = await processarArquivo('Montadores_RS_2.csv');

  const todosDados = [...dados1, ...dados2];
  console.log(`Total de linhas: ${todosDados.length}`);

  let inseridos = 0;
  let ignorados = 0;

  for (const linha of todosDados) {
    const nome = linha.name?.trim();
    const telefone = linha.phone?.trim();
    const cidade = linha.city?.trim();
    const estado = linha.state?.trim();
    const rating = linha.rating;
    const reviews = linha.reviews;
    const website = linha.website?.trim();

    if (!telefone || !nome) {
      console.log(`Ignorado (sem telefone ou nome): ${nome || 'sem nome'}`);
      ignorados++;
      continue;
    }

    const siglaEstado = obterSiglaEstado(estado);
    
    if (!cidade || !siglaEstado) {
      console.log(`Ignorado (sem cidade ou estado): ${nome}`);
      ignorados++;
      continue;
    }

    const cidadeEstado = `${cidade} - ${siglaEstado}`;
    const fotoUrl = gerarAvatarUrl(nome);

    const dados = {
      nome_completo: nome,
      whatsapp: telefone,
      cidade_estado: cidadeEstado,
      link_google_empresas: website || null
    };

    const { error } = await supabase
      .from('montadores_pendentes')
      .insert([dados]);

    if (error) {
      console.log(`Erro ao inserir ${nome}:`, error.message);
    } else {
      console.log(`Inserido: ${nome} - ${cidadeEstado}`);
      inseridos++;
    }
  }

  console.log(`\n=== RESUMO ===`);
  console.log(`Total processados: ${todosDados.length}`);
  console.log(`Inseridos: ${inseridos}`);
  console.log(`Ignorados: ${ignorados}`);
  console.log(`================\n`);
}

main().catch(console.error);