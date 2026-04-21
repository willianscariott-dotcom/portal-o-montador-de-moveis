const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const stateMap = {
  'State of Rio Grande do Sul': 'RS',
  'State of Espírito Santo': 'ES',
  'State of Paraná': 'PR',
  'State of São Paulo': 'SP',
  'State of Minas Gerais': 'MG',
  'State of Santa Catarina': 'SC',
  'State of Rio de Janeiro': 'RJ',
  'State of Bahia': 'BA',
  'State of Ceará': 'CE',
  'State of Pernambuco': 'PE',
  'State of Pará': 'PA',
  'State of Amazonas': 'AM',
  'State of Maranhão': 'MA',
  'State of Goiás': 'GO',
  'State of Mato Grosso': 'MT',
  'State of Mato Grosso do Sul': 'MS',
  'State of Alagoas': 'AL',
  'State of Sergipe': 'SE',
  'State of Paraíba': 'PB',
  'State of Piauí': 'PI',
  'State of Rio Grande do Norte': 'RN',
  'State of Rondônia': 'RO',
  'State of Acre': 'AC',
  'State of Amapá': 'AP',
  'State of Roraima': 'RR',
  'State of Tocantins': 'TO',
  'State of Distrito Federal': 'DF'
};

function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  return '+' + digits;
}

function normalizeName(name, county) {
  const lowerName = name.toLowerCase().trim();
  
  const isGeneric = lowerName === 'montador de móveis' || 
    lowerName === 'montador de moveis' || 
    lowerName.startsWith('montador de móveis') ||
    lowerName.startsWith('montador de moveis') ||
    lowerName.includes('montagem de móveis') ||
    lowerName.includes('montagem de moveis');
  
  if (isGeneric) {
    if (county) {
      return `Montador ${county}`;
    }
    return name;
  }
  
  return name;
}

async function importCSV() {
  const csv = fs.readFileSync('./montadores_novo.csv', 'utf-8');
  const lines = csv.split('\n').slice(1);
  
  const records = [];
  const seenPhones = new Set();
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    const cols = line.split(',');
    if (cols.length < 4) continue;
    
    const name = cols[0].replace(/"/g, '').trim();
    const phoneRaw = cols[1].replace(/"/g, '').trim();
    const county = cols[4]?.replace(/"/g, '').trim() || '';
    const city = cols[3].replace(/"/g, '').trim();
    const state = cols[5].replace(/"/g, '').trim();
    
    const phone = formatPhone(phoneRaw);
    
    if (seenPhones.has(phone)) {
      console.log('DUPLICATE SKIP:', phone, name);
      continue;
    }
    seenPhones.add(phone);
    
    const stateSigla = stateMap[state] || state.replace('State of ', '');
    const nomeFormatado = normalizeName(name, county);
    const cidadeEstado = `${city} - ${stateSigla}`;
    
    records.push({
      nome_completo: nomeFormatado,
      whatsapp: phone,
      cidade_estado: cidadeEstado,
      link_google_empresas: '',
      data_cadastro: new Date().toISOString(),
      nota: 5,
      avaliacoes: 0
    });
  }
  
  console.log('Total records to insert:', records.length);
  console.log('Unique phones:', seenPhones.size);
  console.log('Sample records:');
  records.slice(0, 5).forEach(r => console.log(r));
  
  const { error } = await supabase.from('montadores_pendentes').insert(records);
  
  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Successfully inserted', records.length, 'records!');
  }
}

importCSV().catch(console.error);