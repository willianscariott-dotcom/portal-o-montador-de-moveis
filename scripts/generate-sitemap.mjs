import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function buscarIndexHtml(dir) {
  const resultados = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      resultados.push(...buscarIndexHtml(full));
    } else if (entry.name === 'index.html') {
      resultados.push(full);
    }
  }
  return resultados;
}

const ROTAS_SSR_CANONICAS = ['/', '/cadastro', '/contato', '/privacidade', '/termos'];

export function gerarSitemap(distClient) {
  const DIST_CLIENT = path.resolve(distClient);
  const SITE_URL = 'https://portal.omontadordemoveis.com';
  const POR_ARQUIVO = 20000;

  if (!fs.existsSync(DIST_CLIENT)) {
    throw new Error(`[generate-sitemap] diretório não existe: ${DIST_CLIENT}`);
  }

  const urls = new Set(
    buscarIndexHtml(DIST_CLIENT)
      .map((f) => {
        const rel = path.relative(DIST_CLIENT, f).replace(/\\/g, '/');
        const rota = rel.replace(/\/index\.html$/, '');
        if (/^404\.html$/.test(rel)) return null;
        return rota === '' ? `${SITE_URL}/` : `${SITE_URL}/${rota}`;
      })
      .filter(Boolean)
  );

  for (const rota of ROTAS_SSR_CANONICAS) {
    urls.add(rota === '/' ? `${SITE_URL}/` : `${SITE_URL}${rota}`);
  }

  const lista = [...urls].sort();

  console.log(`[generate-sitemap] ${lista.length} URLs`);

  for (const f of fs.readdirSync(DIST_CLIENT).filter((n) => /^sitemap.*\.xml(\.gz)?$/.test(n))) {
    fs.rmSync(path.join(DIST_CLIENT, f));
  }

  const hoje = new Date().toISOString().slice(0, 10);
  const partes = [];
  for (let i = 0; i < lista.length; i += POR_ARQUIVO) {
    const bloco = lista.slice(i, i + POR_ARQUIVO);
    const nome = `sitemap-${partes.length}.xml`;
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${bloco
      .map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${hoje}</lastmod>\n  </url>`)
      .join('\n')}\n</urlset>\n`;
    fs.writeFileSync(path.join(DIST_CLIENT, nome), xml);
    partes.push(nome);
    console.log(`[generate-sitemap] gerado ${nome} (${bloco.length} urls)`);
  }

  const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${partes
    .map((p) => `  <sitemap>\n    <loc>${SITE_URL}/${p}</loc>\n    <lastmod>${hoje}</lastmod>\n  </sitemap>`)
    .join('\n')}\n</sitemapindex>\n`;
  fs.writeFileSync(path.join(DIST_CLIENT, 'sitemap-index.xml'), index);
  console.log('[generate-sitemap] gerado sitemap-index.xml');
}

const executadoComoCli =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (executadoComoCli) {
  gerarSitemap(path.resolve('dist/client'));
}