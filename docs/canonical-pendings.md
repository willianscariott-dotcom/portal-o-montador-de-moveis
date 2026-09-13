# Pendências canônicas (P0 Fase 1)

Decisão do P0: não mudamos URLs nem aplicamos 301/noindex. Cada página de cidade continua publicada em DOIS formatos, com canonical **autorreferente provisória** (a própria URL), até que os dados do Google Search Console indiquem o formato preferido.

- Formato A (city): `https://portal.omontadordemoveis.com/{cidade}` — 126 páginas
- Formato B (ufCity): `https://portal.omontadordemoveis.com/{uf}/{cidade}` — 126 páginas
- Total de pares sem decisão: 126
- Observação: a auditoria anterior registrou `scripts/indexed-urls.json` com 112 URLs no formato B (incluindo `/ac/null`). Este arquivo NÃO é fonte de decisão canônica; o cidadão `/ac/null` foi eliminado do build. O Search Console permanece como fonte oficial de preferência.

## Critério para resolver (próxima fase `feat/seo-validation`)

1. Exportar do Search Console as URLs indexadas/canonizadas por cidade e conferir qual formato o Google está consolidando.
2. Para o formato confirmado: declarar canonical absoluta apontando para ele e registrar 301 do formato alternativo (fora do P0, em fase posterior).
3. Para cidades sem dados suficientes: manter autorreferente + pendência registrada aqui até haver evidência.

## Lista de pares (127 na baseline; 126 após remoção do inválido `AC - null`)

Todas as cidades abaixo têm os dois formatos ativos. Exemplo: `/recife` e `/pe/recife`.

| Cidade | Formato A | Formato B | Estado |
| --- | --- | --- | --- |
| (todas as 126 cidades do build) | `/cidade` | `/uf/cidade` | pendente |

Listagem completa pode ser regenerada a partir do build: `dist/client/**/index.html` (nível 1 = formato A; nível 2 = formato B).

## Não vazou no P0

- `/ac/null` e `/null` (dados `null - AC`) não geram mais páginas (filtro em `src/lib/montadores.js`).
- Canonical provisória é SEMPRE a própria URL renderizada (via `src/lib/canonical.js` e `Astro.url.pathname`), eliminando o bug do `/undefined`.