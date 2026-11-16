import type { MetadataRoute } from 'next';
import { configured, publicDb } from '@/lib/supabase';
import { siteUrl } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  if (!configured()) return [];
  const client = publicDb();
  const products: { slug: string; updated_at: string }[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await client
      .from('products')
      .select('slug,updated_at')
      .order('id')
      .range(start, start + 999);
    if (error) throw new Error('No se pudo generar el sitemap.');
    products.push(...data);
    if (data.length < 1000) break;
  }
  const { data: pages, error } = await client.rpc('public_pages');
  if (error) throw new Error('No se pudo generar el sitemap.');
  return [
    { url: base },
    { url: `${base}/catalogo` },
    ...products.map((p) => ({
      url: `${base}/producto/${p.slug}`,
      lastModified: p.updated_at,
    })),
    ...(pages || []).map((p: { slug: string; updated_at: string }) => ({
      url: `${base}/informacion/${p.slug}`,
      lastModified: p.updated_at,
    })),
  ];
}
