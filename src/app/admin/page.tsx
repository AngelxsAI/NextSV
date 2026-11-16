import Link from 'next/link';
import { requirePageStaff as requireStaff } from '@/lib/page-auth';
import { dbError } from '@/lib/http';
export default async function Dashboard() {
  const { client } = await requireStaff('reports.read');
  const [
    { data: products, error },
    { count: categories, error: catError },
    { data: logs, error: logError },
  ] = await Promise.all([
    client
      .from('products')
      .select(
        'id,name,status,stock,low_stock_threshold,views,deleted_at,publish_at',
      ),
    client.from('categories').select('*', { count: 'exact', head: true }),
    client
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);
  dbError(error);
  dbError(catError);
  dbError(logError);
  const p = (products || []).filter((x) => !x.deleted_at);
  const metrics = [
    ['Productos', p.length],
    [
      'Publicados',
      p.filter(
        (x) =>
          x.status === 'published' ||
          (x.status === 'scheduled' &&
            Date.parse(x.publish_at) <= new Date().getTime()),
      ).length,
    ],
    ['Borradores', p.filter((x) => x.status === 'draft').length],
    ['Agotados', p.filter((x) => x.stock === 0).length],
    ['Categorías', categories || 0],
  ];
  return (
    <>
      <div className="row spread wrap">
        <div>
          <span className="eyebrow">TU CENTRO DE OPERACIONES</span>
          <h1>Resumen del negocio</h1>
          <p className="muted">
            Todo lo que necesitas para mantener tu catálogo al día.
          </p>
        </div>
        <Link href="/admin/productos/nuevo" className="button button-primary">
          + Nuevo producto
        </Link>
      </div>
      <div className="grid metrics">
        {metrics.map(([label, value]) => (
          <div className="panel metric" key={label}>
            <span className="muted">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="grid form-grid">
        <section className="panel">
          <h2>Atención al inventario</h2>
          {p
            .filter((x) => x.stock <= x.low_stock_threshold)
            .map((x) => (
              <Link
                className="row spread"
                href={`/admin/productos/${x.id}`}
                key={x.id}
              >
                <span>{x.name}</span>
                <span className="badge">{x.stock} unidades</span>
              </Link>
            ))}
          {!p.some((x) => x.stock <= x.low_stock_threshold) && (
            <p className="muted">No hay alertas de bajo inventario.</p>
          )}
        </section>
        <section className="panel">
          <h2>Actividad reciente</h2>
          {logs?.length ? (
            logs.map((l) => (
              <p key={l.id} className="muted">
                <strong>{l.operation}</strong> · {l.entity}
                <br />
                <small>
                  {new Date(l.created_at).toLocaleString('es-SV', {
                    timeZone: 'America/El_Salvador',
                  })}
                </small>
              </p>
            ))
          ) : (
            <p className="muted">Aún no hay actividad registrada.</p>
          )}
        </section>
        <section className="panel span-2">
          <h2>Tráfico</h2>
          <p className="muted">
            La medición de visitas está pendiente de activar en Cloudflare. No
            se muestran cifras estimadas ni visitas simuladas.
          </p>
        </section>
      </div>
    </>
  );
}
