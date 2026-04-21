import fs from 'fs';
import Papa from 'papaparse';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseKey);

const files = ['Montadores.csv', 'Montadores_RS_1.csv', 'Montadores_RS_2.csv'];

function limparTelefone(tel) {
  if (!tel) return '';
  return tel.replace(/\D/g, '');
}

function telefoneMatches(dbPhone, csvPhone) {
  const db = limparTelefone(dbPhone);
  const csv = limparTelefone(csvPhone);
  return db.includes(csv) || csv.includes(db);
}

async function processar() {
  console.log('=== Corrigindo Notas e Avaliações ===\n');

  console.log('Baixando registros do banco...');
  const { data: montadores } = await supabase
    .from('montadores_pendentes')
    .select('id, whatsapp');

  console.log(`Total no banco: ${montadores.length}\n`);

  let mapasCsv = [];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, 'utf-8');
    const result = Papa.parse(content, { header: true });
    const registros = result.data;

    for (const reg of registros) {
      const nota = parseFloat(reg.totalScore) || 0;
      const avaliacoes = parseInt(reg.reviewsCount) || 0;

      if (nota > 0 || avaliacoes > 0) {
        mapasCsv.push({
          telefone: reg.phone,
          nota,
          avaliacoes
        });
      }
    }
  }

  console.log(`Total avaliações no CSV: ${mapasCsv.length}\n`);

  let atualizados = 0;

  for (const montador of montadores) {
    for (const csv of mapasCsv) {
      if (telefoneMatches(montador.whatsapp, csv.telefone)) {
        const { error } = await supabase
          .from('montadores_pendentes')
          .update({ nota: csv.nota, avaliacoes: csv.avaliacoes })
          .eq('id', montador.id);

        if (!error) {
          atualizados++;
          console.log(`Atualizado ${montador.whatsapp}: nota=${csv.nota}, avaliacoes=${csv.avaliacoes}`);
        }
        break;
      }
    }
  }

  console.log(`\nTotal atualizados: ${atualizados}`);
}

processar().catch(console.error);