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
  'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
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

const resultados = [];

fs.createReadStream('Montadores.csv')
  .pipe(csv())
  .on('data', (data) => resultados.push(data))
  .on('end', async () => {
    console.log(`Total de linhas no CSV: ${resultados.length}`);

    let inseridos = 0;
    let ignorados = 0;

    for (const linha of resultados) {
      const nome = linha.title?.trim();
      const telefone = linha.phone?.trim();
      const cidade = linha.city?.trim();
      const estado = linha.state?.trim();
      const totalScore = linha.totalScore;
      const reviewsCount = linha.reviewsCount;

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

      const dados = {
        nome_completo: nome,
        whatsapp: telefone,
        cidade_estado: cidadeEstado,
        link_google_empresas: linha.website || null
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
    console.log(`Total processados: ${resultados.length}`);
    console.log(`Inseridos: ${inseridos}`);
    console.log(`Ignorados: ${ignorados}`);
    console.log(`================\n`);
  });