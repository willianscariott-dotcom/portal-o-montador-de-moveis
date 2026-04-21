import fs from 'fs';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

function limparTelefone(tel) {
  return tel ? tel.replace(/\D/g, '') : '';
}

async function debug() {
  const content = fs.readFileSync('Montadores.csv', 'utf-8');
  const result = Papa.parse(content, { header: true });
  const registros = result.data;

  const primeiro = registros[0];
  console.log('CSV phone:', primeiro.phone);
  console.log('CSV cleaned:', limparTelefone(primeiro.phone));
  console.log('CSV nota:', primeiro.totalScore);
  console.log('CSV avaliacoes:', primeiro.reviewsCount);

  const { data } = await supabase
    .from('montadores_pendentes')
    .select('id, whatsapp, nome_completo')
    .limit(5);

  console.log('\nDB phones:');
  data.forEach(d => console.log(d.whatsapp));
}

debug().catch(console.error);