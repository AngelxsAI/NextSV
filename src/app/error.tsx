'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="contenido" className="shell" style={{ paddingTop: 60 }}>
      <h1>No pudimos cargar esta página</h1>
      <p>Comprueba la conexión del servicio y vuelve a intentarlo.</p>
      <button className="button button-primary" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
