import fs from 'node:fs';
import path from 'node:path';

const DIST_CLIENT = path.resolve('dist/client');
const BASELINE_FILE = path.resolve('scripts/baseline-routes.json');

let baseline;
try {
  baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
} catch (err) {
  console.error(`[validate-build] Não foi possível ler baseline (${BASELINE_FILE}): ${err.message}`);
  process.exit(1);
}

function walk(dir) {
  const resultados = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      resultados.push(...walk(full));
    } else if (entry.name === 'index.html') {
      resultados.push(full);
    }
  }
  return resultados;
}

function nivel(url) {
  const partes = url.split('/').filter(Boolean);
  if (partes.length === 1) return 'city';
  if (partes.length === 2) return 'ufCity';
  if (partes.length === 3) return 'zona';
  return 'outro';
}

const SITE_URL = 'https://portal.omontadordemoveis.com';

function canonicalEsperado(url) {
  const partes = url.split('/').filter(Boolean);
  if (partes.length === 0) return `${SITE_URL}/`;
  return `${SITE_URL}/${partes.join('/')}`;
}

function unicosPerigoso(locs) {
  return locs.filter((u) => /undefined|\/null(?:[/?#]|$)/.test(u));
}

if (!fs.existsSync(DIST_CLIENT)) {
  console.error('[validate-build] dist/client não existe. Rode `npm run build` antes de validar.');
  process.exit(1);
}

const files = walk(DIST_CLIENT);
const contadores = { city: 0, ufCity: 0, zona: 0, outro: 0 };
const problemas = { canonicalUndefined: 0, canonicalInvalida: 0, semCanonical: 0, semTitle: 0, semDescription: 0, semH1: 0, jsonldInvalido: 0, textoUndefined: 0 };
const exemplos = [];

for (const file of files) {
  const rel = path.relative(DIST_CLIENT, file).replace(/\\/g, '/');
  const url = rel.replace(/\/index\.html$/, '');
  const html = fs.readFileSync(file, 'utf-8');
  const level = nivel(url);
  contadores[level]++;

  const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
  const canonical = canonicalMatch ? canonicalMatch[1] : null;
  const esperado = canonicalEsperado(url);

  if (!canonical) {
    problemas.semCanonical++;
    if (exemplos.length < 12) exemplos.push({ url, problema: 'sem canonical' });
  } else if (/\/undefined|\/null(?:[/?#]|$)/.test(canonical)) {
    problemas.canonicalUndefined++;
    if (exemplos.length < 12) exemplos.push({ url, problema: `canonical: ${canonical}` });
  } else if (canonical !== esperado) {
    problemas.canonicalInvalida++;
    if (exemplos.length < 12) exemplos.push({ url, problema: `canonical ${canonical} !== ${esperado}` });
  }

  const title = html.match(/<title>(.*?)<\/title>/);
  const description = html.match(/<meta name="description" content="([^"]+)"/);
  const h1 = html.match(/<h1[^>]*>/);

  if (title && /(^|\s)undefined(\s|$)|(^|\s)null(\s|$)/i.test(title[1])) {
    problemas.semTitle++;
    if (exemplos.length < 12) exemplos.push({ url, problema: `title: ${title[1]}` });
  }
  if ((!description || !description[1].trim())) {
    problemas.semDescription++;
    if (exemplos.length < 12) exemplos.push({ url, problema: 'sem description' });
  }
  if (!h1) {
    problemas.semH1++;
    if (exemplos.length < 12) exemplos.push({ url, problema: 'sem h1' });
  }

  const scripts = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
  for (const s of scripts) {
    const content = s.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    try {
      JSON.parse(content);
    } catch {
      problemas.jsonldInvalido++;
      if (exemplos.length < 12) exemplos.push({ url, problema: 'JSON-LD inválido' });
      break;
    }
  }
}

const totalGeral = files.length;
const previstoTotais = {
  city: baseline.cityPages,
  ufCity: baseline.ufCity,
  zona: baseline.zona
};
const floors = { city: 50, ufCity: 50, zona: 10 };

console.log(`[validate-build] total index.html: ${totalGeral} (baseline ${baseline.totalIndexHtml})`);
for (const k of ['city', 'ufCity', 'zona', 'outro']) {
  console.log(`[validate-build]   ${k}: ${contadores[k]} (baseline ${previstoTotais[k] ?? '-'})`);
}

const objetoProblemas = Object.entries(problemas).filter(([, v]) => v > 0);

for (const ex of exemplos) {
  console.log(`[validate-build]   exemplo: ${ex.url} -> ${ex.problema}`);
}

let fail = false;

if (contadores.city < floors.city || contadores.ufCity < floors.ufCity || contadores.zona < floors.zona) {
  console.error(`[validate-build] FALHA: contagem de rotas abaixo do piso mínimo (city>=${floors.city}, ufCity>=${floors.ufCity}, zona>=${floors.zona}).`);
  fail = true;
}

if (totalGeral < baseline.totalIndexHtml - 10) {
  console.error(`[validate-build] FALHA: total de páginas (${totalGeral}) muito abaixo da baseline (${baseline.totalIndexHtml}).`);
  fail = true;
}

if (problemas.canonicalUndefined > 0) {
  console.error(`[validate-build] FALHA: ${problemas.canonicalUndefined} canonical com /undefined ou /null.`);
  fail = true;
}

if (objetoProblemas.length > 0) {
  console.error(`[validate-build] FALHA: ${JSON.stringify(objetoProblemas)}`);
  fail = true;
}

const hasRobots = fs.existsSync(path.join(DIST_CLIENT, 'robots.txt'));
console.log(`[validate-build] robots.txt em dist/client: ${hasRobots ? 'SIM' : 'NAO'}`);

const sitemaps = fs.readdirSync(DIST_CLIENT)
  .filter((f) => /^sitemap-\d+\.xml$/.test(f))
  .sort();
console.log(`[validate-build] sitemaps: ${sitemaps.length ? sitemaps.join(', ') : 'nenhum'}`);

const temIndex = fs.existsSync(path.join(DIST_CLIENT, 'sitemap-index.xml'));
console.log(`[validate-build] sitemap-index.xml: ${temIndex ? 'SIM' : 'NAO'}`);

if (!temIndex || sitemaps.length === 0) {
  console.error('[validate-build] FALHA: sitemap-index.xml e/ou sitemap-*.xml ausentes.');
  fail = true;
} else {
  const locs = [];
  for (const s of sitemaps) {
    const xml = fs.readFileSync(path.join(DIST_CLIENT, s), 'utf-8');
    locs.push(...Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (m) => m[1]));
  }
  const unicos = new Set(locs);
  console.log(`[validate-build] URLs no sitemap: ${locs.length} (${unicos.size} únicas)`);
  if (locs.length !== totalGeral) {
    console.error(`[validate-build] FALHA: sitemap com ${locs.length} URLs, mas ${totalGeral} index.html no build.`);
    fail = true;
  }
  const invalidas = unicosPerigoso(locs);
  if (invalidas.length) {
    console.error(`[validate-build] FALHA: sitemap contém URLs inválidas: ${invalidas.join(', ')}`);
    fail = true;
  }
}

if (fail) {
  console.error('[validate-build] RESULTADO: FALHOU. Revisar problemas acima.');
  process.exit(1);
}

console.log('[validate-build] RESULTADO: OK');