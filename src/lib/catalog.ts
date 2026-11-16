import 'server-only';
import { configured, publicDb } from './supabase';
import type { Product, Category } from './types';
import { settingsSchema } from './schemas';
export const productSelect =
  '*,product_categories(category_id),product_variants(*),product_field_values(field_id,value),product_images(id,alt,position,asset_id,media_assets(path))';
export const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export async function settings() {
  if (!configured())
    return {
      data: settingsSchema.parse({
        name: 'NextSV',
        headline: 'Tu catálogo, más cerca',
        description: 'Estamos preparando nuestro catálogo.',
      }),
      connected: false,
    };
  const { data, error } = await publicDb().rpc('public_settings');
  if (error)
    throw new Error('No se pudo consultar la información del negocio.');
  return { data: settingsSchema.parse(data), connected: true };
}
export async function imageUrls(products: Product[]) {
  const client = publicDb();
  return Promise.all(
    products.map(async (p) => ({
      ...p,
      product_images: await Promise.all(
        (p.product_images || [])
          .sort((a, b) => a.position - b.position)
          .map(async (i) => {
            const path = i.media_assets?.path;
            if (!path) return i;
            const { data } = await client.storage
              .from('catalog')
              .createSignedUrl(path, 3600);
            return { ...i, url: data?.signedUrl };
          }),
      ),
    })),
  );
}
export async function catalog(params: Record<string, string | undefined> = {}) {
  if (!configured())
    return {
      products: [] as Product[],
      count: 0,
      categories: [] as Category[],
      connected: false,
    };
  const client = publicDb();
  let q = client.from('products').select(productSelect, { count: 'exact' });
  if (params.q)
    q = q.textSearch('name', params.q, {
      type: 'websearch',
      config: 'spanish',
    });
  if (params.min) q = q.gte('price', Number(params.min));
  if (params.max) q = q.lte('price', Number(params.max));
  if (params.stock === 'yes') q = q.gt('stock', 0);
  if (params.featured === 'yes') q = q.eq('featured', true);
  if (params.category) {
    const { data, error } = await client
      .from('product_categories')
      .select('product_id')
      .eq('category_id', params.category);
    if (error) throw new Error('No se pudieron consultar las categorías.');
    q = q.in(
      'id',
      (data || []).map((v) => v.product_id),
    );
  }
  if (params.color) {
    const { data, error } = await client
      .from('product_variants')
      .select('product_id')
      .eq('color', params.color);
    if (error) throw new Error('No se pudieron consultar las variantes.');
    q = q.in(
      'id',
      (data || []).map((v) => v.product_id),
    );
  }
  if (params.field && params.value) {
    const { data, error } = await client
      .from('product_field_values')
      .select('product_id')
      .eq('field_id', params.field)
      .eq('value', JSON.stringify(params.value));
    if (error) throw new Error('No se pudieron consultar los atributos.');
    q = q.in(
      'id',
      (data || []).map((v) => v.product_id),
    );
  }
  const sort =
    params.sort === 'price_asc'
      ? 'price'
      : params.sort === 'price_desc'
        ? 'price'
        : params.sort === 'popular'
          ? 'views'
          : 'created_at';
  const page = Math.max(1, Math.min(1000, Number(params.page) || 1));
  q = q
    .order(sort, { ascending: params.sort === 'price_asc' })
    .order('id')
    .range((page - 1) * 12, page * 12 - 1);
  const [{ data, error, count }, { data: cats, error: catError }] =
    await Promise.all([
      q,
      client.from('categories').select('*').order('position'),
    ]);
  if (error || catError)
    throw new Error('El catálogo no está disponible temporalmente.');
  return {
    products: await imageUrls((data || []) as Product[]),
    count: count || 0,
    categories: (cats || []) as Category[],
    connected: true,
  };
}
export async function product(slug: string) {
  if (!configured()) return null;
  const { data, error } = await publicDb()
    .from('products')
    .select(productSelect)
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error('No se pudo consultar el producto.');
  return data ? (await imageUrls([data as Product]))[0] : null;
}
export function money(value: number) {
  return new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export async function brandingUrl(id?: string) {
  if (!id || !configured()) return undefined;
  const client = publicDb();
  const { data } = await client
    .from('media_assets')
    .select('path')
    .eq('id', id)
    .maybeSingle();
  if (!data) return undefined;
  const { data: s } = await client.storage
    .from('catalog')
    .createSignedUrl(data.path, 3600);
  return s?.signedUrl;
}
