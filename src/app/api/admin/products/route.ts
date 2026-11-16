import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/supabase';
import { mutation, jsonBody, apiError, dbError } from '@/lib/http';
import {
  productSchema,
  validateFields,
  type FieldDefinition,
} from '@/lib/schemas';
import { productSelect } from '@/lib/catalog';
export async function GET() {
  try {
    const { client } = await requireStaff();
    const { data, error } = await client
      .from('products')
      .select(productSelect)
      .order('updated_at', { ascending: false })
      .limit(1000);
    dbError(error);
    return NextResponse.json(data);
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    const { client } = await mutation(request, 'catalog.write');
    const input = productSchema.parse(await jsonBody(request));
    const { data: defs, error } = await client
      .from('custom_field_definitions')
      .select('*');
    dbError(error);
    validateFields(
      (defs || []) as FieldDefinition[],
      input.field_values,
      input.category_ids,
      ['published', 'scheduled'].includes(input.status),
    );
    const { data: id, error: saveError } = await client.rpc('save_product', {
      payload: input,
      expected_version: input.version ?? null,
    });
    dbError(saveError);
    const { data: product, error: readError } = await client
      .from('products')
      .select(productSelect)
      .eq('id', id)
      .single();
    dbError(readError);
    return NextResponse.json(product);
  } catch (e) {
    return apiError(e);
  }
}
