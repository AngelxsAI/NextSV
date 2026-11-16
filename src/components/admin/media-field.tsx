'use client';
import { useState } from 'react';
import { api, errorMessage } from './api';
export function MediaField({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="stack">
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            const body = new FormData();
            body.set('file', file);
            const asset = await api<{ id: string }>('/api/admin/media', {
              method: 'POST',
              body,
            });
            onChange(asset.id);
            setMessage('Archivo cargado. Guarda el producto para vincularlo.');
          } catch (e) {
            setMessage(errorMessage(e));
          } finally {
            setBusy(false);
          }
        }}
      />
      {value && (
        <small>
          Archivo vinculado: {value.slice(0, 8)}{' '}
          <button type="button" onClick={() => onChange('')}>
            Quitar
          </button>
        </small>
      )}
      <small role="status">{message || 'PNG, JPEG o WebP. Máximo 5 MB.'}</small>
    </div>
  );
}
