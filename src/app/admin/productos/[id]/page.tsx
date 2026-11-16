import { notFound } from 'next/navigation';
import { requirePageStaff as requireStaff } from '@/lib/page-auth';
import { productSelect } from '@/lib/catalog';
import { dbError } from '@/lib/http';
import { ProductEditor } from '@/components/admin/product-editor';
import { HistoryPanel } from '@/components/admin/history-panel';
import type { Product, Category, FieldDefinition } from '@/lib/types';
export default async function Editor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { client } = await requireStaff('catalog.write');
  const [{ data: categories, error: ce }, { data: fields, error: fe }] =
    await Promise.all([
      client.from('categories').select('*').order('position'),
      client.from('custom_field_definitions').select('*').order('position'),
    ]);
  dbError(ce);
  dbError(fe);
  let p: Product | null = null;
  if (id !== 'nuevo') {
    const { data, error } = await client
      .from('products')
      .select(productSelect)
      .eq('id', id)
      .maybeSingle();
    dbError(error);
    if (!data) notFound();
    p = data as Product;
  }
  return (
    <>
      <ProductEditor
        initial={p}
        categories={(categories || []) as Category[]}
        fields={(fields || []) as FieldDefinition[]}
      />
      {p && <HistoryPanel productId={p.id} />}
    </>
  );
}
