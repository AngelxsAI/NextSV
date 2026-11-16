import { NextResponse } from 'next/server';
import { configured, publicDb } from '@/lib/supabase';
import { siteUrl } from '@/lib/catalog';
import { z } from 'zod';
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!configured() || !z.uuid().safeParse(id).success)
    return new Response('No encontrado', { status: 404 });
  const { data } = await publicDb()
    .from('products')
    .select('slug')
    .eq('id', id)
    .maybeSingle();
  return data
    ? NextResponse.redirect(`${siteUrl()}/producto/${data.slug}`, 307)
    : new Response('No encontrado', { status: 404 });
}
