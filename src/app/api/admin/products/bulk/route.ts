import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mutation, jsonBody, apiError, dbError } from '@/lib/http';
const schema = z.object({
  ids: z.array(z.uuid()).min(1).max(100),
  action: z.enum(['archive', 'trash', 'restore', 'unpublish']),
});
export async function POST(req: Request) {
  try {
    const { client } = await mutation(req, 'catalog.write');
    const { ids, action } = schema.parse(await jsonBody(req));
    const patch =
      action === 'trash'
        ? { deleted_at: new Date().toISOString(), status: 'draft' }
        : action === 'restore'
          ? { deleted_at: null, status: 'draft' }
          : { status: action === 'archive' ? 'archived' : 'draft' };
    const { error } = await client.from('products').update(patch).in('id', ids);
    dbError(error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
