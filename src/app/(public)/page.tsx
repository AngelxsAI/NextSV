import Link from 'next/link';
import {
  ArrowRight,
  MessageCircle,
  Package,
  SlidersHorizontal,
} from 'lucide-react';
import { catalog, settings, brandingUrl } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';
import { Button } from '@/components/ui/button';
export default async function Home() {
  const [{ data: s }, data] = await Promise.all([settings(), catalog()]);
  const banner = await brandingUrl(s.banner_asset_id);
  const featured = data.categories.filter((c) => c.featured);
  return (
    <>
      <section className="hero">
        <div>
          <span className="eyebrow">NEXTSV · DESCUBRE EL CATÁLOGO</span>
          <h1>{s.headline}</h1>
          <p>{s.description}</p>
          <Button asChild>
            <Link href="/catalogo">
              Explorar productos <ArrowRight size={18} />
            </Link>
          </Button>
        </div>
        <div className="hero-art" aria-hidden="true">
          {banner ? (
            <img src={banner} alt="" width="370" height="320" />
          ) : (
            <span className="hero-monogram">N / S</span>
          )}
        </div>
      </section>
      {!data.connected && (
        <div className="notice">
          El catálogo todavía no está conectado. La configuración del servicio
          está pendiente.
        </div>
      )}
      {featured.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2>Encuentra lo que buscas</h2>
          </div>
          <div className="category-list">
            {featured.map((c) => (
              <Link
                className="category-link"
                key={c.id}
                href={`/catalogo?category=${c.id}`}
              >
                {c.name}
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">LO MÁS RECIENTE</span>
            <h2>Recién llegados</h2>
          </div>
          <Link className="link-arrow" href="/catalogo">
            Ver catálogo <ArrowRight size={17} />
          </Link>
        </div>
        {data.products.length ? (
          <div className="grid product-grid">
            {data.products.slice(0, 8).map((p) => (
              <ProductCard product={p} key={p.id} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <Package size={36} />
            <h3>Pronto habrá novedades aquí</h3>
            <p>
              Los productos aparecerán cuando el negocio publique su catálogo.
            </p>
          </div>
        )}
      </section>
      <div className="trust">
        <div>
          <MessageCircle size={23} />
          <div>
            <strong>Atención directa</strong>
            <p>Consulta los detalles antes de comprar.</p>
          </div>
        </div>
        <div>
          <SlidersHorizontal size={23} />
          <div>
            <strong>Información clara</strong>
            <p>Precios y características por producto.</p>
          </div>
        </div>
        <div>
          <Package size={23} />
          <div>
            <strong>Disponibilidad visible</strong>
            <p>Existencias actualizadas por el negocio.</p>
          </div>
        </div>
      </div>
      {s.faqs.length > 0 && (
        <section className="section">
          <h2>Preguntas frecuentes</h2>
          {s.faqs.map((f) => (
            <details className="panel" key={f.question}>
              <summary>{f.question}</summary>
              <p>{f.answer}</p>
            </details>
          ))}
        </section>
      )}
    </>
  );
}
