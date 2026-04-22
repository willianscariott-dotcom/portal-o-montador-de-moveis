import { readFileSync, existsSync } from 'fs';
import { google } from 'googleapis';
import { parseString } from 'xml2js';

const SCOPES = ['https://www.googleapis.com/auth/indexing'];

async function parseSitemapXml(xmlContent) {
  return new Promise((resolve, reject) => {
    parseString(xmlContent, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function main() {
  const credentialsPath = './google-credentials.json';
  
  if (!existsSync(credentialsPath)) {
    console.error('❌ Arquivo google-credentials.json não encontrado na raiz!');
    process.exit(1);
  }

  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES
  });

  const authClient = await auth.getClient();
  const indexing = google.indexing({ version: 'v3', auth: authClient });

  const sitemapPath = './dist/sitemap-0.xml';
  
  if (!existsSync(sitemapPath)) {
    console.error('❌ Arquivo sitemap não encontrado! Execute o build primeiro: npm run build');
    process.exit(1);
  }

  const sitemapContent = readFileSync(sitemapPath, 'utf-8');
  const parsed = await parseSitemapXml(sitemapContent);
  
  const urls = parsed.urlset.url.map(u => u.loc[0]);
  
  console.log(`\n📋 Encontradas ${urls.length} URLs para indexar\n`);

  let sucesso = 0;
  let erro = 0;

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    
    try {
      await indexing.urlNotifications.publish({
        requestBody: {
          url: url,
          type: 'URL_UPDATED'
        }
      });
      
      console.log(`✅ URL enviada: ${url}`);
      sucesso++;
      
    } catch (err) {
      console.error(`❌ Erro em ${url}:`, err.message || err);
      erro++;
    }

    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`\n📊 Resultado da Indexação:`);
  console.log(`   ✅ Sucesso: ${sucesso}`);
  console.log(`   ❌ Erros: ${erro}`);
  console.log(`   � Total: ${urls.length}\n`);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});