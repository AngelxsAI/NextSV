import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Image,
  Settings,
  FileText,
  Tags,
  SlidersHorizontal,
  Inbox,
} from 'lucide-react';
import { configured, requireStaff } from '@/lib/supabase';
import { ThemeToggle } from '@/components/theme';
import { Logout } from '@/components/logout';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Administración',
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!configured()) redirect('/login');
  try {
    await requireStaff();
  } catch {
    redirect('/login');
  }
  const links = [
    ['/admin', 'Resumen', LayoutDashboard],
    ['/admin/productos', 'Productos', Package],
    ['/admin/categorias', 'Categorías', Tags],
    ['/admin/campos', 'Campos', SlidersHorizontal],
    ['/admin/estudio', 'Estudio visual', Image],
    ['/admin/contenido', 'Páginas', FileText],
    ['/admin/solicitudes', 'Solicitudes', Inbox],
    ['/admin/configuracion', 'Mi negocio', Settings],
  ] as const;
  return (
    <div className="admin">
      <aside className="sidebar">
        <Link className="brand" href="/admin">
          <span className="brand-mark">N</span>NextSV
        </Link>
        <nav aria-label="Administración">
          {links.map(([href, label, Icon]) => (
            <Link key={href} href={href}>
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="row wrap">
          <ThemeToggle />
          <Link href="/" className="link-arrow">
            Ver sitio ↗
          </Link>
          <Logout />
        </div>
      </aside>
      <main id="contenido" className="admin-main">
        {children}
      </main>
    </div>
  );
}
