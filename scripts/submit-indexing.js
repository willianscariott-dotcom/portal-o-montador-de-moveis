import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

config();

const BATCH_SIZE = 200;
const STATE_FILE = join(process.cwd(), 'scripts', 'indexed-urls.json');
const CREDS_FILE = join(process.cwd(), 'google-credentials.json');
const SITE_URL = process.env.SITE_URL || 'https://portal.omontadordemoveis.com';

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function loadIndexedUrls() {
  if (!existsSync(STATE_FILE)) return new Set();
  try {
    const data = readFileSync(STATE_FILE, 'utf-8');
    return new Set(JSON.parse(data));
  } catch {
    return new Set();
  }
}

function saveIndexedUrls(indexed) {
  writeFileSync(STATE_FILE, JSON.stringify([...indexed], null, 2));
}

function loadCredentials() {
  if (!existsSync(CREDS_FILE)) {
    throw new Error(`Credenciais não encontradas: ${CREDS_FILE}`);
  }
  return JSON.parse(readFileSync(CREDS_FILE, 'utf-8'));
}

async function fetchUrlsFromSupabase() {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('PUBLIC_SUPABASE_URL e PUBLIC_SUPABASE_ANON_KEY devem estar configurados no .env');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: montadores, error } = await supabase
    .from('tabela_montadores')
    .select('cidade_estado, bairro_zona')
    .range(0, 10000);

  if (error) throw error;

  const urls = new Set();
  
  urls.add(`${SITE_URL}/`);
  urls.add(`${SITE_URL}/cadastro`);

  const cidadesMap = new Map();

  montadores?.forEach(m => {
    if (m.cidade_estado) {
      const [nome, estadoSigla] = m.cidade_estado.split(' - ');
      if (nome && estadoSigla) {
        const slugCidade = slugify(nome);
        const slugEstado = slugify(estadoSigla);
        
        const urlCidade = `${SITE_URL}/${slugEstado}/${slugCidade}`;
        if (!cidadesMap.has(urlCidade)) {
          cidadesMap.set(urlCidade, { estado: estadoSigla, cidade: nome });
          urls.add(urlCidade);
        }

        if (m.bairro_zona && m.bairro_zona.toLowerCase() !== 'todos os bairros') {
          const slugZona = slugify(m.bairro_zona);
          const urlZona = `${SITE_URL}/${slugEstado}/${slugCidade}/${slugZona}`;
          urls.add(urlZona);
        }
      }
    }
  });

  console.log(`Total de URLs geradas: ${urls.size}`);
  return Array.from(urls);
}

async function main() {
  console.log('📥 Buscando URLs do banco de dados...');
  const allUrls = await fetchUrlsFromSupabase();
  console.log(`Total de URLs: ${allUrls.length}`);

  const indexedUrls = loadIndexedUrls();
  const pendingUrls = allUrls.filter(url => !indexedUrls.has(url));
  console.log(`URLs já indexadas: ${indexedUrls.size}`);
  console.log(`URLs pendentes: ${pendingUrls.length}`);

  if (pendingUrls.length === 0) {
    console.log('✅ Todas as URLs já foram enviadas para o Google.');
    return;
  }

  const urlsToProcess = pendingUrls.slice(0, BATCH_SIZE);
  console.log(`📤 Enviando ${urlsToProcess.length} URLs para Indexing API...`);

  const creds = loadCredentials();
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/indexing']
  });

  const indexing = google.indexing({ version: 'v3', auth });

  let successCount = 0;
  let errorCount = 0;

  for (const url of urlsToProcess) {
    try {
      await indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_UPDATED'
        }
      });
      indexedUrls.add(url);
      successCount++;
      console.log(`✓ ${url}`);
    } catch (err) {
      errorCount++;
      const msg = err.message || '';
      if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
        console.error('❌ Erro de permissão. Verifique as credenciais.');
        break;
      }
      if (msg.includes('429') || msg.includes('rate limit')) {
        console.warn('⚠ Limite atingido. Salvando progresso...');
        break;
      }
      console.warn(`⚠ Erro: ${url} - ${msg.slice(0, 100)}`);
    }
  }

  saveIndexedUrls(indexedUrls);
  
  console.log(`\n📊 Resumo:`);
  console.log(`  ✅ Sucesso: ${successCount}`);
  console.log(`  ❌ Erros: ${errorCount}`);
  console.log(`  📁 Total indexado: ${indexedUrls.size}`);

  if (pendingUrls.length > BATCH_SIZE) {
    console.log(`\n⚠️ Ainda restam ${pendingUrls.length - BATCH_SIZE} URLs.`);
    console.log('Execute novamente para continuar.');
  }
}

main().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});