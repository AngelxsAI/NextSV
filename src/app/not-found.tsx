import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="contenido" className="shell" style={{ paddingTop: 60 }}>
      <h1>No encontramos esta página</h1>
      <p>El producto puede no estar publicado o la dirección ha cambiado.</p>
      <Link href="/catalogo" className="button button-primary">
        Volver al catálogo
      </Link>
    </main>
  );
}
