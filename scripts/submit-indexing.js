import { readFileSync, existsSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { parseString } from 'xml2js';
import { google } from 'googleapis';

const BATCH_SIZE = 200;
const STATE_FILE = join(process.cwd(), 'scripts', 'indexed-urls.json');
const CREDS_FILE = join(process.cwd(), 'google-credentials.json');

function loadXmlUrls(sitemapPath) {
  const xml = readFileSync(sitemapPath, 'utf-8');
  return new Promise((resolve, reject) => {
    parseString(xml, (err, result) => {
      if (err) reject(err);
      else {
        const urls = result?.urlset?.url || [];
        const locs = urls.map(u => u.loc[0]).filter(Boolean);
        resolve(locs);
      }
    });
  });
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

async function main() {
  const sitemapPath = join(process.cwd(), 'dist', 'sitemap-0.xml');
  
  if (!existsSync(sitemapPath)) {
    console.error(`Sitemap não encontrado: ${sitemapPath}`);
    console.log('Execute "npm run build" primeiro.');
    process.exit(1);
  }

  console.log('📥 Carregando URLs do sitemap...');
  const allUrls = await loadXmlUrls(sitemapPath);
  console.log(`Total de URLs no sitemap: ${allUrls.length}`);

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