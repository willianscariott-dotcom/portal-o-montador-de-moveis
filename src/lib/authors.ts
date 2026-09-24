export interface Author {
  id: string;
  name: string;
}

const AUTHORS: Readonly<Record<string, Author>> = {
  'willian-scariott': {
    id: 'willian-scariott',
    name: 'Willian Scariott'
  }
};

export function getAuthorName(authorId: string): string {
  const author = AUTHORS[authorId];
  return author ? author.name : authorId;
}