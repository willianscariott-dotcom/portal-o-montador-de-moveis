import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string().min(10).max(70),
    description: z.string().min(50).max(160),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    authorId: z.string(),
    reviewerId: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()).max(8).default([]),
    searchIntent: z.enum(['informational', 'commercial', 'navigational']),
    mainQuery: z.string(),
    secondaryQueries: z.array(z.string()).max(12).default([]),
    relatedPages: z.array(z.string().startsWith('/')).max(12).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    sources: z.array(z.object({
      title: z.string(),
      url: z.string().url(),
      publisher: z.string().optional(),
      accessedAt: z.coerce.date().optional()
    })).default([]),
    draft: z.boolean().default(false),
    noindex: z.boolean().default(false),
    featured: z.boolean().default(false),
    faq: z.array(z.object({
      question: z.string(),
      answer: z.string()
    })).max(8).optional()
  }).refine(data => {
    if (data.updatedAt && data.publishedAt) {
      return data.updatedAt >= data.publishedAt;
    }
    return true;
  }, { message: "updatedAt não pode ser anterior a publishedAt" })
  .refine(data => {
    return (data.image && data.imageAlt) || (!data.image && !data.imageAlt);
  }, { message: "image e imageAlt devem ser preenchidos juntos" })
});

export const collections = { blog };
