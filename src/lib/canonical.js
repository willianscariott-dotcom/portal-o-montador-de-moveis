export function slugify(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function canonicalUrl(pathname, siteUrl) {
  const base = String(siteUrl || 'https://portal.omontadordemoveis.com').replace(/\/+$/, '');
  if (!pathname || pathname === '/') return base;
  const path = String(pathname).split('?')[0].replace(/\/+$/, '') || '/';
  return `${base}${path === '/' ? '/' : path}`;
}
