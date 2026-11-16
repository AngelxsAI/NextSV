import { requireStaff } from '@/lib/supabase';
import { dbError } from '@/lib/http';
export async function HistoryPanel({ productId }: { productId: string }) {
  const { client } = await requireStaff('reports.read');
  const [{ data: prices, error: pe }, { data: stock, error: se }] =
    await Promise.all([
      client
        .from('price_history')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(20),
      client
        .from('inventory_movements')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
  dbError(pe);
  dbError(se);
  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <h2>Historial de precio e inventario</h2>
      <div className="form-grid">
        <div>
          <h3>Cambios de precio</h3>
          {prices?.length ? (
            prices.map((p) => (
              <p key={p.id}>
                <small>
                  {new Date(p.created_at).toLocaleString('es-SV', {
                    timeZone: 'America/El_Salvador',
                  })}
                </small>
                <br />
                {p.old_price === null ? 'Inicial' : `$${p.old_price}`} → $
                {p.new_price}
              </p>
            ))
          ) : (
            <p className="muted">Sin cambios de precio registrados.</p>
          )}
        </div>
        <div>
          <h3>Movimientos</h3>
          {stock?.length ? (
            stock.map((m) => (
              <p key={m.id}>
                <small>
                  {new Date(m.created_at).toLocaleString('es-SV', {
                    timeZone: 'America/El_Salvador',
                  })}
                </small>
                <br />
                {m.previous_stock} → {m.current_stock} unidades (
                {m.delta > 0 ? '+' : ''}
                {m.delta})
              </p>
            ))
          ) : (
            <p className="muted">Sin movimientos registrados.</p>
          )}
        </div>
      </div>
    </section>
  );
}
