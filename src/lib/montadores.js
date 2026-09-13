import { supabase } from './supabase';
import { slugify } from './canonical';

const UFS_VALIDAS = new Set([
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
  'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'
]);

const NOMES_RESERVADOS = new Set([
  'null', 'undefined', 'nan', 'sem cidade', 'sem-cidade',
  'nao informado', 'nao-informado', 'indefinido', 'n/a', 'n-a', 'na', 'cidade', 'estado'
]);

function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function parseCidadeEstado(cidadeEstado) {
  if (!cidadeEstado || typeof cidadeEstado !== 'string') return null;

  const partes = cidadeEstado.trim().split(' - ');
  if (partes.length !== 2) return null;

  const [nomeRaw, ufRaw] = partes;
  const nome = (nomeRaw || '').trim();
  const uf = (ufRaw || '').trim().toUpperCase();

  if (nome.length < 3 || !/^[A-Z]{2}$/.test(uf)) return null;
  if (!UFS_VALIDAS.has(uf)) return null;

  const nomeSlug = slugify(nome);
  if (nomeSlug.length < 3) return null;

  const nomeNorm = normalizar(nome);
  if (NOMES_RESERVADOS.has(nomeNorm) || NOMES_RESERVADOS.has(nomeSlug)) return null;

  return { nome, uf, nomeSlug, ufSlug: uf.toLowerCase() };
}

export async function buscarMontadores(colunas = ['*']) {
  const todos = [];
  const POR_PAGINA = 1000;
  let inicio = 0;

  while (true) {
    const { data, error } = await supabase
      .from('tabela_montadores')
      .select(colunas.join(','))
      .range(inicio, inicio + POR_PAGINA - 1);

    if (error) {
      throw new Error(`Supabase indisponível na geração de rotas: ${error.message}. Build abortado para não publicar um site sem páginas de cidade.`);
    }

    const linhas = data || [];
    todos.push(...linhas);

    if (linhas.length < POR_PAGINA) break;
    inicio += POR_PAGINA;
  }

  return todos;
}

export function montadoresValidosPorCidade(montadores, nomeCidade, uf) {
  const alvo = normalizar(nomeCidade);
  return montadores.filter((m) => {
    const p = parseCidadeEstado(m.cidade_estado);
    if (!p) return false;
    if (uf && p.uf !== uf.toUpperCase()) return false;
    return normalizar(p.nome) === alvo;
  });
}

export function montadoresValidosPorZona(montadores, nomeCidade, uf, nomeZona) {
  const alvoCidade = normalizar(nomeCidade);
  const alvoZona = normalizar(nomeZona);
  return montadores.filter((m) => {
    const p = parseCidadeEstado(m.cidade_estado);
    if (!p) return false;
    if (p.uf !== uf.toUpperCase()) return false;
    if (normalizar(p.nome) !== alvoCidade) return false;
    const zona = normalizar(m.bairro_zona);
    if (!zona) return false;
    return zona === alvoZona || zona === 'todos os bairros';
  });
}

export function listarCidades(montadores) {
  const map = new Map();
  for (const m of montadores) {
    const p = parseCidadeEstado(m.cidade_estado);
    if (!p) continue;
    if (!map.has(p.nomeSlug)) {
      map.set(p.nomeSlug, { id: p.nomeSlug, nome: p.nome, estadoSigla: p.uf });
    }
  }
  return Array.from(map.values());
}

export function listarCidadesComEstado(montadores) {
  const map = new Map();
  for (const m of montadores) {
    const p = parseCidadeEstado(m.cidade_estado);
    if (!p) continue;
    const chave = `${p.ufSlug}/${p.nomeSlug}`;
    if (!map.has(chave)) {
      map.set(chave, { estado: p.ufSlug, estadoSigla: p.uf, nomeCidade: p.nome, id: p.nomeSlug });
    }
  }
  return Array.from(map.values());
}

export function listarZonas(montadores) {
  const map = new Map();
  for (const m of montadores) {
    const p = parseCidadeEstado(m.cidade_estado);
    if (!p) continue;

    const zonaRaw = String(m.bairro_zona ?? '').trim();
    if (!zonaRaw) continue;

    const zonaNorm = normalizar(zonaRaw);
    const zonaSlug = slugify(zonaRaw);
    if (zonaNorm === 'todos os bairros' || zonaNorm === '' || zonaSlug.length < 3) continue;
    if (NOMES_RESERVADOS.has(zonaNorm) || NOMES_RESERVADOS.has(zonaSlug)) continue;

    const chave = `${p.ufSlug}/${p.nomeSlug}/${zonaSlug}`;
    if (!map.has(chave)) {
      map.set(chave, {
        estado: p.ufSlug,
        estadoSigla: p.uf,
        nomeCidade: p.nome,
        idCidade: p.nomeSlug,
        nomeZona: zonaRaw,
        idZona: zonaSlug
      });
    }
  }
  return Array.from(map.values());
}