'use client';
import { useState } from 'react';
import { z } from 'zod';
import { settingsSchema } from '@/lib/schemas';
import { api, errorMessage } from './api';
import { Button } from '../ui/button';
type Settings = z.infer<typeof settingsSchema>;
export function SettingsEditor({ initial }: { initial: Settings }) {
  const [draft, setDraft] = useState(initial);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const names = {
    name: 'Nombre comercial',
    headline: 'Título del banner',
    description: 'Descripción del negocio',
    phone: 'Teléfono',
    whatsapp: 'WhatsApp (código de país y número, sin +)',
    hours: 'Horarios',
    address: 'Ubicación comercial',
    announcement: 'Aviso superior',
  };
  async function save(publish: boolean) {
    setBusy(true);
    try {
      await api('/api/admin/resources/site_settings', {
        method: 'POST',
        body: JSON.stringify({ settings: draft, publish }),
      });
      setMessage(publish ? 'Cambios publicados.' : 'Borrador guardado.');
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function upload(
    file: File | undefined,
    key: 'logo_asset_id' | 'banner_asset_id',
  ) {
    if (!file) return;
    try {
      const form = new FormData();
      form.set('file', file);
      const asset = await api<{ id: string }>('/api/admin/media', {
        method: 'POST',
        body: form,
      });
      setDraft({ ...draft, [key]: asset.id });
      setMessage(
        'Imagen cargada. Guarda el borrador para conservar la selección.',
      );
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }
  return (
    <>
      <span className="eyebrow">IDENTIDAD Y CONTENIDO</span>
      <h1>Mi negocio</h1>
      <div className="toolbar row wrap">
        <Button variant="outline" onClick={() => save(false)} disabled={busy}>
          Guardar borrador
        </Button>
        <Button variant="outline" onClick={() => setPreview(!preview)}>
          Vista previa
        </Button>
        <Button onClick={() => save(true)} disabled={busy}>
          Publicar cambios
        </Button>
        <span role="status">{message}</span>
      </div>
      {preview && (
        <section className="hero">
          <div>
            <span className="eyebrow">VISTA PREVIA · {draft.name}</span>
            <h1>{draft.headline}</h1>
            <p>{draft.description}</p>
            <p>{draft.announcement}</p>
          </div>
        </section>
      )}
      <div className="panel form-grid">
        {Object.entries(names).map(([key, label]) => (
          <label key={key} className={key === 'description' ? 'span-2' : ''}>
            {label}
            {key === 'description' ? (
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
              />
            ) : (
              <input
                value={String(draft[key as keyof Settings] || '')}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            )}
          </label>
        ))}
        <label>
          Color principal
          <input
            type="color"
            value={draft.accent}
            onChange={(e) => setDraft({ ...draft, accent: e.target.value })}
          />
        </label>
        <label>
          Logotipo
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => void upload(e.target.files?.[0], 'logo_asset_id')}
          />
          <small>{draft.logo_asset_id ? 'Seleccionado' : 'Sin imagen'}</small>
        </label>
        <label>
          Fotografía del banner
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) =>
              void upload(e.target.files?.[0], 'banner_asset_id')
            }
          />
          <small>{draft.banner_asset_id ? 'Seleccionada' : 'Sin imagen'}</small>
        </label>
        <div className="span-2 stack">
          <h2>Preguntas frecuentes</h2>
          {draft.faqs.map((f, i) => (
            <div className="form-grid" key={i}>
              <label>
                Pregunta
                <input
                  value={f.question}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      faqs: draft.faqs.map((v, j) =>
                        j === i ? { ...v, question: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Respuesta
                <textarea
                  value={f.answer}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      faqs: draft.faqs.map((v, j) =>
                        j === i ? { ...v, answer: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <Button
                variant="ghost"
                onClick={() =>
                  setDraft({
                    ...draft,
                    faqs: draft.faqs.filter((_, j) => j !== i),
                  })
                }
              >
                Eliminar pregunta
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setDraft({
                ...draft,
                faqs: [...draft.faqs, { question: '', answer: '' }],
              })
            }
          >
            Añadir pregunta
          </Button>
          <h2>Redes sociales</h2>
          {draft.social_links.map((l, i) => (
            <div className="form-grid" key={i}>
              <label>
                Nombre
                <input
                  value={l.label}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      social_links: draft.social_links.map((v, j) =>
                        i === j ? { ...v, label: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <label>
                Dirección HTTPS
                <input
                  type="url"
                  value={l.url}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      social_links: draft.social_links.map((v, j) =>
                        i === j ? { ...v, url: e.target.value } : v,
                      ),
                    })
                  }
                />
              </label>
              <Button
                variant="ghost"
                onClick={() =>
                  setDraft({
                    ...draft,
                    social_links: draft.social_links.filter((_, j) => j !== i),
                  })
                }
              >
                Quitar red
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setDraft({
                ...draft,
                social_links: [...draft.social_links, { label: '', url: '' }],
              })
            }
          >
            Añadir red social
          </Button>
        </div>
      </div>
    </>
  );
}
