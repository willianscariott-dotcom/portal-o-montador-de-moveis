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

- `npm run build` — build Astro + gera `sitemap-index.xml`/`sitemap-0.xml` (gera após o build em `dist/client`).
- `npm run validate` — `node scripts/validate-build.mjs`: confere canonical (sem `/undefined`), título/descrição/h1, JSON-LD, contagem de rotas vs `scripts/baseline-routes.json` e consistência do sitemap.
- `npm run verify` — build + validate (porta de entrada antes de merge/deploy).
- `npm run check` — `astro check`; ATENÇÃO: o repo tem ~200 erros de tipo pré-existentes em scripts inline/estática (modal de lead, formulários, tipagem de frontmatter). Não fazem parte do P0; não agrave e corrija apenas erros novos introduzidos no diff.

## Load de dados (build)

- `src/lib/montadores.js` centraliza leitura do Supabase (`buscarMontadores` é paginado e lança erro para ABORTAR o build se o Supabase falhar — nunca retornar `[]` vazio que publicaria site sem páginas de cidade).
- `parseCidadeEstado` valida `cidade_estado` (formato `Cidade - UF`, UF real, rejeita `null/undefined/nao informado` etc.) e os helpers `montadoresValidosPorCidade`, `montadoresValidosPorZona`, `listarCidades`, `listarCidadesComEstado`, `listarZonas` filtram dados inválidos na publicação (não no banco).
- Canonical: sempre derivado de `Astro.url.pathname` via `src/lib/canonical.js` (nunca de `Astro.props.cidade`). Params de rota ficam em `Astro.params`.

## Pendências conhecidas

- Pares canônicos `/cidade` vs `/uf/cidade` (127 cidades) ainda sem decisão de preferência — ver `docs/canonical-pendings.md`.