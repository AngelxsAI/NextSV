import { notFound } from 'next/navigation';
import { requirePageStaff as requireStaff } from '@/lib/page-auth';
import { dbError } from '@/lib/http';
import { ResourceEditor } from '@/components/admin/resource-editor';
const sections = {
  categorias: ['categories', 'Categorías', 'catalog.write'],
  campos: [
    'custom_field_definitions',
    'Campos personalizados',
    'catalog.write',
  ],
  contenido: ['content_pages', 'Páginas y políticas', 'content.write'],
  solicitudes: [
    'contact_requests',
    'Solicitudes de información',
    'catalog.write',
  ],
} as const;
export default async function ResourcePage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!(section in sections)) notFound();
  const [resource, title, permission] =
    sections[section as keyof typeof sections];
  const { client } = await requireStaff(permission);
  const [{ data, error }, { data: categories, error: ce }] = await Promise.all([
    client.from(resource).select('*').limit(1000),
    client.from('categories').select('id,name'),
  ]);
  dbError(error);
  dbError(ce);
  return (
    <ResourceEditor
      resource={resource}
      title={title}
      initial={data || []}
      categories={categories || []}
    />
  );
}
