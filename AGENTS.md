# Context Protocol - Portal O Montador

## Hierarquia Semântica

- Uso obrigatório de HTML5 estruturado: `<main>`, `<header>`, `<section>`, `<article>`
- Apenas um `<h1>` por página
- Hierarquia sequencial: h1 > h2 > h3 > h4

## Prevenção de Thin Content

- Cada página de cidade deve possuir 'cobertura de entidades' locais (bairros, regiões)
- Não apenas repetição de palavras-chave
- Incluir dados específicos da locality (bairros, referencias locais)

## Performance (Core Web Vitals)

- Priorizar imagens de próxima geração (WebP)
- Carregamento otimizado para não penalizar pontuação na Vercel
- Lazy loading para imagens abaixo da dobra
- Minificar CSS/JS

## Internal Linking

- Links internos para todas as páginas de cidade
- Uso de URLs semânticas: /porto-alegre, /sao-paulo
- Anchor texts descriptivos com nome da cidade

## SEO Geography

- Meta tags específicas por cidade
- Schema.org localBusiness para cada pagina
- Open Graph com imagens otimizadas

## Comandos de validação

- `npm run build` — apenas build Astro (sem sitemap).
- `npm run sitemap` — `node scripts/generate-sitemap.mjs`: gera `sitemap-index.xml`/`sitemap-0.xml` em `dist/client` com as rotas estáticas + rotas SSR canônicas `/`, `/cadastro`, `/contato`, `/privacidade`, `/termos` (total esperado 310 URLs).
- `npm run validate` — `node scripts/validate-build.mjs`: confere canonical (sem `/undefined`), título/descrição/h1, JSON-LD, contagem de rotas vs `scripts/baseline-routes.json`, presença das rotas SSR canônicas no sitemap, HTML público indevido em `dist/client` (exceto verificação `google<16hex>.html`), placeholders literais `{cidade}`/`{estado}` e consistência do sitemap.
- `npm run verify` — `npm run build && npm run sitemap && npm run validate` (porta de entrada antes de merge/deploy).
- Vercel: `vercel.json` define `buildCommand: "npm run verify"` — build, geração de sitemap e validação rodam em todo deploy; qualquer falha de sitemap/validate aborta o deploy.
- `npm run check` — `astro check`; o repo tem 200 erros de tipo PRÉ-EXISTENTES (206 no `master`, esta branch reduziu 6 e não criou nenhum novo). Ver "Dívida técnica" abaixo. Não agrave e corrija apenas erros novos introduzidos no diff.
- Ambiente Windows/OneDrive: o build Astro apresentou crash nativo intermitente no teardown (`exit 0xC0000409`) — equivale a rodar os passos do `verify` como comandos separados em caso de ocorrência.

## Load de dados (build)

- `src/lib/montadores.js` centraliza leitura do Supabase (`buscarMontadores` é paginado e lança erro para ABORTAR o build se o Supabase falhar — nunca retornar `[]` vazio que publicaria site sem páginas de cidade).
- `parseCidadeEstado` valida `cidade_estado` (formato `Cidade - UF`, UF real, rejeita `null/undefined/nao informado` etc.) e os helpers `montadoresValidosPorCidade`, `montadoresValidosPorZona`, `listarCidades`, `listarCidadesComEstado`, `listarZonas` filtram dados inválidos na publicação (não no banco).
- Canonical: sempre derivado de `Astro.url.pathname` via `src/lib/canonical.js` (nunca de `Astro.props.cidade`). Params de rota ficam em `Astro.params`.

## Pendências conhecidas

- Pares canônicos `/cidade` vs `/uf/cidade` (126 cidades) ainda sem decisão de preferência — ver `docs/canonical-pendings.md`.

## Dívida técnica (astro check)

- `npm run check` reporta **200 erros de tipo** (206 no `master`): está comprovado por comparação `master` vs `fix/seo-p0` que esta branch **reduziu 6 erros e não criou nenhum novo** (delta: `[cidade].astro` −4, `[estado]/[cidade].astro` −2; demais arquivos inalterados; `404.astro` sem erros).
- Origem: scripts inline de modal/lead, formulários e tipagem de frontmatter pré-existentes — **fora do escopo do P0**. Não tentar corrigir em lote sem tarefa dedicada; apenas não agravar nem introduzir erros novos no diff.