import Link from 'next/link';
import { ArrowUpRight, Package } from 'lucide-react';
import type { Product } from '@/lib/types';
import { activePrice } from '@/lib/schemas';
import { money } from '@/lib/catalog';
export function ProductCard({ product: p }: { product: Product }) {
  const price = activePrice(p);
  return (
    <Link href={`/producto/${p.slug}`} className="product-card">
      <div className="product-photo">
        {p.product_images[0]?.url ? (
          <img
            src={p.product_images[0].url}
            alt={p.product_images[0].alt}
            loading="lazy"
            width="600"
            height="600"
          />
        ) : (
          <Package size={44} aria-label="Sin fotografía" />
        )}
        {p.badge && <span className="badge photo-badge">{p.badge}</span>}
      </div>
      <div className="product-copy">
        <span className="eyebrow">{p.brand || p.sku}</span>
        <h3>{p.name}</h3>
        <div className="row spread">
          <div>
            <strong className="price">{money(price)}</strong>
            {price !== p.price && <del>{money(p.price)}</del>}
          </div>
          <ArrowUpRight size={21} />
        </div>
        <small className={p.stock ? 'available' : 'muted'}>
          {p.stock ? `${p.stock} disponibles` : 'Agotado'}
        </small>
      </div>
    </Link>
  );
}
