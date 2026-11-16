import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: { default: 'NextSV | Catálogo', template: '%s | NextSV' },
  description:
    'Explora el catálogo de NextSV y consulta información sobre nuestros productos.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ),
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
