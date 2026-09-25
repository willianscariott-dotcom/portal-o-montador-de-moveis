import type { ImageMetadata } from 'astro';
import authorPhoto from '../assets/authors/willian-scariott.jpeg';

export interface Author {
  id: string;
  name: string;
  jobTitle: string;
  bio: string;
  location: string;
  photo: ImageMetadata;
  pageUrl: string;
}

const AUTHORS: Readonly<Record<string, Author>> = {
  'willian-scariott': {
    id: 'willian-scariott',
    name: 'Willian Scariott',
    jobTitle: 'Criador e editor do Portal O Montador de Móveis',
    bio: 'Willian Scariott é criador e editor do Portal O Montador de Móveis. Trabalha há cinco anos com projetos de móveis e há um ano com criação de sites. Criou o Portal em fevereiro de 2026 para ampliar as oportunidades de trabalho dos montadores de móveis e conectar clientes que precisam de serviços de montagem a profissionais disponíveis em sua região.',
    location: 'Novo Hamburgo, Rio Grande do Sul',
    photo: authorPhoto,
    pageUrl: '/autor/willian-scariott'
  }
};

export function getAuthorName(authorId: string): string {
  const author = AUTHORS[authorId];
  return author ? author.name : authorId;
}

export function getAuthor(authorId: string): Author | undefined {
  return AUTHORS[authorId];
}

export function listAuthors(): Author[] {
  return Object.values(AUTHORS);
}