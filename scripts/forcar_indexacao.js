import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCOPES = ['https://www.googleapis.com/auth/indexing'];

async function getAuthClient() {
  const credentials = JSON.parse(
    readFileSync(join(__dirname, '..', 'google-credentials.json'), 'utf-8')
  );
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES
  });
  
  return auth;
}

async function publishUrl(auth, url) {
  const indexing = google.indexing({ version: 'v3', auth });
  
  try {
    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: 'URL_UPDATED'
      }
    });
    return { success: true, url, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      url, 
      error: error.response?.data || error.message 
    };
  }
}

function extractCitiesFromJS(content) {
  const match = content.match(/export\s+const\s+citiesData\s*=\s*\[([\s\S]*?)\]\s*;/);
  if (!match) return [];
  
  const arrayContent = match[1];
  const idMatches = arrayContent.matchAll(/"([^"]+)"\s*,\s*"[^"]+"\s*,\s*"[^"]+"/g);
  
  const cities = [];
  for (const m of idMatches) {
    cities.push({ id: m[1] });
  }
  
  return cities;
}

function extractUrlsFromSitemap(content) {
  const locMatches = content.matchAll(/<loc>([^<]+)<\/loc>/g);
  const urls = [];
  for (const m of locMatches) {
    urls.push(m[1]);
  }
  return urls;
}

async function main() {
  console.log('🚀 Iniciando indexação das páginas...\n');

  const distPath = join(__dirname, '..', 'dist', 'sitemap-0.xml');
  const distIndexPath = join(__dirname, '..', 'dist', 'sitemap.xml');
  const srcPath = join(__dirname, '..', 'src', 'data', 'cities.js');
  
  let urls = [];
  
  if (existsSync(distPath)) {
    console.log('📄 Lendo URLs do sitemap (dist/sitemap-0.xml)...');
    const sitemapContent = readFileSync(distPath, 'utf-8');
    urls = extractUrlsFromSitemap(sitemapContent);
    console.log(`   Found ${urls.length} URLs no sitemap`);
  } else if (existsSync(distIndexPath)) {
    console.log('📄 Lendo URLs do sitemap (dist/sitemap.xml)...');
    const sitemapContent = readFileSync(distIndexPath, 'utf-8');
    urls = extractUrlsFromSitemap(sitemapContent);
    console.log(`   Found ${urls.length} URLs no sitemap`);
  } else {
    console.log('📄 Sitemap não encontrado. Lendo cidades do arquivo cities.js...');
    const citiesContent = readFileSync(srcPath, 'utf-8');
    const cities = extractCitiesFromJS(citiesContent);
    
    const BASE_URL = 'https://portal.omontadordemoveis.com';
    urls = cities.map(city => `${BASE_URL}/${city.id}`);
    console.log(`   Found ${urls.length} URLs geradas das cidades`);
  }

  if (urls.length === 0) {
    console.log('❌ Nenhuma URL encontrada para indexar!');
    return;
  }

  console.log(`\n📊 ${urls.length} páginas para indexar\n`);

  const auth = await getAuthClient();
  
  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    
    process.stdout.write(`\r⏳ Indexando ${i + 1}/${urls.length}...`);
    
    const result = await publishUrl(auth, url);
    results.push(result);
    
    if (result.success) {
      successCount++;
    } else {
      failCount++;
      console.log(`\n⚠️  Erro em ${url}:`, result.error);
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n\n✅ Indexação concluída!`);
  console.log(`   Sucesso: ${successCount}`);
  console.log(`   Falhas: ${failCount}`);

  if (failCount > 0) {
    console.log('\n⚠️  URLs com erro:');
    results
      .filter(r => !r.success)
      .forEach(r => console.log(`   - ${r.url}`));
  }
}

main().catch(console.error);