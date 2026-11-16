'use client';
import { useState } from 'react';
import { Share2, Copy } from 'lucide-react';
import { Button } from './ui/button';
export function Share({
  title,
  url,
  description,
}: {
  title: string;
  url: string;
  description: string;
}) {
  const [status, setStatus] = useState('');
  return (
    <div className="stack">
      <div className="row wrap">
        <Button
          variant="outline"
          onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ title, url });
              else {
                await navigator.clipboard.writeText(url);
                setStatus('Enlace copiado.');
              }
            } catch {
              setStatus('No se compartió. Puedes copiar el enlace.');
            }
          }}
        >
          <Share2 size={17} />
          Compartir
        </Button>
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                `${title}\n${description}\n${url}`,
              );
              setStatus('Descripción copiada.');
            } catch {
              setStatus('No se pudo acceder al portapapeles.');
            }
          }}
        >
          <Copy size={17} />
          Copiar descripción
        </Button>
      </div>
      <small role="status">{status}</small>
    </div>
  );
}
