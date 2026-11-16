'use client';
import { useEffect, useRef, useState } from 'react';
import { zipSync } from 'fflate';
import type { Product, FieldDefinition } from '@/lib/types';
import {
  defaultDesign,
  sizes,
  renderImage,
  canvasBlob,
  downloadBlob,
  type ImageDesign,
} from '@/lib/render-image';
import { api, errorMessage } from './api';
import { Button } from '../ui/button';
type Asset = { id: string; url: string };
type Template = { id: string; name: string; config: ImageDesign };
export function ImageStudio({
  products,
  fields,
  templates: initialTemplates,
  baseUrl,
  selectedId,
}: {
  products: Product[];
  fields: FieldDefinition[];
  templates: Template[];
  baseUrl: string;
  selectedId?: string;
}) {
  const [selected, setSelected] = useState(selectedId || products[0]?.id || '');
  const [design, setDesign] = useState(defaultDesign);
  const [templates, setTemplates] = useState(initialTemplates);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [mime, setMime] = useState('image/png');
  const [ready, setReady] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const p = products.find((p) => p.id === selected);
  const productUrl = p ? `${baseUrl}/producto/${p.slug}` : '';
  useEffect(() => {
    api<Asset[]>('/api/admin/media')
      .then(setAssets)
      .catch((e) => setMessage(errorMessage(e)));
  }, []);
  const photos =
    p?.product_images
      .map((i) => assets.find((a) => a.id === i.asset_id)?.url)
      .filter((x): x is string => Boolean(x)) || [];
  const photo = photos[design.photo] || photos[0];
  useEffect(() => {
    let cancelled = false;
    const target = canvas.current;
    if (!p || !photo || !target) return;
    setReady(false);
    const temp = document.createElement('canvas');
    renderImage(temp, p, design, fields, photo, productUrl)
      .then(() => {
        if (cancelled) return;
        target.width = temp.width;
        target.height = temp.height;
        target.getContext('2d')?.drawImage(temp, 0, 0);
        setReady(true);
        setMessage('Diseño actualizado.');
      })
      .catch((e) => {
        if (!cancelled) setMessage(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [p, design, fields, photo, productUrl]);
  function patch<K extends keyof ImageDesign>(key: K, value: ImageDesign[K]) {
    setDesign((d) => ({ ...d, [key]: value }));
  }
  async function exportImage(share = false) {
    if (!canvas.current || !p || !ready) return;
    try {
      const blob = await canvasBlob(canvas.current, mime);
      const file = new File([blob], `${p.slug}.${mime.split('/')[1]}`, {
        type: mime,
      });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: p.name });
      } else {
        downloadBlob(blob, file.name);
        setMessage(
          share
            ? 'Imagen descargada. Abre WhatsApp y adjúntala manualmente.'
            : 'Archivo descargado.',
        );
      }
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }
  async function zip() {
    if (!p || !photo) return;
    setBusy(true);
    try {
      const files: Record<string, Uint8Array> = {};
      for (const format of Object.keys(sizes) as (keyof typeof sizes)[]) {
        const target = document.createElement('canvas');
        await renderImage(
          target,
          p,
          { ...design, format },
          fields,
          photo,
          productUrl,
        );
        files[`${p.slug}-${format}.png`] = new Uint8Array(
          await (await canvasBlob(target, 'image/png')).arrayBuffer(),
        );
      }
      const bytes = zipSync(files, { level: 0 });
      downloadBlob(
        new Blob([new Uint8Array(bytes)], { type: 'application/zip' }),
        `${p.slug}-formatos.zip`,
      );
      setMessage('ZIP con los cuatro formatos descargado.');
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function saveTemplate() {
    const name = prompt('Nombre del diseño');
    if (!name) return;
    try {
      const config = { ...design, logo: '' };
      const saved = await api<Template>(
        '/api/admin/resources/image_templates',
        { method: 'POST', body: JSON.stringify({ name, config }) },
      );
      setTemplates([...templates, saved]);
      setMessage(
        'Diseño guardado. El logotipo se selecciona de nuevo al cargarlo.',
      );
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }
  const available = [
    { id: 'price', name: 'Precio' },
    { id: 'stock', name: 'Disponibilidad' },
    { id: 'sku', name: 'SKU' },
    { id: 'brand', name: 'Marca' },
    { id: 'material', name: 'Material' },
    { id: 'warranty', name: 'Garantía' },
    ...fields
      .filter((f) => f.type !== 'image' && f.type !== 'file')
      .map((f) => ({ id: f.id!, name: f.name })),
  ];
  return (
    <>
      <span className="eyebrow">ESTUDIO NEXTSV</span>
      <h1>De producto a publicación.</h1>
      <p className="muted">
        Diseña, descarga y comparte imágenes comerciales con información real.
      </p>
      {products.length === 0 ? (
        <div className="empty">
          Crea un producto y carga una fotografía para comenzar.
        </div>
      ) : (
        <div className="studio">
          <aside className="panel stack">
            <label>
              Producto
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  patch('photo', 0);
                  setReady(false);
                }}
              >
                {products.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Diseño guardado
              <select
                defaultValue=""
                onChange={(e) => {
                  const t = templates.find((t) => t.id === e.target.value);
                  if (t) setDesign({ ...defaultDesign, ...t.config });
                }}
              >
                <option value="">Selecciona un diseño</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Plantilla
                <select
                  value={design.template}
                  onChange={(e) =>
                    patch('template', e.target.value as ImageDesign['template'])
                  }
                >
                  <option value="classic">Clásica</option>
                  <option value="minimal">Minimalista</option>
                  <option value="bold">Color</option>
                </select>
              </label>
              <label>
                Formato
                <select
                  value={design.format}
                  onChange={(e) =>
                    patch('format', e.target.value as ImageDesign['format'])
                  }
                >
                  {Object.entries(sizes).map(([key, [w, h]]) => (
                    <option value={key} key={key}>
                      {w} × {h}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Fondo
                <input
                  type="color"
                  value={design.background}
                  onChange={(e) => patch('background', e.target.value)}
                />
              </label>
              <label>
                Texto
                <input
                  type="color"
                  value={design.foreground}
                  onChange={(e) => patch('foreground', e.target.value)}
                />
              </label>
              <label>
                Acento
                <input
                  type="color"
                  value={design.accent}
                  onChange={(e) => patch('accent', e.target.value)}
                />
              </label>
              <label>
                Tamaño
                <input
                  type="number"
                  min="18"
                  max="80"
                  value={design.fontSize}
                  onChange={(e) =>
                    patch(
                      'fontSize',
                      Math.max(18, Math.min(80, Number(e.target.value))),
                    )
                  }
                />
              </label>
              <label>
                Tipografía
                <select
                  value={design.font}
                  onChange={(e) =>
                    patch('font', e.target.value as ImageDesign['font'])
                  }
                >
                  <option>Arial</option>
                  <option>Georgia</option>
                  <option>Verdana</option>
                </select>
              </label>
              <label>
                Alineación
                <select
                  value={design.align}
                  onChange={(e) =>
                    patch('align', e.target.value as ImageDesign['align'])
                  }
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centro</option>
                </select>
              </label>
            </div>
            <label>
              Fotografía
              <select
                value={design.photo}
                onChange={(e) => patch('photo', Number(e.target.value))}
              >
                {photos.map((_, i) => (
                  <option value={i} key={i}>
                    Fotografía {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Logotipo
              <select
                value={design.logo}
                onChange={(e) => patch('logo', e.target.value)}
              >
                <option value="">Sin logotipo</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.url}>
                    {a.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Insignia
              <input
                maxLength={40}
                value={design.badge}
                onChange={(e) => patch('badge', e.target.value)}
              />
            </label>
            <label>
              Marca de agua
              <input
                maxLength={50}
                value={design.watermark}
                onChange={(e) => patch('watermark', e.target.value)}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={design.qr}
                onChange={(e) => patch('qr', e.target.checked)}
              />
              Código QR del producto
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={design.oldPrice}
                onChange={(e) => patch('oldPrice', e.target.checked)}
              />
              Precio anterior si hay oferta
            </label>
            <fieldset>
              <legend>Información visible</legend>
              {available.map((f) => (
                <label className="check" key={f.id}>
                  <input
                    type="checkbox"
                    checked={design.fields.includes(f.id)}
                    onChange={(e) =>
                      patch(
                        'fields',
                        e.target.checked
                          ? [...design.fields, f.id]
                          : design.fields.filter((v) => v !== f.id),
                      )
                    }
                  />
                  {f.name}
                </label>
              ))}
            </fieldset>
            <div className="stack">
              {design.fields.map((id, i) => (
                <div className="row spread" key={id}>
                  <small>{available.find((f) => f.id === id)?.name}</small>
                  <button
                    type="button"
                    className="button button-ghost"
                    disabled={i === 0}
                    onClick={() => {
                      const list = [...design.fields];
                      [list[i - 1], list[i]] = [list[i], list[i - 1]];
                      patch('fields', list);
                    }}
                  >
                    ↑ Subir
                  </button>
                </div>
              ))}
            </div>
            <Button variant="outline" onClick={saveTemplate}>
              Guardar diseño
            </Button>
          </aside>
          <section className="stack">
            {!photo && (
              <div className="notice">
                Carga una fotografía en el producto para generar una imagen.
              </div>
            )}
            <canvas
              ref={canvas}
              className="canvas-preview"
              aria-label="Vista previa de la imagen comercial"
            />
            <p role="status" className="inline-status">
              {message}
            </p>
            <div className="row wrap">
              <select
                aria-label="Formato de archivo"
                value={mime}
                onChange={(e) => setMime(e.target.value)}
                style={{ width: 140 }}
              >
                <option value="image/png">PNG</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/webp">WebP</option>
              </select>
              <Button onClick={() => exportImage()} disabled={!ready || busy}>
                Descargar imagen
              </Button>
              <Button
                variant="outline"
                onClick={() => exportImage(true)}
                disabled={!ready || busy}
              >
                Compartir archivo
              </Button>
              <Button variant="outline" onClick={zip} disabled={!ready || busy}>
                ZIP · 4 formatos
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(productUrl);
                    setMessage('Enlace copiado.');
                  } catch (e) {
                    setMessage(errorMessage(e));
                  }
                }}
              >
                Copiar URL
              </Button>
            </div>
            <small className="muted">
              Compartir un enlace por WhatsApp no adjunta la fotografía. Si tu
              navegador no admite compartir archivos, descarga la imagen y
              adjúntala desde WhatsApp.
            </small>
          </section>
        </div>
      )}
    </>
  );
}
