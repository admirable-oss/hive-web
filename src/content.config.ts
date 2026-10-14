import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { docsLoader, i18nLoader } from "@astrojs/starlight/loaders";
import { docsSchema, i18nSchema } from "@astrojs/starlight/schema";
import { glob } from "astro/loaders";

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema({
      extend: z.object({
        /** Facts under the docs-home hero (platforms, licence, agents…). */
        heroMeta: z.array(z.string()).optional(),
        /** Upstream source for "View source ↗" in the article footer. */
        source: z.url().optional(),
      }),
    }),
  }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
  blog: defineCollection({
    loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
    schema: z.object({
      title: z.string().min(1),
      description: z.string().min(1).max(320),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      author: z.object({
        name: z.string().min(1),
        role: z.string().optional(),
        url: z.url().optional(),
        avatar: z.string().optional(),
      }),
      categories: z.array(z.string().min(1)).min(1),
      tags: z.array(z.string()).default([]),
      /** Verified aggregate reads, when an analytics source is available. */
      viewCount: z.number().int().nonnegative().optional(),
      cover: z.string().optional(),
      coverAlt: z.string().optional(),
      draft: z.boolean().default(false),
      featured: z.boolean().default(false),
      seo: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        canonical: z.url().optional(),
        noindex: z.boolean().default(false),
      }).optional(),
      faq: z.array(z.object({
        question: z.string().min(1),
        answer: z.string().min(1),
      })).default([]),
      howTo: z.array(z.object({
        name: z.string().min(1),
        text: z.string().min(1),
      })).default([]),
    }),
  }),
};
