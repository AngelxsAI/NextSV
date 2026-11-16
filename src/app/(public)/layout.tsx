import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { settings, brandingUrl } from '@/lib/catalog';
import { ThemeToggle } from '@/components/theme';
import { configured, publicDb } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: s } = await settings();
  const logo = await brandingUrl(s.logo_asset_id);
  const pages = configured()
    ? (await publicDb().rpc('public_pages')).data || []
    : [];
  return (
    <>
      <style>{`:root:not([data-theme=dark]){--accent:${s.accent}}`}</style>
      {s.announcement && <div className="topline">{s.announcement}</div>}
      <header className="header">
        <div className="shell header-inner">
          <Link className="brand" href="/">
            {logo ? (
              <img src={logo} alt="" width="38" height="38" />
            ) : (
              <span className="brand-mark">N</span>
            )}
            {s.name}
          </Link>
          <nav className="nav" aria-label="Principal">
            <Link href="/catalogo">Catálogo</Link>
            <Link className="desktop" href="/catalogo?sort=recent">
              Novedades
            </Link>
            {s.whatsapp && (
              <a className="link-arrow" href={`https://wa.me/${s.whatsapp}`}>
                Hablemos <ArrowUpRight size={16} />
              </a>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main id="contenido" className="shell">
        {children}
      </main>
      <footer className="footer">
        <div className="shell">
          <div className="footer-grid">
            <div>
              <Link href="/" className="brand">
                {s.name}
                <span className="badge">El Salvador</span>
              </Link>
              <p className="muted" style={{ maxWidth: 380, marginTop: 15 }}>
                {s.description}
              </p>
            </div>
            <div>
              <strong>Explora</strong>
              <Link href="/catalogo">Todos los productos</Link>
              <Link href="/catalogo?sort=recent">Nuevos productos</Link>
              <Link href="/admin">Administración</Link>
            </div>
            <div>
              <strong>Información</strong>
              {pages.map((p: { slug: string; title: string }) => (
                <Link href={`/informacion/${p.slug}`} key={p.slug}>
                  {p.title}
                </Link>
              ))}
              {s.phone && <a href={`tel:${s.phone}`}>{s.phone}</a>}
              {s.hours && <p>{s.hours}</p>}
              {s.address && <p>{s.address}</p>}
              {s.social_links.map((l) => (
                <a key={l.url} href={l.url} rel="noopener noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          </div>
          <div className="footer-bottom">
            © {new Date().getFullYear()} {s.name}. Catálogo informativo ·
            Consulta las condiciones de cada producto.
          </div>
        </div>
      </footer>
    </>
  );
}
