import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import fs from 'fs';

const supabaseUrl = 'https://zbxclibijjngvorcynpw.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieGNsaWJpampuZ3ZvcmN5bnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NDE2OTIsImV4cCI6MjA5MjIxNzY5Mn0.yL21n_56GRd8xb1NPfKNYSyvGRTMHu5SC96u7BuzmfA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DOMAIN = 'https://portal.omontadordemoveis.com';

async function loadServiceAccount() {
  const credentialsPath = './service-account.json';
  
  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ Arquivo service-account.json não encontrado!');
    console.error('   Baixe o arquivo de credenciais do Google Cloud Console > API e Serviços > Credenciais');
    console.error('   e salve como service-account.json na raiz do projeto.');
    process.exit(1);
  }
  
  return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
}

async function getCidadesUnicas() {
  console.log('📡 Conectando ao Supabase...');
  
  const { data: montadores, error } = await supabase
    .from('montadores_pendentes')
    .select('cidade_estado');
  
  if (error) {
    console.error('❌ Erro ao buscar cidades:', error.message);
    process.exit(1);
  }
  
  const cidadesUnicas = new Map();
  
  (montadores || []).forEach(m => {
    if (m.cidade_estado) {
      const [nome, estadoSigla] = m.cidade_estado.split(' - ');
      if (nome && estadoSigla) {
        const slug = nome.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        if (!cidadesUnicas.has(slug)) {
          cidadesUnicas.set(slug, { slug, nome, estado: estadoSigla });
        }
      }
    }
  });
  
  const cidades = Array.from(cidadesUnicas.values());
  console.log(`   ✓ ${cidades.length} cidades únicas encontradas`);
  
  return cidades;
}

async function indexarCidades(cidades) {
  console.log('\n🔑 Carregando credenciais do Google...');
  
  const serviceAccount = await loadServiceAccount();
  
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/indexing']
  });
  
  const indexing = google.indexing({ version: 'v3', auth });
  
  const urlsAtualizar = [];
  const urlsCadastrar = [];
  
  for (const cidade of cidades) {
    urlsAtualizar.push(`${DOMAIN}/${cidade.slug}/`);
    urlsCadastrar.push(`${DOMAIN}/${cidade.slug}`);
  }
  
  console.log(`\n📤 Indexando ${cidades.length} URLs...`);
  
  const BATCH_SIZE = 100;
  const DELAY_MS = 1000;
  
  const allUrls = [...urlsAtualizar, ...urlsCadastrar];
  
  for (let i = 0; i < allUrls.length; i += BATCH_SIZE) {
    const batch = allUrls.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(allUrls.length / BATCH_SIZE);
    
    console.log(`   Batch ${batchNum}/${totalBatches}: ${batch.length} URLs...`);
    
    for (const url of batch) {
      try {
        await indexing.urlNotifications.publish({
          requestBody: {
            url: url,
            type: 'URL_UPDATED'
          }
        });
        console.log(`      ✓ ${url}`);
      } catch (error) {
        if (error.response?.status === 429) {
          console.error(`   ⚠️ Limite de requisições atingido! Aguardando 60s...`);
          await new Promise(resolve => setTimeout(resolve, 60000));
          
          try {
            await indexing.urlNotifications.publish({
              requestBody: {
                url: url,
                type: 'URL_UPDATED'
              }
            });
            console.log(`      ✓ ${url} (retry)`);
          } catch (retryError) {
            console.error(`      ❌ ${url}: ${retryError.message}`);
          }
        } else {
          console.error(`      ❌ ${url}: ${error.message}`);
        }
      }
    }
    
    if (i + BATCH_SIZE < allUrls.length) {
      console.log(`   ⏳ Aguardando ${DELAY_MS}ms...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log('\n✅ Indexação concluída!');
  console.log(`   Total: ${allUrls.length} URLs notificadas`);
}

async function main() {
  console.log('🚀 Script de Indexação de Cidades para Google Indexing API\n');
  console.log('=================================================');
  
  try {
    const cidades = await getCidadesUnicas();
    await indexarCidades(cidades);
  } catch (error) {
    console.error('\n❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

main();