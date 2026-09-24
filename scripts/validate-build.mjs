import fs from 'node:fs';
import path from 'node:path';

const DIST_CLIENT = path.resolve('dist/client');

// READ-ONLY: nunca corrige, nunca reescreve, nunca apaga. Valida que o artefato publicado
// (.vercel/output/static) contém os mesmos bytes de dist/client para os sitemaps gerados.
const nomePar = ['sitemap-0.xml', 'sitemap-index.xml'];
const dirVer = path.resolve('.vercel/output/static');
const dirCli = path.resolve('dist/client');
if (fs.existsSync(dirVer)) {
  for (const f of nomePar) {
    const pv = path.join(dirVer, f);
    const pc = path.join(dirCli, f);
    const temV = fs.existsSync(pv);
    const temC = fs.existsSync(pc);
    if (!temV && !temC) {
      console.error('validate read-only: faltando em dist/client e em .vercel/output/static: ' + f);
      process.exitCode = 1;
      continue;
    }
    if (!temV) {
      console.error('validate read-only: faltando em .vercel/output/static (dist/client possui): ' + f);
      process.exitCode = 1;
      continue;
    }
    if (!temC) {
      console.error('validate read-only: faltando em dist/client (.vercel/output/static possui): ' + f);
      process.exitCode = 1;
      continue;
    }
    const bv = fs.readFileSync(pv);
    const bc = fs.readFileSync(pc);
    if (!bv.equals(bc)) {
      console.error('validate read-only: DIVERGENCIA byte a byte em ' + f + ' (.vercel/output/static vs dist/client)');
      process.exitCode = 1;
    } else {
      console.log('validate read-only: byte a byte identico em ' + f);
    }
  }
} else {
  console.log('validate read-only: sem .vercel/output/static neste ambiente');
}

const BASELINE_FILE = path.resolve('scripts/baseline-routes.json');
const BLOG_DIR = path.resolve('src/content/blog');

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
  const rota = url === '' ? '/' : `/${url}`;
  if (ROTAS_INSTITUCIONAIS.includes(rota)) return 'institucional';
  const partes = url.split('/').filter(Boolean);
  if (partes[0] === 'blog') return 'blog';
  if (partes.length === 1) return 'city';
  if (partes.length === 2) return 'ufCity';
  if (partes.length === 3) return 'zona';
  return 'outro';
}

const SITE_URL = 'https://portal.omontadordemoveis.com';

const ROTAS_SSR_CANONICAS = ['/cadastro', '/contato', '/privacidade', '/termos'];

// Paginas institucionais (P2B): estaticas, indexaveis e fixas.
const ROTAS_INSTITUCIONAIS = ['/sobre', '/politica-editorial', '/autor/willian-scariott'];
const ROTA_AUTOR = '/autor/willian-scariott';

function checarIndexingApiRemovida() {
  const erros = [];
  const pkg = JSON.parse(fs.readFileSync(path.resolve('package.json'), 'utf-8'));
  const roteiros = Object.values(pkg.scripts || {});
  if (roteiros.some((s) => String(s).includes('index:google'))) {
    erros.push('package.json voltou a expor o comando index:google');
  }
  const padroes = [/urlNotifications\.publish/, /google\.indexing/];
  for (const nome of fs.readdirSync(path.resolve('scripts')).filter((n) => /\.(js|mjs|cjs)$/.test(n))) {
    const conteudo = fs.readFileSync(path.resolve('scripts', nome), 'utf-8');
    for (const p of padroes) {
      if (p.test(conteudo)) {
        erros.push(`scripts/${nome} contém referência a ${p.source}`);
      }
    }
  }
  return erros;
}

function relSsr(rota) {
  return `${SITE_URL}${rota}`;
}

function canonicalEsperado(url) {
  const partes = url.split('/').filter(Boolean);
  if (partes.length === 0) return SITE_URL;
  return `${SITE_URL}/${partes.join('/')}`;
}

function unicosPerigoso(locs) {
  return locs.filter((u) => /undefined|\/null(?:[/?#]|$)/.test(u));
}

function extrairRotasInternas(html) {
  const rotas = new Set();
  const origem = new URL(SITE_URL);
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']*)["']/gi)) {
    const href = m[1].trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('//')) continue;
    if (/^https?:\/\//i.test(href)) {
      try {
        const u = new URL(href);
        if (u.origin !== origem.origin) continue;
        rotas.add(u.pathname.replace(/\/+$/, '') || '/');
      } catch { /* URL malformada ignorada */ }
      continue;
    }
    const semQueryHash = href.split(/[?#]/)[0];
    if (!semQueryHash) continue;
    let rota = semQueryHash;
    if (!rota.startsWith('/')) rota = `/${rota}`;
    rotas.add(rota.replace(/\/+$/, '') || '/');
  }
  return rotas;
}

const RE_ROBOTS_NOINDEX = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex[^"']*["']/i;

function listarMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const resultado = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      resultado.push(...listarMarkdown(full));
    } else if (/\.md$/.test(entry.name)) {
      resultado.push(full);
    }
  }
  return resultado;
}

