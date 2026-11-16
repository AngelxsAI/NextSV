import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mutation, apiError, dbError, jsonBody } from '@/lib/http';
import { detectFile } from '@/lib/files';
import { requireStaff } from '@/lib/supabase';
export async function POST(req: Request) {
  try {
    const { client, user } = await mutation(req, 'media.write');
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size > 5242880 || file.size < 1)
      throw new Error('Selecciona una imagen de hasta 5 MB.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = detectFile(bytes);
    if (!mime || mime !== file.type)
      throw new Error('Solo se aceptan imágenes PNG, JPEG y WebP válidas.');
    const path = `${user.id}/${crypto.randomUUID()}.${mime.split('/')[1]}`;
    const { error } = await client.storage
      .from('catalog')
      .upload(path, bytes, {
        contentType: mime,
        upsert: false,
        cacheControl: '3600',
      });
    dbError(error);
    const { data: asset, error: assetError } = await client
      .from('media_assets')
      .insert({
        path,
        mime_type: mime,
        size_bytes: file.size,
        owner_id: user.id,
      })
      .select()
      .single();
    if (assetError) {
      await client.storage.from('catalog').remove([path]);
      dbError(assetError);
    }
    const productId = form.get('product_id');
    if (productId) {
      z.uuid().parse(productId);
      const { error: linkError } = await client
        .from('product_images')
        .insert({
          product_id: productId,
          asset_id: asset.id,
          alt: String(form.get('alt') || 'Producto').slice(0, 300),
          position: Number(form.get('position') || 0),
        });
      dbError(linkError);
    }
    const { data: signed } = await client.storage
      .from('catalog')
      .createSignedUrl(path, 3600);
    return NextResponse.json({ ...asset, url: signed?.signedUrl });
  } catch (e) {
    return apiError(e);
  }
}
export async function GET() {
  try {
    const { client } = await requireStaff();
    const { data, error } = await client
      .from('media_assets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    dbError(error);
    const assets = await Promise.all(
      (data || []).map(async (a) => {
        const { data: s } = await client.storage
          .from('catalog')
          .createSignedUrl(a.path, 3600);
        return { ...a, url: s?.signedUrl };
      }),
    );
    return NextResponse.json(assets);
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(req: Request) {
  try {
    const { client } = await mutation(req, 'catalog.write');
    const input = z
      .object({
        images: z
          .array(
            z.object({
              id: z.uuid(),
              position: z.number().int().min(0),
              alt: z.string().min(1).max(300),
            }),
          )
          .max(30),
      })
      .parse(await jsonBody(req));
    for (const i of input.images) {
      const { error } = await client
        .from('product_images')
        .update({ position: i.position, alt: i.alt })
        .eq('id', i.id);
      dbError(error);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(req: Request) {
  try {
    const { client } = await mutation(req, 'catalog.write');
    const { id } = z.object({ id: z.uuid() }).parse(await jsonBody(req));
    const { error } = await client.from('product_images').delete().eq('id', id);
    dbError(error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
