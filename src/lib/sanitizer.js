export function sanitizeMontadores(montadores) {
  if (!montadores || !Array.isArray(montadores)) {
    return [];
  }

  const phonesSeen = new Map();
  const montadoresUnicos = [];

  for (const m of montadores) {
    if (!m.whatsapp) {
      continue;
    }

    const phoneClean = m.whatsapp.toString().replace(/\D/g, '').replace(/^55/, '');

    if (phonesSeen.has(phoneClean)) {
      continue;
    }

    phonesSeen.set(phoneClean, true);
    montadoresUnicos.push(m);
  }

  return montadoresUnicos;
}

export function sanitizeNota(nota, reviewsCount, hasLink) {
  if ((!nota || nota === 0 || nota === null || nota === undefined) && !hasLink) {
    return { nota: 5, reviews: 1 };
  }
  return { nota: nota || 5, reviews: reviewsCount || 0 };
}

export function sanitizeCidade(cidadeEstado) {
  if (!cidadeEstado || typeof cidadeEstado !== 'string') {
    return null;
  }

  const cleaned = cidadeEstado.trim();

  if (cleaned.length < 6) {
    return null;
  }

  const parts = cleaned.split(' - ');
  if (parts.length !== 2) {
    return null;
  }

  const [cidade, uf] = parts;
  if (!cidade || cidade.length < 3 || !uf || uf.length !== 2) {
    return null;
  }

  return cleaned;
}

export function sanitizeMontadorCompleto(m) {
  const cidadeValida = sanitizeCidade(m.cidade_estado);
  if (!cidadeValida) {
    return null;
  }

  const linkGoogle = m.link_google_empresas;
  const { nota, reviews } = sanitizeNota(m.totalScore, m.reviewsCount, linkGoogle);

  const [nomeCidade, estado] = cidadeValida.split(' - ');

  return {
    nome_completo: m.nome_completo,
    whatsapp: m.whatsapp,
    cidade_estado: cidadeValida,
    link_google_empresas: linkGoogle || null,
    totalScore: nota,
    reviewsCount: reviews,
    foto_url: m.foto_url,
    nomeCidade: nomeCidade,
    estado: estado,
    bairro_zona: m.bairro_zona || null
  };
}

export function filtrarEMontadores(montadores) {
  if (!montadores || !Array.isArray(montadores)) {
    return [];
  }

  const sanitizados = montadores.map(sanitizeMontadorCompleto).filter(Boolean);

  const dedup = sanitizeMontadores(sanitizados);

  return dedup;
}