function parseFrontmatter(conteudo) {
  const m = conteudo.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);
  const dados = {};
  if (!m) return dados;
  for (const linha of m[1].split(/\r?\n/)) {
    const kv = linha.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (kv && kv[2].trim() !== '') dados[kv[1]] = kv[2].trim();
  }
  return dados;
}

function boolVal(raw) {
  return /^true$/i.test(raw || '');
}

function extrairRelated(raw) {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.replace(/^["'[\s]+|["'\s\]]+$/g, ''))
    .filter((s) => s.startsWith('/') && !/\s/.test(s) && !s.includes('[') && !s.includes(']'));
}

if (!fs.existsSync(DIST_CLIENT)) {
  console.error('[validate-build] dist/client não existe. Rode `npm run build` antes de validar.');
  process.exit(1);
}

const files = walk(DIST_CLIENT);
const contadores = { city: 0, ufCity: 0, zona: 0, blog: 0, institucional: 0, outro: 0 };
const problemas = {
  canonicalUndefined: 0, canonicalInvalida: 0, semCanonical: 0, semTitle: 0, semDescription: 0,
  semH1: 0, jsonldInvalido: 0, textoUndefined: 0, htmlPublicoIndevido: 0, placeholderLiteral: 0,
  precoFixo: 0, depoimentoNaoLocal: 0, rotasBlogDraft: 0, slugDuplicado: 0, canonicalDuplicada: 0,
  blogPostAusenteListagem: 0, relatedPageForaSitemap: 0, blogSemBlogPosting: 0,
  htmlNoindexNoSitemap: 0, htmlIndexavelForaDoSitemap: 0, blogIndexSemNoindex: 0, blogIndexNoindexComConteudo: 0,
  blogPostingUnico: 0, breadcrumbUnico: 0, h1Unico: 0, assinaturaVisivel: 0, faqDesalinhado: 0, blogNavAusente: 0,
  institucionalAusente: 0, pageNoindexInstitucional: 0, h1InstitucionalMultiplo: 0, breadcrumbInstitucional: 0,
  faqPageInstitucional: 0, personInvalido: 0, personFicticioOuVazio: 0, authorBlogPostingIncorreto: 0,
  assinaturaSemLinkAutor: 0, listaArtigosAutor: 0, fotoSemAlt: 0, contatoEditorialAusente: 0,
  orgDuplicada: 0, linkInstitucionalHome: 0, institucionalForaSitemap: 0, textoUndefinedInstitucional: 0
};
const exemplos = [];

const ROTAS_CIDADE_SRC = [
  ['src', 'pages', '[cidade].astro'],
  ['src', 'pages', '[estado]', '[cidade].astro'],
  ['src', 'pages', '[estado]', '[cidade]', '[zona].astro']
].map((p) => path.resolve(...p));

const PADRAO_PRECO_FIXO = /R\$\s?80|R\$\s?150/i;

const PADRAO_DEPOIMENTO_NAO_LOCAL = /avaliacoes_reais|selectedReviews|\blcg\s*\(|\bMath\.random\b/;

const postsBlog = listarMarkdown(BLOG_DIR).map((f) => {
  const conteudo = fs.readFileSync(f, 'utf-8');
  const fm = parseFrontmatter(conteudo);
  const id = path.basename(f, '.md');
  const slug = (fm.slug || '').trim() || id;
  return {
    file: path.relative(path.resolve('.'), f),
    id,
    slug,
    draft: boolVal(fm.draft),
    noindex: boolVal(fm.noindex),
    published: !boolVal(fm.draft),
    indexable: !boolVal(fm.draft) && !boolVal(fm.noindex),
    relatedPages: extrairRelated(fm.relatedPages)
  };
});

const homeIndex = path.join(DIST_CLIENT, 'index.html');
const temHomeEstatica = fs.existsSync(homeIndex);

const htmlRaiz = fs
  .readdirSync(DIST_CLIENT)
  .filter(
    (f) =>
      f.toLowerCase().endsWith('.html') &&
      !/^google[a-f0-9]{16}\.html$/i.test(f) &&
      !/^sitemap.*\.xml$/.test(f)
  );

const htmlRaizIndevido = htmlRaiz.filter((f) => f !== 'index.html');

if (htmlRaizIndevido.length) {
  problemas.htmlPublicoIndevido += htmlRaizIndevido.length;
  for (const h of htmlRaizIndevido) {
    if (/\{cidade\}|\{estado\}/i.test(fs.readFileSync(path.join(DIST_CLIENT, h), 'utf-8'))) {
      problemas.placeholderLiteral++;
    }
    if (exemplos.length < 12) exemplos.push({ url: h, problema: 'HTML público indevido' });
  }
}

if (temHomeEstatica) {
  const homeHtml = fs.readFileSync(homeIndex, 'utf-8');

  if (/\{cidade\}|\{estado\}/i.test(homeHtml)) {
    problemas.placeholderLiteral++;
    if (exemplos.length < 12) exemplos.push({ url: '/', problema: 'placeholder literal {cidade}/{estado} na home' });
  }
  if (!/<title>(.*?)<\/title>/i.test(homeHtml)) {
    problemas.semTitle++;
    if (exemplos.length < 12) exemplos.push({ url: '/', problema: 'home sem title' });
  }
  if (!/<meta\s+name="description"\s+content="[^"]+"/i.test(homeHtml)) {
    problemas.semDescription++;
    if (exemplos.length < 12) exemplos.push({ url: '/', problema: 'home sem description' });
  }
  if (!/<h1[^>]*>/i.test(homeHtml)) {
    problemas.semH1++;
    if (exemplos.length < 12) exemplos.push({ url: '/', problema: 'home sem h1' });
  }
  const homeCanonical = homeHtml.match(/<link\s+rel="canonical"\s+href="([^"]+)"/i);
  if (!homeCanonical) {
    problemas.semCanonical++;
    if (exemplos.length < 12) exemplos.push({ url: '/', problema: 'home sem canonical' });
  } else if (homeCanonical[1].replace(/\/+$/, '') !== SITE_URL) {
    problemas.canonicalInvalida++;
    if (exemplos.length < 12) exemplos.push({ url: '/', problema: `home canonical ${homeCanonical[1]} !== ${SITE_URL}` });
  }
  if (!/<a\b[^>]*\bhref="\/blog"/i.test(homeHtml)) {
    problemas.blogNavAusente++;
    if (exemplos.length < 12) exemplos.push({ url: '/', problema: 'link de navegação para /blog ausente na home' });
  }
}

const rotasIndexaveisHtml = new Set();
const rotasNoindexHtml = new Set();
const canonicalPorRota = new Map();

for (const file of files) {
  const rel = path.relative(DIST_CLIENT, file).replace(/\\/g, '/');
  const url = rel === 'index.html' ? '' : rel.replace(/\/index\.html$/, '');
  const html = fs.readFileSync(file, 'utf-8');
  const level = nivel(url);
  contadores[level]++;

  const isNoindex = RE_ROBOTS_NOINDEX.test(html);
  const rotaCompleta = url === '' ? '/' : `/${url}`;
  if (isNoindex) rotasNoindexHtml.add(rotaCompleta);
  else rotasIndexaveisHtml.add(rotaCompleta);

  if (PADRAO_PRECO_FIXO.test(html)) {
    problemas.precoFixo++;
    if (exemplos.length < 12) exemplos.push({ url, problema: 'preço genérico R$80–R$150 no HTML' });
  }

  if (/\{cidade\}|\{estado\}/i.test(html)) {
    problemas.placeholderLiteral++;
    if (exemplos.length < 12) exemplos.push({ url, problema: 'placeholder literal {cidade}/{estado}' });
  }

  const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
  const canonical = canonicalMatch ? canonicalMatch[1] : null;
  const esperado = canonicalEsperado(url);

  if (!isNoindex) {
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
    canonicalPorRota.set(rotaCompleta, canonical);
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

  if (level === 'blog' && url !== 'blog' && !isNoindex && !/BlogPosting/.test(html)) {
    problemas.blogSemBlogPosting++;
    if (exemplos.length < 12) exemplos.push({ url, problema: 'artigo do blog sem JSON-LD BlogPosting' });
  }

  if (level === 'blog' && url !== 'blog' && !isNoindex) {
    const js = (re) => html.match(re) || [];

    const qtdBlogPosting = js(/"@type":\s*"BlogPosting"/g).length;
    if (qtdBlogPosting !== 1) {
      problemas.blogPostingUnico++;
      if (exemplos.length < 12) exemplos.push({ url, problema: `BlogPosting presente ${qtdBlogPosting} vez(es), esperado 1` });
    }

    const qtdBreadcrumb = js(/"@type":\s*"BreadcrumbList"/g).length;
    if (qtdBreadcrumb !== 1) {
      problemas.breadcrumbUnico++;
      if (exemplos.length < 12) exemplos.push({ url, problema: `BreadcrumbList presente ${qtdBreadcrumb} vez(es), esperado 1` });
    }

    const qtdH1 = js(/<h1\b/g).length;
    if (qtdH1 !== 1) {
      problemas.h1Unico++;
      if (exemplos.length < 12) exemplos.push({ url, problema: `H1 presente ${qtdH1} vez(es), esperado 1` });
    }

    const qtdAssinatura = (html.match(/Por Willian Scariott/g) || []).length;
    if (qtdAssinatura !== 1) {
      problemas.assinaturaVisivel++;
      if (exemplos.length < 12) exemplos.push({ url, problema: `assinatura visível "Por Willian Scariott" presente ${qtdAssinatura} vez(es), esperado 1` });
    }

    const qtdFaqPage = js(/"@type":\s*"FAQPage"/g).length;
    const qtdQuestoesJson = js(/"@type":\s*"Question"/g).length;
    const qtdQuestoesVisiveis = (html.match(/<h3 class="text-lg/g) || []).length;
    const faqAlinhado =
      qtdFaqPage === 0
        ? qtdQuestoesJson === 0 && qtdQuestoesVisiveis === 0
        : qtdFaqPage === 1 && qtdQuestoesJson > 0 && qtdQuestoesJson === qtdQuestoesVisiveis;
    if (!faqAlinhado) {
      problemas.faqDesalinhado++;
      if (exemplos.length < 12) exemplos.push({ url, problema: `FAQPage=${qtdFaqPage}, perguntas JSON-LD=${qtdQuestoesJson}, perguntas visíveis=${qtdQuestoesVisiveis} — FAQ não alinhado` });
    }
  }
}

const totalGeral = files.length;

for (const srcFile of ROTAS_CIDADE_SRC) {
  if (!fs.existsSync(srcFile)) {
    if (exemplos.length < 12) exemplos.push({ url: path.basename(srcFile), problema: 'rota de cidade/zona ausente' });
    problemas.depoimentoNaoLocal++;
    continue;
  }
  const conteudo = fs.readFileSync(srcFile, 'utf-8');
  if (PADRAO_DEPOIMENTO_NAO_LOCAL.test(conteudo)) {
    problemas.depoimentoNaoLocal++;
    if (exemplos.length < 12) exemplos.push({ url: path.relative(path.resolve('.'), srcFile), problema: 'avaliação não local (avaliacoes_reais/LCG/selectedReviews/Math.random) na rota de cidade/zona' });
  }
}

const previstoTotais = {
  city: baseline.cityPages,
  ufCity: baseline.ufCity,
  zona: baseline.zona,
  institucional: ROTAS_INSTITUCIONAIS.length
};
const floors = { city: 50, ufCity: 50, zona: 10 };

const geramRota = postsBlog.filter((p) => p.published).length;
const publicosIndexaveis = postsBlog.filter((p) => p.indexable);
const esperadoBlogFiles = 1 + geramRota;

console.log(`[validate-build] total index.html: ${totalGeral} (base ${baseline.totalIndexHtml}\t+ blog ${contadores.blog}\t+ institucional ${contadores.institucional})`);
for (const k of ['city', 'ufCity', 'zona', 'blog', 'institucional', 'outro']) {
  console.log(`[validate-build]   ${k}: ${contadores[k]} (baseline ${previstoTotais[k] ?? '-'})`);
}
console.log(`[validate-build] posts markdown em src/content/blog: ${postsBlog.length} (${geramRota} geram rota; ${postsBlog.length - geramRota} draft)`);

// ===== P2B: entidade, autoria e confiança =====

function lerHtmlPorRota(rota) {
  const rel = rota === '/' ? 'index.html' : `${rota.replace(/^\//, '')}/index.html`;
  const p = path.join(DIST_CLIENT, ...rel.split('/'));
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : '';
}

function extrairGraphs(html) {
  const scripts = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g) || [];
  const nodes = [];
  for (const s of scripts) {
    const content = s.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '');
    try {
      const obj = JSON.parse(content);
      if (Array.isArray(obj && obj['@graph'])) nodes.push(...obj['@graph']);
      else nodes.push(obj);
    } catch {
      // JSON-LD inválido já contabilizado no loop principal como jsonldInvalido
    }
  }
  return nodes;
}

function nosDoTipo(nodes, tipo) {
  return nodes.filter((n) => {
    if (!n || !n['@type']) return false;
    return Array.isArray(n['@type']) ? n['@type'].includes(tipo) : n['@type'] === tipo;
  });
}

const RE_ALT_FOTO_AUTOR = /alt="Willian Scariott, criador e editor do Portal O Montador de Móveis"/;

// 1) As três rotas institucionais existem, estão indexáveis e com H1 único.
for (const rota of ROTAS_INSTITUCIONAIS) {
  const html = lerHtmlPorRota(rota);
  if (!html) {
    problemas.institucionalAusente++;
    if (exemplos.length < 12) exemplos.push({ url: rota, problema: 'página institucional não gerada' });
    continue;
  }
  if (RE_ROBOTS_NOINDEX.test(html)) {
    problemas.pageNoindexInstitucional++;
    if (exemplos.length < 12) exemplos.push({ url: rota, problema: 'página institucional com robots noindex' });
  }
  if ((html.match(/<h1\b/g) || []).length !== 1) {
    problemas.h1InstitucionalMultiplo++;
    if (exemplos.length < 12) exemplos.push({ url: rota, problema: 'H1 institucional com quantidade diferente de 1' });
  }
  if (/\bnull\b|\bundefined\b/.test(html)) {
    problemas.textoUndefinedInstitucional++;
    if (exemplos.length < 12) exemplos.push({ url: rota, problema: 'texto null/undefined presente na página institucional' });
  }
  const nodes = extrairGraphs(html);
  if (nosDoTipo(nodes, 'BreadcrumbList').length !== 1) {
    problemas.breadcrumbInstitucional++;
    if (exemplos.length < 12) exemplos.push({ url: rota, problema: 'BreadcrumbList ausente ou duplicado na página institucional' });
  }
  if (nosDoTipo(nodes, 'FAQPage').length !== 0) {
    problemas.faqPageInstitucional++;
    if (exemplos.length < 12) exemplos.push({ url: rota, problema: 'FAQPage em página institucional sem FAQ visível' });
  }
}

// 2) Página do autor: Person válido, foto com alt, lista de artigos e contato editorial.
const autorHtml = lerHtmlPorRota(ROTA_AUTOR);
if (autorHtml) {
  const nodes = extrairGraphs(autorHtml);
  const persons = nosDoTipo(nodes, 'Person');
  if (persons.length !== 1) {
    problemas.personInvalido++;
    if (exemplos.length < 12) exemplos.push({ url: ROTA_AUTOR, problema: `Person presente ${persons.length} vez(es), esperado 1` });
  } else {
    const p = persons[0];
    const orgIdOk = String((p.worksFor && p.worksFor['@id']) || '').endsWith('#organization');
    const ok =
      p.name === 'Willian Scariott' &&
      String(p['@id'] || '').endsWith(`/autor/willian-scariott#person`) &&
      p.url === `${SITE_URL}/autor/willian-scariott` &&
      typeof p.jobTitle === 'string' && p.jobTitle.trim().length > 0 &&
      typeof p.image === 'string' && p.image.startsWith(`${SITE_URL}/`) &&
      orgIdOk;
    if (!ok) {
      problemas.personInvalido++;
      if (exemplos.length < 12) exemplos.push({ url: ROTA_AUTOR, problema: 'Person inválido (name/@id/url/image/jobTitle/worksFor) na página do autor' });
    }
  }
  if (!RE_ALT_FOTO_AUTOR.test(autorHtml)) {
    problemas.fotoSemAlt++;
    if (exemplos.length < 12) exemplos.push({ url: ROTA_AUTOR, problema: 'foto do autor sem o alt correto' });
  }
  const linksArtigos = (autorHtml.match(/href="\/blog\/[^"?#"']+"/g) || []).filter((h) => h !== 'href="/blog"').length;
  if (linksArtigos !== publicosIndexaveis.length) {
    problemas.listaArtigosAutor++;
    if (exemplos.length < 12) exemplos.push({ url: ROTA_AUTOR, problema: `lista de artigos com ${linksArtigos} links, esperado ${publicosIndexaveis.length}` });
  }
  if (!/contato@grupows\.com/.test(autorHtml)) {
    problemas.contatoEditorialAusente++;
    if (exemplos.length < 12) exemplos.push({ url: ROTA_AUTOR, problema: 'contato editorial ausente' });
  }
  if (!/href="\/politica-editorial"/.test(autorHtml)) {
    problemas.contatoEditorialAusente++;
    if (exemplos.length < 12) exemplos.push({ url: ROTA_AUTOR, problema: 'link para a política editorial ausente' });
  }
} else {
  problemas.institucionalAusente++;
  if (exemplos.length < 12) exemplos.push({ url: ROTA_AUTOR, problema: 'página do autor não gerada' });
}

// 3) Página /sobre: links internos para autor e política editorial.
const sobreHtml = lerHtmlPorRota('/sobre');
if (sobreHtml) {
  if (!/href="\/autor\/willian-scariott"/.test(sobreHtml)) {
    problemas.contatoEditorialAusente++;
    if (exemplos.length < 12) exemplos.push({ url: '/sobre', problema: 'link para /autor/willian-scariott ausente' });
  }
  if (!/href="\/politica-editorial"/.test(sobreHtml)) {
    problemas.contatoEditorialAusente++;
    if (exemplos.length < 12) exemplos.push({ url: '/sobre', problema: 'link para /politica-editorial ausente' });
  }
}

// 4) Página /politica-editorial: contato editorial presente.
const politicaHtml = lerHtmlPorRota('/politica-editorial');
if (politicaHtml) {
  if (!/contato@grupows\.com/.test(politicaHtml)) {
    problemas.contatoEditorialAusente++;
    if (exemplos.length < 12) exemplos.push({ url: '/politica-editorial', problema: 'contato editorial ausente' });
  }
}

// 5) Autoria em todo o HTML indexável: Person sem invenção, BlogPosting.author correto,
//    Organization nunca duplicada e assinatura com link para a página do autor.
const homeHtmlP2b = lerHtmlPorRota('/');
for (const rota of ROTAS_INSTITUCIONAIS) {
  const rx = new RegExp(`href="${rota.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`);
  if (!rx.test(homeHtmlP2b)) {
    problemas.linkInstitucionalHome++;
    if (exemplos.length < 12) exemplos.push({ url: '/', problema: `link interno da home para ${rota} ausente` });
  }
}

for (const file of files) {
  const rel = path.relative(DIST_CLIENT, file).replace(/\\/g, '/');
  const url = rel === 'index.html' ? '' : rel.replace(/\/index\.html$/, '');
  const rota = url === '' ? '/' : `/${url}`;
  const html = fs.readFileSync(file, 'utf-8');
  if (RE_ROBOTS_NOINDEX.test(html)) continue;

  const nodes = extrairGraphs(html);
  const orgs = nosDoTipo(nodes, 'Organization');
  const orgIds = new Set(orgs.map((o) => String(o && o['@id'] || '')));
  if (orgIds.size > 1 || (orgIds.size === 1 && ![...orgIds][0].endsWith('#organization'))) {
    problemas.orgDuplicada++;
    if (exemplos.length < 12) exemplos.push({ url: rota, problema: `Organization duplicada ou @id divergente: ${[...orgIds].join(', ')}` });
  }

  if (rota === ROTA_AUTOR) continue;

  const isArtigoBlog = nivel(url) === 'blog' && url !== 'blog';
  const posters = isArtigoBlog ? nosDoTipo(nodes, 'BlogPosting') : [];
  const persons = isArtigoBlog
    ? [...new Map(posters.filter((bp) => bp.author).map((bp) => [String(bp.author['@id'] || bp.author.name), bp.author])).values()]
    : nosDoTipo(nodes, 'Person');
  const esperadoPerson = isArtigoBlog ? 1 : 0;
  if (persons.length !== esperadoPerson) {
    problemas.personFicticioOuVazio++;
    if (exemplos.length < 12) exemplos.push({ url: rota, problema: `Person presente ${persons.length} vez(es), esperado ${esperadoPerson}` });
  } else {
    for (const p of persons) {
      if (!p.name || String(p.name).trim() === '') {
        problemas.personFicticioOuVazio++;
        if (exemplos.length < 12) exemplos.push({ url: rota, problema: 'Person sem nome (vazia) presente' });
      }
    }
  }

  if (isArtigoBlog) {
    for (const bp of posters) {
      const a = bp.author;
      const authorOk =
        a && a['@type'] === 'Person' &&
        String(a['@id'] || '').endsWith('/autor/willian-scariott#person') &&
        a.url === `${SITE_URL}/autor/willian-scariott` &&
        a.name === 'Willian Scariott';
      if (!authorOk) {
        problemas.authorBlogPostingIncorreto++;
        if (exemplos.length < 12) exemplos.push({ url: rota, problema: 'BlogPosting.author não aponta para o @id correto' });
      }
      if (!bp.publisher || !String(bp.publisher['@id'] || '').endsWith('#organization')) {
        problemas.orgDuplicada++;
        if (exemplos.length < 12) exemplos.push({ url: rota, problema: 'BlogPosting.publisher não aponta para a Organization do portal' });
      }
    }
    const reAssinaturaLink = /href="\/autor\/willian-scariott"[^>]*>\s*Por Willian Scariott/i;
    if (!reAssinaturaLink.test(html)) {
      problemas.assinaturaSemLinkAutor++;
      if (exemplos.length < 12) exemplos.push({ url: rota, problema: 'assinatura "Por Willian Scariott" sem link para a página do autor' });
    }
  }
}

const objetoProblemas = Object.entries(problemas).filter(([, v]) => v > 0);

for (const ex of exemplos) {
  console.log(`[validate-build]   exemplo: ${ex.url} -> ${ex.problema}`);
}

let fail = false;

if (contadores.city !== baseline.cityPages || contadores.ufCity !== baseline.ufCity || contadores.zona !== baseline.zona) {
  console.error(`[validate-build] FALHA: contagem de rotas não bate com a baseline (city=${contadores.city}, ufCity=${contadores.ufCity}, zona=${contadores.zona}; esperado ${baseline.cityPages}/${baseline.ufCity}/${baseline.zona}).`);
  fail = true;
}

if (contadores.city < floors.city || contadores.ufCity < floors.ufCity || contadores.zona < floors.zona) {
  console.error(`[validate-build] FALHA: contagem de rotas abaixo do piso mínimo (city>=${floors.city}, ufCity>=${floors.ufCity}, zona>=${floors.zona}).`);
  fail = true;
}

if (contadores.outro !== 1) {
  console.error(`[validate-build] FALHA: ${contadores.outro} HTML inesperado fora das rotas conhecidas (esperado 1: a home estática).`);
  fail = true;
}

if (!temHomeEstatica) {
  console.error(`[validate-build] FALHA: home não é estática — index.html ausente na raiz de dist/client.`);
  fail = true;
}

if (contadores.blog !== esperadoBlogFiles) {
  console.error(`[validate-build] FALHA: ${contadores.blog} arquivos do blog gerados, esperado ${esperadoBlogFiles} (1 índice + ${geramRota} artigo(s) público(s)).`);
  fail = true;
}

const esperadoTotalIndex = baseline.totalIndexHtml + esperadoBlogFiles + ROTAS_INSTITUCIONAIS.length;
if (totalGeral !== esperadoTotalIndex) {
  console.error(`[validate-build] FALHA: total de páginas ${totalGeral}, esperado ${esperadoTotalIndex} (${baseline.totalIndexHtml} base + ${esperadoBlogFiles} blog + ${ROTAS_INSTITUCIONAIS.length} institucional).`);
  fail = true;
}

const contagemRotasBlog = new Map();
for (const p of postsBlog) {
  contagemRotasBlog.set(p.slug, (contagemRotasBlog.get(p.slug) || 0) + 1);
}
for (const [slug, n] of contagemRotasBlog) {
  if (n > 1) {
    problemas.slugDuplicado++;
    if (exemplos.length < 12) exemplos.push({ url: `/blog/${slug}`, problema: `slug duplicado usado por ${n} posts` });
  }
}

for (const p of postsBlog.filter((p) => p.draft)) {
  const caminho = path.join(DIST_CLIENT, 'blog', `${p.slug}.html`);
  if (fs.existsSync(caminho)) {
    problemas.rotasBlogDraft++;
    if (exemplos.length < 12) exemplos.push({ url: `/${p.file}`, problema: `draft gerou rota /blog/${p.slug}` });
  }
}

const porCanonical = new Map();
for (const [, canonical] of canonicalPorRota) {
  const norm = canonical.replace(/\/+$/, '');
  porCanonical.set(norm, (porCanonical.get(norm) || 0) + 1);
}
for (const [canonical, n] of porCanonical) {
  if (n > 1) {
    problemas.canonicalDuplicada++;
    if (exemplos.length < 12) exemplos.push({ url: canonical, problema: `canonical duplicada em ${n} páginas` });
  }
}

const blogIndexFile = path.join(DIST_CLIENT, 'blog', 'index.html');
if (!fs.existsSync(blogIndexFile)) {
  console.error('[validate-build] FALHA: /blog não foi gerado (blog/index.html ausente).');
  fail = true;
} else {
  const blogHtml = fs.readFileSync(blogIndexFile, 'utf-8');
  if (publicosIndexaveis.length === 0) {
    if (!RE_ROBOTS_NOINDEX.test(blogHtml)) {
      problemas.blogIndexSemNoindex++;
      if (exemplos.length < 12) exemplos.push({ url: '/blog', problema: 'índice vazio sem robots noindex' });
    }
  } else if (RE_ROBOTS_NOINDEX.test(blogHtml)) {
    problemas.blogIndexNoindexComConteudo++;
    if (exemplos.length < 12) exemplos.push({ url: '/blog', problema: 'índice com conteúdo publicado mas com robots noindex' });
  }
  for (const p of publicosIndexaveis) {
    const rota = `/blog/${p.slug}`;
    const ocorrencias = (blogHtml.match(new RegExp(`href="${rota.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g')) || []).length;
    if (ocorrencias !== 1) {
      problemas.blogPostAusenteListagem++;
      if (exemplos.length < 12) exemplos.push({ url: rota, problema: `artigo público aparece ${ocorrencias} vez(es) na listagem em /blog, esperado 1 (${p.file})` });
    }
  }
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

  const pathSitemap = new Set();
  for (const l of locs) {
    try {
      const u = new URL(l);
      pathSitemap.add(u.pathname.replace(/\/+$/, '') || '/');
    } catch { /* URLs inválidas tratadas por unicosPerigoso */ }
  }

  for (const rota of rotasNoindexHtml) {
    if (pathSitemap.has(rota)) {
      problemas.htmlNoindexNoSitemap++;
      if (exemplos.length < 12) exemplos.push({ url: rota, problema: 'HTML noindex presente no sitemap' });
    }
  }

  const faltandoIndexaveis = [...rotasIndexaveisHtml].filter((r) => !pathSitemap.has(r));
  if (faltandoIndexaveis.length) {
    problemas.htmlIndexavelForaDoSitemap += faltandoIndexaveis.length;
    for (const r of faltandoIndexaveis.slice(0, 12 - exemplos.length)) {
      if (exemplos.length < 12) exemplos.push({ url: r, problema: 'HTML indexável ausente do sitemap' });
    }
  }

  const ssrPaths = new Set(ROTAS_SSR_CANONICAS.map((r) => new URL(SITE_URL + r).pathname));
  const extras = [...pathSitemap].filter((r) => !rotasIndexaveisHtml.has(r) && !ssrPaths.has(r));
  if (extras.length) {
    problemas.htmlIndexavelForaDoSitemap += extras.length;
    for (const r of extras.slice(0, 12 - exemplos.length)) {
      if (exemplos.length < 12) exemplos.push({ url: r, problema: 'URL no sitemap sem HTML indexável correspondente' });
    }
  }

  for (const p of postsBlog.filter((p) => p.published)) {
    for (const rel of p.relatedPages) {
      const norm = rel.replace(/\/+$/, '') || '/';
      if (!pathSitemap.has(norm)) {
        problemas.relatedPageForaSitemap++;
        if (exemplos.length < 12) exemplos.push({ url: `${p.file}`, problema: `relatedPages ${rel} inexistente ou fora do sitemap` });
      }
    }
  }

  const ssrFaltando = ROTAS_SSR_CANONICAS.filter((r) => !unicos.has(relSsr(r)));
  if (ssrFaltando.length) {
    console.error(`[validate-build] FALHA: rotas SSR canônicas ausentes no sitemap: ${ssrFaltando.join(', ')}`);
    fail = true;
  }
  for (const rota of ROTAS_INSTITUCIONAIS) {
    const esperada = `${SITE_URL}${rota}`;
    const ocorrencias = locs.filter((l) => l === esperada).length;
    if (ocorrencias !== 1) {
      problemas.institucionalForaSitemap++;
      if (exemplos.length < 12) exemplos.push({ url: rota, problema: `página institucional aparece ${ocorrencias} vez(es) no sitemap, esperado 1` });
    }
  }
  if (unicos.size !== locs.length) {
    console.error(`[validate-build] FALHA: sitemap com URLs duplicadas (${locs.length} total, ${unicos.size} únicas).`);
    fail = true;
  }
  const invalidas = unicosPerigoso(locs);
  if (invalidas.length) {
    console.error(`[validate-build] FALHA: sitemap contém URLs inválidas: ${invalidas.join(', ')}`);
    fail = true;
  }
  const esperadoUnicas = rotasIndexaveisHtml.size + ROTAS_SSR_CANONICAS.length;
  console.log(`[validate-build] igualdade HTML indexável x sitemap: ${rotasIndexaveisHtml.size} indexáveis + ${ROTAS_SSR_CANONICAS.length} SSR = ${esperadoUnicas} esperado`);
  if (unicos.size !== esperadoUnicas) {
    console.error(`[validate-build] FALHA: sitemap com ${unicos.size} URLs únicas, esperado ${esperadoUnicas} (${rotasIndexaveisHtml.size} HTML indexável + ${ROTAS_SSR_CANONICAS.length} SSR canônicas).`);
    fail = true;
  }
  const ocorrenciasHome = locs.filter((l) => {
    try {
      return new URL(l).pathname === '/';
    } catch {
      return false;
    }
  }).length;
  console.log(`[validate-build] "/" no sitemap: ${ocorrenciasHome} vez(es)`);
  if (ocorrenciasHome !== 1) {
    console.error(`[validate-build] FALHA: "/" deve ocorrer exatamente 1 vez no sitemap (encontrado ${ocorrenciasHome}).`);
    fail = true;
  }
  if (temHomeEstatica) {
    const linksHome = extrairRotasInternas(fs.readFileSync(homeIndex, 'utf-8'));
    for (const rota of linksHome) {
      if (/null|undefined/i.test(rota)) {
        console.error(`[validate-build] FALHA: link interno inválido na home: ${rota}`);
        fail = true;
      } else if (!pathSitemap.has(rota)) {
        console.error(`[validate-build] FALHA: link interno da home fora do sitemap: ${rota}`);
        fail = true;
      }
    }
    console.log(`[validate-build] links internos da home conferidos contra o sitemap (${linksHome.size} únicos)`);
  }
}

const errosIndexing = checarIndexingApiRemovida();
if (errosIndexing.length) {
  for (const e of errosIndexing) console.error(`[validate-build] FALHA: ${e}`);
  fail = true;
}

if (fail) {
  console.error('[validate-build] RESULTADO: FALHOU. Revisar problemas acima.');
  process.exit(1);
}

console.log('[validate-build] RESULTADO: OK');