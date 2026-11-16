import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import Link from 'next/link';
import { MessageCircle, Package } from 'lucide-react';
import { product, catalog, money, settings, siteUrl } from '@/lib/catalog';
import { publicDb } from '@/lib/supabase';
import { activePrice } from '@/lib/schemas';
import { ProductCard } from '@/components/product-card';
import { Share } from '@/components/share';
import { Button } from '@/components/ui/button';
import { CustomSpecifications } from '@/components/custom-specifications';
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const p = await product((await params).slug);
  if (!p) return { title: 'Producto no encontrado' };
  return {
    title: p.name,
    description:
      p.description.slice(0, 160) ||
      `Consulta ${p.name}, precio y disponibilidad en NextSV.`,
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: {
      type: 'website',
      title: p.name,
      description: p.description.slice(0, 160),
      url: `/producto/${p.slug}`,
      images: [`/producto/${p.slug}/opengraph-image`],
    },
    twitter: {
      card: 'summary_large_image',
      title: p.name,
      images: [`/producto/${p.slug}/opengraph-image`],
    },
  };
}
export default async function ProductPage({ params }: Props) {
  const p = await product((await params).slug);
  if (!p) notFound();
  const [{ data: s }, related, { data: defs }] = await Promise.all([
    settings(),
    catalog({ category: p.product_categories[0]?.category_id }),
    publicDb().from('custom_field_definitions').select('*').order('position'),
  ]);
  const price = activePrice(p);
  const url = `${siteUrl()}/producto/${p.slug}`;
  const nonce = (await headers()).get('x-nonce') || undefined;
  const specs = [
    ['Marca', p.brand],
    ['Material', p.material],
    ['Dimensiones', p.dimensions],
    ['Garantía', p.warranty],
    ['Entrega', p.delivery],
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    sku: p.sku,
    description: p.description,
    image: p.product_images.map((i) => i.url).filter(Boolean),
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: 'USD',
      price,
      availability: `https://schema.org/${p.stock > 0 ? 'InStock' : 'OutOfStock'}`,
    },
    ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
  };
  return (
    <>
      <script
        nonce={nonce}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <div className="breadcrumbs">
        <Link href="/">Inicio</Link> / <Link href="/catalogo">Catálogo</Link> /{' '}
        {p.name}
      </div>
      <article className="product-detail">
        <div>
          {p.product_images[0]?.url ? (
            <img
              id="foto"
              className="gallery-main"
              src={p.product_images[0].url}
              alt={p.product_images[0].alt}
              width="800"
              height="800"
            />
          ) : (
            <div className="gallery-main empty">
              <Package size={70} />
              <p>Sin fotografía</p>
            </div>
          )}
          <div className="gallery-thumbs">
            {p.product_images.slice(1).map((i) => (
              <a
                href={i.url}
                target="_blank"
                rel="noopener noreferrer"
                key={i.id}
              >
                <img src={i.url} alt={i.alt} width="100" height="100" />
              </a>
            ))}
          </div>
        </div>
        <div>
          <span className="eyebrow">
            {p.brand || 'NEXTSV'} · {p.sku}
          </span>
          <h1>{p.name}</h1>
          {p.badge && <span className="badge">{p.badge}</span>}
          <p className="detail-price">
            {money(price)}{' '}
            {price !== p.price && (
              <del className="muted" style={{ fontSize: 18 }}>
                {money(p.price)}
              </del>
            )}
          </p>
          <p className={p.stock ? 'available' : 'muted'}>
            {p.stock
              ? `${p.stock} unidades disponibles`
              : 'Actualmente agotado'}
          </p>
          <p className="description muted">{p.description}</p>
          {p.product_variants.length > 0 && (
            <div className="panel">
              <h3>Variantes disponibles</h3>
              {p.product_variants.map((v) => (
                <div className="row spread" key={v.sku}>
                  <span>
                    {[v.color, v.size].filter(Boolean).join(' · ')}{' '}
                    <small>{v.sku}</small>
                  </span>
                  <span>
                    {v.stock} uds. {v.price != null && money(v.price)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <hr />
          {s.whatsapp && (
            <Button asChild>
              <a
                href={`https://wa.me/${s.whatsapp}?text=${encodeURIComponent(`Hola, me interesa ${p.name} (${p.sku}). ${url}`)}`}
              >
                <MessageCircle size={19} />
                Consultar por WhatsApp
              </a>
            </Button>
          )}
          <div style={{ marginTop: 15 }}>
            <Share
              title={p.name}
              url={url}
              description={`${money(price)} · ${p.description}`}
            />
          </div>
          <dl className="specs">
            {specs.map(([k, v]) => (
              <div key={String(k)}>
                <dt>{String(k)}</dt>
                <dd>
                  {typeof v === 'boolean'
                    ? v
                      ? 'Sí'
                      : 'No'
                    : Array.isArray(v)
                      ? v.join(', ')
                      : String(v)}
                </dd>
              </div>
            ))}
          </dl>
          <CustomSpecifications product={p} fields={defs || []} />
          <small className="muted">
            Actualizado:{' '}
            {new Intl.DateTimeFormat('es-SV', {
              dateStyle: 'medium',
              timeZone: 'America/El_Salvador',
            }).format(new Date(p.updated_at))}
          </small>
        </div>
      </article>
      {related.products.filter((r) => r.id !== p.id).length > 0 && (
        <section className="section">
          <h2>También te puede interesar</h2>
          <div className="grid product-grid">
            {related.products
              .filter((r) => r.id !== p.id)
              .slice(0, 4)
              .map((r) => (
                <ProductCard product={r} key={r.id} />
              ))}
          </div>
        </section>
      )}
    </>
  );
}
