import Link from 'next/link';
import { Suspense } from 'react';
import { catalog } from '@/lib/catalog';
import { ProductCard } from '@/components/product-card';
import { SearchBox } from '@/components/search';
import { Button } from '@/components/ui/button';
export const metadata = {
  title: 'Catálogo',
  alternates: { canonical: '/catalogo' },
};
export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const data = await catalog(params);
  const page = Math.max(1, Number(params.page) || 1);
  function link(n: number) {
    return `/catalogo?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter((e): e is [string, string] => typeof e[1] === 'string')), page: String(n) })}`;
  }
  return (
    <>
      <div className="page-title">
        <span className="eyebrow">EXPLORA NEXTSV</span>
        <h1>Elige tu próximo favorito</h1>
        <Suspense>
          <SearchBox />
        </Suspense>
      </div>
      <div className="catalog-layout">
        <aside className="filter-panel">
          <h3>Filtrar productos</h3>
          <form>
            <input type="hidden" name="q" value={params.q || ''} />
            <label>
              Categoría
              <select name="category" defaultValue={params.category || ''}>
                <option value="">Todas</option>
                {data.categories.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Precio desde
              <input
                type="number"
                name="min"
                min="0"
                step="0.01"
                defaultValue={params.min}
              />
            </label>
            <label>
              Precio hasta
              <input
                type="number"
                name="max"
                min="0"
                step="0.01"
                defaultValue={params.max}
              />
            </label>
            <label>
              Color
              <input name="color" defaultValue={params.color} />
            </label>
            <label>
              Disponibilidad
              <select name="stock" defaultValue={params.stock || ''}>
                <option value="">Todos</option>
                <option value="yes">En existencia</option>
              </select>
            </label>
            <label>
              Ordenar
              <select name="sort" defaultValue={params.sort || 'recent'}>
                <option value="recent">Más recientes</option>
                <option value="price_asc">Menor precio</option>
                <option value="price_desc">Mayor precio</option>
                <option value="popular">Más consultados</option>
              </select>
            </label>
            <Button type="submit">Aplicar filtros</Button>
            <Link className="button button-ghost" href="/catalogo">
              Limpiar
            </Link>
          </form>
        </aside>
        <section>
          <div className="row spread" style={{ marginBottom: 20 }}>
            <p className="muted">{data.count} productos</p>
            <span className="badge">Catálogo</span>
          </div>
          {data.products.length ? (
            <div className="grid product-grid">
              {data.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>
                {data.connected
                  ? 'No hay resultados'
                  : 'Catálogo pendiente de conexión'}
              </h2>
              <p>
                {data.connected
                  ? 'Prueba otra búsqueda o elimina algunos filtros.'
                  : 'Los productos se cargarán desde la base de datos configurada.'}
              </p>
            </div>
          )}
          <nav className="pagination" aria-label="Paginación">
            {page > 1 && (
              <Link className="button button-outline" href={link(page - 1)}>
                Anterior
              </Link>
            )}
            {page * 12 < data.count && (
              <Link className="button button-outline" href={link(page + 1)}>
                Siguiente
              </Link>
            )}
          </nav>
        </section>
      </div>
    </>
  );
}
