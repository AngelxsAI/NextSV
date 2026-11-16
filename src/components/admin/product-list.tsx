'use client';
import Link from 'next/link';
import { useState } from 'react';
import Papa from 'papaparse';
import type { Product } from '@/lib/types';
import { productSchema, safeCsvCell } from '@/lib/schemas';
import { api, errorMessage } from './api';
import { Button } from '../ui/button';
import { SavedFilters } from './saved-filters';
export function ProductList({ initial }: { initial: Product[] }) {
  const [products, setProducts] = useState(initial);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const filtered = products.filter(
    (p) =>
      (status === 'trash' ? p.deleted_at : !p.deleted_at) &&
      (status === 'all' || status === 'trash' || p.status === status) &&
      `${p.name} ${p.sku}`.toLowerCase().includes(query.toLowerCase()),
  );
  async function bulk(action: string) {
    if (!selected.length) return;
    if (!confirm(`¿Aplicar «${action}» a ${selected.length} productos?`))
      return;
    setBusy(true);
    try {
      await api('/api/admin/products/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: selected, action }),
      });
      setProducts(await api<Product[]>('/api/admin/products'));
      setSelected([]);
      setMessage('Cambios guardados.');
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function exportCsv() {
    const csv = Papa.unparse(
      filtered.map((p) =>
        Object.fromEntries(
          [
            'sku',
            'slug',
            'name',
            'description',
            'price',
            'stock',
            'brand',
            'material',
            'warranty',
            'delivery',
          ].map((k) => [k, safeCsvCell(p[k as keyof Product])]),
        ),
      ),
    );
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nextsv-catalogo.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importCsv(file: File) {
    if (file.size > 2 * 1024 * 1024) {
      setMessage('CSV demasiado grande: máximo 2 MB.');
      return;
    }
    setBusy(true);
    setMessage('Validando archivo…');
    let saved = 0;
    try {
      const parsed = Papa.parse<Record<string, string>>(await file.text(), {
        header: true,
        skipEmptyLines: true,
      });
      if (parsed.errors.length)
        throw new Error(
          'CSV inválido. Revisa encabezados, comillas y separadores.',
        );
      if (parsed.data.length > 200)
        throw new Error('Importa un máximo de 200 filas por archivo.');
      const rows = parsed.data.map((r, i) => {
        const p = productSchema.safeParse({
          ...r,
          price: Number(r.price),
          stock: Number(r.stock),
          status: 'draft',
          featured: false,
        });
        if (!p.success)
          throw new Error(`Fila ${i + 2}: ${p.error.issues[0].message}`);
        return p.data;
      });
      if (
        !confirm(`Se crearán ${rows.length} productos en borrador. ¿Continuar?`)
      )
        return;
      for (const row of rows) {
        await api('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(row),
        });
        saved++;
      }
      setMessage(`${saved} productos importados como borradores.`);
    } catch (e) {
      setMessage(
        `${saved} filas guardadas. ${errorMessage(e)} No se revirtió lo ya importado.`,
      );
    } finally {
      setProducts(await api<Product[]>('/api/admin/products'));
      setBusy(false);
    }
  }
  return (
    <>
      <div className="row spread wrap">
        <div>
          <span className="eyebrow">CATÁLOGO</span>
          <h1>Tus productos</h1>
        </div>
        <Link className="button button-primary" href="/admin/productos/nuevo">
          + Nuevo producto
        </Link>
      </div>
      <div className="panel stack">
        <SavedFilters
          query={query}
          status={status}
          apply={(q, s) => {
            setQuery(q);
            setStatus(s);
            setSelected([]);
          }}
        />
        <div className="row wrap">
          <input
            aria-label="Buscar en administración"
            placeholder="Buscar por nombre o SKU…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            aria-label="Estado"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setSelected([]);
            }}
            style={{ width: 170 }}
          >
            <option value="all">Todos</option>
            <option value="draft">Borradores</option>
            <option value="published">Publicados</option>
            <option value="scheduled">Programados</option>
            <option value="archived">Archivados</option>
            <option value="trash">Papelera</option>
          </select>
          <Button variant="outline" onClick={exportCsv}>
            Exportar CSV
          </Button>
          <label className="button button-outline">
            Importar CSV
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importCsv(f);
                e.target.value = '';
              }}
            />
          </label>
        </div>
        {selected.length > 0 && (
          <div className="row wrap">
            <span>{selected.length} seleccionados</span>
            {(status === 'trash'
              ? ['restore']
              : ['unpublish', 'archive', 'trash']
            ).map((a) => (
              <Button
                key={a}
                variant="outline"
                disabled={busy}
                onClick={() => bulk(a)}
              >
                {
                  {
                    restore: 'Recuperar',
                    unpublish: 'Despublicar',
                    archive: 'Archivar',
                    trash: 'Mover a papelera',
                  }[a]
                }
              </Button>
            ))}
          </div>
        )}
        <p role="status" className="inline-status">
          {message}
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Seleccionar productos visibles"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((p) => selected.includes(p.id))
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? filtered.slice(0, 100).map((p) => p.id)
                          : [],
                      )
                    }
                  />
                </th>
                <th>Producto</th>
                <th>Precio</th>
                <th>Existencias</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${p.name}`}
                      checked={selected.includes(p.id)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, p.id]
                            : selected.filter((id) => id !== p.id),
                        )
                      }
                    />
                  </td>
                  <td>
                    <strong>{p.name}</strong>
                    <br />
                    <small className="muted">{p.sku}</small>
                  </td>
                  <td>${Number(p.price).toFixed(2)}</td>
                  <td>{p.stock}</td>
                  <td>
                    <span className="badge">
                      {
                        {
                          draft: 'Borrador',
                          published: 'Publicado',
                          scheduled: 'Programado',
                          archived: 'Archivado',
                        }[p.status]
                      }
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/admin/productos/${p.id}`}
                      className="link-arrow"
                    >
                      Editar ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty">No hay productos en esta vista.</div>
          )}
        </div>
        <small className="muted">
          Hasta 1,000 productos por consulta administrativa. CSV crea borradores
          y valida todas las filas antes de importar.
        </small>
      </div>
    </>
  );
}
