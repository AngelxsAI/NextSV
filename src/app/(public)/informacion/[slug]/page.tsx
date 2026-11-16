import { notFound } from 'next/navigation';
import { configured, publicDb } from '@/lib/supabase';
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!configured()) notFound();
  const { slug } = await params;
  const { data, error } = await publicDb().rpc('public_pages');
  if (error) throw new Error('No se pudo cargar esta página.');
  const page = data?.find((p: { slug: string }) => p.slug === slug);
  if (!page) notFound();
  return (
    <article className="prose">
      <h1 style={{ fontSize: 36 }}>{page.title}</h1>
      <div>{page.body}</div>
    </article>
  );
}
