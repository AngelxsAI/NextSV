import { requirePageStaff as requireStaff } from '@/lib/page-auth';
import { productSelect, siteUrl } from '@/lib/catalog';
import { dbError } from '@/lib/http';
import { ImageStudio } from '@/components/admin/image-studio';
import type { Product, FieldDefinition } from '@/lib/types';
import type { ImageDesign } from '@/lib/render-image';
export default async function Studio({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const { client } = await requireStaff('media.write');
  const [
    { data: products, error: pe },
    { data: fields, error: fe },
    { data: templates, error: te },
  ] = await Promise.all([
    client
      .from('products')
      .select(productSelect)
      .is('deleted_at', null)
      .order('name')
      .limit(1000),
    client.from('custom_field_definitions').select('*').order('position'),
    client.from('image_templates').select('*'),
  ]);
  dbError(pe);
  dbError(fe);
  dbError(te);
  return (
    <ImageStudio
      products={(products || []) as Product[]}
      fields={(fields || []) as FieldDefinition[]}
      templates={
        (templates || []) as { id: string; name: string; config: ImageDesign }[]
      }
      baseUrl={siteUrl()}
      selectedId={(await searchParams).product}
    />
  );
}
