'use client';
import { useEffect, useState } from 'react';
import { api, errorMessage } from './api';
import { Button } from '../ui/button';
type Filter = {
  id: string;
  name: string;
  filters: { query: string; status: string };
};
export function SavedFilters({
  query,
  status,
  apply,
}: {
  query: string;
  status: string;
  apply: (query: string, status: string) => void;
}) {
  const [saved, setSaved] = useState<Filter[]>([]);
  const [message, setMessage] = useState('');
  useEffect(() => {
    api<Filter[]>('/api/admin/resources/saved_filters')
      .then(setSaved)
      .catch((e) => setMessage(errorMessage(e)));
  }, []);
  return (
    <div className="row wrap">
      <select
        aria-label="Filtros guardados"
        defaultValue=""
        style={{ maxWidth: 250 }}
        onChange={(e) => {
          const f = saved.find((f) => f.id === e.target.value);
          if (f) apply(f.filters.query || '', f.filters.status || 'all');
        }}
      >
        <option value="">Filtros guardados</option>
        {saved.map((f) => (
          <option value={f.id} key={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <Button
        variant="ghost"
        onClick={async () => {
          const name = prompt('Nombre para este filtro');
          if (!name) return;
          try {
            const f = await api<Filter>('/api/admin/resources/saved_filters', {
              method: 'POST',
              body: JSON.stringify({ name, filters: { query, status } }),
            });
            setSaved([...saved, f]);
            setMessage('Filtro guardado.');
          } catch (e) {
            setMessage(errorMessage(e));
          }
        }}
      >
        Guardar filtro actual
      </Button>
      <small role="status">{message}</small>
    </div>
  );
}
