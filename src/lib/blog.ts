import type { CollectionEntry } from 'astro:content';

export const BLOG_PAGE_SIZE = 9;
export const BLOG_BASE = '/blog';
export type BlogPost = CollectionEntry<'blog'>;
export const BLOG_SORT_MODES = ['latest', 'oldest', 'shortest', 'longest', 'title', 'most-read'] as const;
export type BlogSortMode = typeof BLOG_SORT_MODES[number];

export function publishedPosts(posts: BlogPost[]) {
  return posts
    .filter((post) => !post.data.draft)
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime() || Number(b.data.featured) - Number(a.data.featured) || a.id.localeCompare(b.id));
}

export function sortPosts(posts: BlogPost[], mode: BlogSortMode = 'latest') {
  return [...posts].sort((a, b) => {
    if (mode === 'oldest') return a.data.pubDate.getTime() - b.data.pubDate.getTime() || a.id.localeCompare(b.id);
    if (mode === 'shortest') return readingTime(a.body) - readingTime(b.body) || b.data.pubDate.getTime() - a.data.pubDate.getTime() || a.id.localeCompare(b.id);
    if (mode === 'longest') return readingTime(b.body) - readingTime(a.body) || b.data.pubDate.getTime() - a.data.pubDate.getTime() || a.id.localeCompare(b.id);
    if (mode === 'title') return a.data.title.localeCompare(b.data.title) || b.data.pubDate.getTime() - a.data.pubDate.getTime();
    if (mode === 'most-read') return (b.data.viewCount ?? 0) - (a.data.viewCount ?? 0) || b.data.pubDate.getTime() - a.data.pubDate.getTime() || a.id.localeCompare(b.id);
    return b.data.pubDate.getTime() - a.data.pubDate.getTime() || Number(b.data.featured) - Number(a.data.featured) || a.id.localeCompare(b.id);
  });
}

export function hasViewCounts(posts: BlogPost[]) {
  return posts.length > 0 && posts.every((post) => post.data.viewCount !== undefined);
}

export function sortBasePath(base: string, mode: BlogSortMode) {
  return mode === 'latest' ? `${base}/` : `${base}/sort/${mode}/`;
}

export function sortModesFor(posts: BlogPost[]): BlogSortMode[] {
  return BLOG_SORT_MODES.filter((mode) => mode !== 'most-read' || hasViewCounts(posts));
}

export function slugify(value: string) {
  return value.toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function categoriesFor(posts: BlogPost[]) {
  const counts = new Map<string, { name: string; count: number }>();
  for (const post of posts) for (const name of post.data.categories) {
    const slug = slugify(name);
    const existing = counts.get(slug);
    counts.set(slug, { name, count: (existing?.count ?? 0) + 1 });
  }
  return [...counts.entries()].map(([slug, value]) => ({ slug, ...value })).sort((a, b) => a.name.localeCompare(b.name));
}

export function readingTime(body: string | undefined) {
  const words = (body ?? '').replace(/```[\s\S]*?```/g, ' ').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export function postUrl(post: BlogPost) { return `${BLOG_BASE}/${post.id.replace(/\.(md|mdx)$/, '')}/`; }
export function categoryUrl(slug: string) { return `${BLOG_BASE}/category/${slug}/`; }
