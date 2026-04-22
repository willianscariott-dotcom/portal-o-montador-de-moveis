import { createReadStream, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import csv from 'csv-parser';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIN_STARS = 4;

function normalizeState(state) {
  if (!state) return null;
  const map = {
    'State of Rio Grande do Sul': 'Rio Grande do Sul',
    'State of Paraná': 'Paraná',
    'State of São Paulo': 'São Paulo',
    'State of Minas Gerais': 'Minas Gerais',
    'State of Espírito Santo': 'Espírito Santo',
    'State of Santa Catarina': 'Santa Catarina',
    'State of Rio de Janeiro': 'Rio de Janeiro',
    'State of Bahia': 'Bahia',
    'State of Ceará': 'Ceará',
    'State of Pernambuco': 'Pernambuco',
    'State of Rio Grande do Norte': 'Rio Grande do Norte',
    'State of Paraíba': 'Paraíba',
    'State of Alagoas': 'Alagoas',
    'State of Sergipe': 'Sergipe',
    'State of Piauí': 'Piauí',
    'State of Maranhão': 'Maranhão',
    'State of Pará': 'Pará',
    'State of Amazonas': 'Amazonas',
    'State of Goiás': 'Goiás',
    'State of Mato Grosso': 'Mato Grosso',
    'State of Mato Grosso do Sul': 'Mato Grosso do Sul',
    'State of Distrito Federal': 'Distrito Federal',
    'State of Acre': 'Acre',
    'State of Rondônia': 'Rondônia',
    'State of Roraima': 'Roraima',
    'State of Amapá': 'Amapá',
    'State of Tocantins': 'Tocantins'
  };
  return map[state] || state.replace('State of ', '');
}

function extractPlaceId(url) {
  if (!url) return null;
  const match = url.match(/(?:placeid|query_place_id)=([^&]+)/);
  return match ? match[1] : null;
}

async function fetchReviewsForPlace(placeId, apiKey) {
  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}?fields=reviews`;
    const response = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`   Erro HTTP ${response.status}:`, JSON.stringify(errorData));
      return [];
    }
    const data = await response.json();
    return data.reviews || [];
  } catch (error) {
    console.error(`Erro ao buscar reviews para ${placeId}:`, error.message);
    return [];
  }
}

function filterAndProcessReviews(reviews, state, montadorName) {
  return reviews
    .filter(r => {
      const rating = r.rating || r.relativeScore || 0;
      const text = r.text?.text || r.originalText?.text || '';
      return rating >= MIN_STARS && text && text.length > 0;
    })
    .map(r => {
      const text = r.text?.text || r.originalText?.text || '';
      return {
        author: r.authorAttribution?.displayName || 'Cliente',
        rating: r.rating || r.relativeScore || MIN_STARS,
        text: text,
        state: normalizeState(state),
        montadorName,
        textLength: text.length
      };
    })
    .sort((a, b) => b.textLength - a.textLength);
}

function parseCSVStream(filepath) {
  return new Promise((resolve, reject) => {
    const results = [];
    createReadStream(filepath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

async function main() {
  console.log('🔍 Iniciando extração de avaliações...\n');

  const csvPath = join(__dirname, '..', 'montadores_novo.csv');
  const records = await parseCSVStream(csvPath);

  const uniqueLinks = new Map();
  for (const row of records) {
    const link = row.reviews_link?.trim() || row.url?.trim() || '';
    const name = row.name || row.title || '';
    const state = row.state || '';
    
    if (link && !uniqueLinks.has(link)) {
      uniqueLinks.set(link, {
        name,
        state,
        county: row.county
      });
    }
  }

  console.log(`📊 ${uniqueLinks.size} URLs únicas encontradas\n`);

  const allReviews = [];
  let processed = 0;

  for (const [link, info] of uniqueLinks) {
    processed++;
    const placeId = extractPlaceId(link);
    console.log('ID extraído:', placeId, '- Empresa:', info.name || 'N/A');
    if (!placeId) continue;

    process.stdout.write(`\r⏳ Processando ${processed}/${uniqueLinks.size}...`);

    try {
      const reviewData = await fetchReviewsForPlace(placeId, process.env.GOOGLE_PLACES_API_KEY);
      const filtered = filterAndProcessReviews(reviewData, info.state, info.name);
      allReviews.push(...filtered);
    } catch (error) {
      console.warn(`⚠️  ${placeId}: não encontrado ou erro - ${error.message}`);
    }

    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n\n✅ ${allReviews.length} avaliações extraídas`);

  const byState = {};
  for (const review of allReviews) {
    if (!byState[review.state]) byState[review.state] = [];
    byState[review.state].push(review);
  }

  console.log('\n📍 Avaliações por Estado:');
  for (const [state, reviews] of Object.entries(byState)) {
    console.log(`   ${state}: ${reviews.length} avaliações`);
  }

  const outputPath = join(__dirname, '..', 'src', 'data', 'avaliacoes_reais.json');
  writeFileSync(outputPath, JSON.stringify({ reviews: allReviews, byState, extractedAt: new Date().toISOString() }, null, 2));

  console.log(`\n💾 Salvo em: ${outputPath}`);

  const statesNeedingMore = Object.entries(byState)
    .filter(([_, reviews]) => reviews.length < 5)
    .map(([state, reviews]) => `${state} (${reviews.length} avaliações)`);

  if (statesNeedingMore.length > 0) {
    console.warn('\n⚠️  Estados com menos de 5 avaliações:');
    for (const s of statesNeedingMore) console.warn(`   - ${s}`);
  } else {
    console.log('\n✅ Todos os estados têm avaliações suficientes!');
  }
}

main().catch(console.error);