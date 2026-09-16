# Remoção da Google Indexing API (P1)

Data: 2026-09-16

## Motivo

A Google Indexing API só atende páginas com tipos específicos de dados
estruturados (`JobPosting`, `BroadcastEvent`, etc.). As páginas comuns de
cidade do portal (diretório de montadores) não são elegíveis para esse
método de envio, portanto os scripts de notificação foram removidos.

## Métodos de descoberta a partir desta mudança

- `sitemap` (gerado por `scripts/generate-sitemap.mjs` no build).
- Google Search Console (inspeção e envio manual de URLs quando necessário).

## Histórico preservado

- `scripts/indexed-urls.json` continha **112 URLs** submetidas em runs
  anteriores.
- O histórico incluía a URL inválida `https://portal.omontadordemoveis.com/ac/null`,
  registro usado apenas para auditoria — as páginas inválidas já estavam
  eliminadas do build (filtro em `src/lib/montadores.js`).

## Arquivos removidos

- `scripts/submit-indexing.js`
- `scripts/indexacao_acelerada.js`
- `scripts/indexar-cidades.js`
- `scripts/forcar_indexacao.js`
- `scripts/indexed-urls.json`
- Comando npm `index:google` (`package.json`)
- Dependências `googleapis` e `xml2js` (`package.json`)

## Nota de execução

Nenhum script de indexação foi executado durante esta mudança. As credenciais
locais (`google-credentials.json`, `service-account.json`) permanecem fora do
Git pelo `.gitignore` e não foram acessadas, exibidas ou modificadas.