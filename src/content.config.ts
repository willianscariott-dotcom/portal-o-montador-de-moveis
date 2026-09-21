import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Slug/ID padrao: kebab-case minusculo (ex: guia-montagem-rack-tv).
const PADRAO_SLUG = '^[a-z0-9]+(?:-[a-z0-9]+)*$';
const slugComum = z.string().trim().min(1).regex(new RegExp(PADRAO_SLUG));

// Caminho interno absoluto: "/" ou "/sao-paulo".
// Rejeita protocol-relative ("//host"), "\", http(s)://, query ("?") e fragmento ("#").
const caminhoInterno = z
  .string()
  .trim()
  .refine((v) => {
    if (v === '/') return true;
    return (
      v.startsWith('/') &&
      !v.startsWith('//') &&
      !v.includes('\\') &&
      !/^https?:\/\//i.test(v) &&
      !/[?#]/.test(v)
    );
  }, 'relatedPages deve ser "/" ou um caminho interno absoluto (ex: /sao-paulo)');

// Imagem publica: apenas https:// absoluto ou caminho publico /images/...
// Rejeita "./x", "../x", "//host", "http://" e string vazia.
const imagemPublica = z
  .string()
  .trim()
  .refine((v) => /^https:\/\//i.test(v) || /^\/[^/?#\\\s]/.test(v), 'image deve ser https:// absoluto ou caminho publico /...');

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z
    .object({
      title: z.string().trim().min(10).max(70),
      description: z.string().trim().min(50).max(160),
      slug: slugComum,
      publishedAt: z.coerce
        .date()
        .refine((d) => !Number.isNaN(d.valueOf()), 'publishedAt deve ser uma data valida'),
      updatedAt: z.coerce.date().optional(),
      authorId: z.string().trim().min(1).regex(new RegExp(PADRAO_SLUG)),
      reviewerId: z.string().trim().min(1).optional(),
      category: z.string().trim().min(1),
      tags: z.array(z.string().trim().min(1)).max(8).default([]),
      searchIntent: z.enum(['informational', 'commercial', 'navigational']),
      mainQuery: z.string().trim().min(1),
      secondaryQueries: z.array(z.string().trim().min(1)).max(12).default([]),
      relatedPages: z.array(caminhoInterno).max(12).default([]),
      image: imagemPublica.optional(),
      imageAlt: z.string().trim().min(1).optional(),
      sources: z
        .array(
          z.object({
            title: z.string().trim().min(1),
            url: z.string().url(),
            publisher: z.string().trim().optional(),
            accessedAt: z.coerce.date().optional(),
          })
        )
        .default([]),
      draft: z.boolean().default(false),
      noindex: z.boolean().default(false),
      featured: z.boolean().default(false),
      faq: z
        .array(
          z.object({
            question: z.string().trim().min(1),
            answer: z.string().trim().min(1),
          })
        )
        .max(8)
        .optional(),
    })
    .refine(
      (data) => {
        if (data.updatedAt && data.publishedAt) {
          return data.updatedAt >= data.publishedAt;
        }
        return true;
      },
      { message: 'updatedAt nao pode ser anterior a publishedAt' }
    )
    .refine(
      (data) => !data.image || Boolean(data.imageAlt),
      { message: 'image exige imageAlt' }
    ),
});

export const collections = { blog };