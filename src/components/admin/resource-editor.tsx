'use client';
import { useState } from 'react';
import { fieldTypes } from '@/lib/schemas';
import { api, errorMessage } from './api';
import { Button } from '../ui/button';
type Row = Record<string, unknown>;
const labels: Record<string, string> = {
  name: 'Nombre',
  slug: 'URL amigable',
  description: 'Descripción',
  key: 'Identificador interno',
  type: 'Tipo de campo',
  options: 'Opciones (una por línea)',
  position: 'Orden',
  title: 'Título',
  body: 'Contenido',
  contact: 'Teléfono o correo',
  message: 'Mensaje',
  status: 'Estado',
  default_value: 'Valor predeterminado',
  min: 'Mínimo',
  max: 'Máximo',
  maxLength: 'Longitud máxima',
};
const typeLabels: Record<string, string> = {
  text: 'Texto corto',
  textarea: 'Texto largo',
  number: 'Número',
  price: 'Precio',
  percentage: 'Porcentaje',
  date: 'Fecha',
  boolean: 'Casilla',
  select: 'Selector único',
  multiselect: 'Selector múltiple',
  color: 'Color',
  size: 'Talla',
  url: 'URL',
  image: 'Imagen',
  file: 'Archivo',
  list: 'Lista',
};
export function ResourceEditor({
  resource,
  title,
  initial,
  categories = [],
}: {
  resource: string;
  title: string;
  initial: Row[];
  categories?: { id: string; name: string }[];
}) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState<Row | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const fields =
    resource === 'categories'
      ? ['name', 'slug', 'description', 'position']
      : resource === 'custom_field_definitions'
        ? [
            'name',
            'key',
            'type',
            'options',
            'position',
            'default_value',
            'min',
            'max',
            'maxLength',
          ]
        : resource === 'content_pages'
          ? ['title', 'slug', 'body', 'status']
          : ['name', 'contact', 'message', 'status'];
  const booleans =
    resource === 'categories'
      ? { featured: 'Categoría destacada', active: 'Activa' }
      : resource === 'custom_field_definitions'
        ? {
            required: 'Obligatorio',
            is_public: 'Visible en el sitio',
            on_image: 'Incluir en imágenes',
          }
        : resource === 'content_pages'
          ? { legal_draft: 'Borrador legal pendiente de revisión' }
          : {};
  function fresh() {
    setDraft(
      resource === 'categories'
        ? {
            name: '',
            slug: '',
            description: '',
            position: 0,
            active: true,
            featured: false,
          }
        : resource === 'custom_field_definitions'
          ? {
              name: '',
              key: '',
              type: 'text',
              options: [],
              required: false,
              is_public: true,
              on_image: false,
              category_ids: [],
              position: 0,
              rules: {},
            }
          : resource === 'content_pages'
            ? {
                title: '',
                slug: '',
                body: '',
                status: 'draft',
                legal_draft: true,
              }
            : { name: '', contact: '', message: '', status: 'new' },
    );
    setMessage('');
    setPreview(false);
  }
  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const data = { ...draft };
      if (resource === 'custom_field_definitions') {
        data.rules = { ...(data.rules as Row) };
        for (const k of ['min', 'max', 'maxLength']) {
          if (data[k] !== undefined && data[k] !== '')
            (data.rules as Row)[k] = Number(data[k]);
          delete data[k];
        }
        if (data.default_value === '') data.default_value = null;
        else if (
          ['number', 'price', 'percentage'].includes(String(data.type)) &&
          data.default_value != null
        )
          data.default_value = Number(data.default_value);
        else if (data.type === 'boolean' && data.default_value != null)
          data.default_value =
            data.default_value === 'true' || data.default_value === true;
      }
      const saved = await api<Row>(`/api/admin/resources/${resource}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      setRows([...rows.filter((r) => r.id !== saved.id), saved]);
      setDraft(saved);
      setMessage('Guardado en la base de datos.');
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="row spread wrap">
        <div>
          <span className="eyebrow">ADMINISTRACIÓN</span>
          <h1>{title}</h1>
        </div>
        <Button onClick={fresh}>+ Crear</Button>
      </div>
      <div className="grid form-grid">
        <section className="panel stack">
          <h2>Registros</h2>
          {rows.length ? (
            rows.map((r) => (
              <button
                className="button button-outline"
                key={String(r.id)}
                onClick={() => {
                  setDraft({
                    ...r,
                    ...(resource === 'custom_field_definitions'
                      ? (r.rules as Row)
                      : {}),
                  });
                  setPreview(false);
                  setMessage('');
                }}
              >
                {String(r.name || r.title || r.id)}
                {r.status ? ` · ${r.status}` : ''}
              </button>
            ))
          ) : (
            <p className="muted">No hay registros todavía.</p>
          )}
        </section>
        <section className="panel">
          {draft ? (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <h2>{draft.id ? 'Editar' : 'Crear registro'}</h2>
              {fields.map((key) => (
                <label key={key}>
                  {labels[key]}
                  {key === 'type' ? (
                    <select
                      value={String(draft[key] || 'text')}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    >
                      {fieldTypes.map((t) => (
                        <option value={t} key={t}>
                          {typeLabels[t]}
                        </option>
                      ))}
                    </select>
                  ) : key === 'status' ? (
                    <select
                      value={String(draft[key] || 'draft')}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.value })
                      }
                    >
                      {(resource === 'content_pages'
                        ? ['draft', 'published']
                        : ['new', 'contacted', 'closed']
                      ).map((s) => (
                        <option key={s} value={s}>
                          {
                            {
                              draft: 'Borrador',
                              published: 'Publicado',
                              new: 'Nueva',
                              contacted: 'Contactado',
                              closed: 'Cerrada',
                            }[s]
                          }
                        </option>
                      ))}
                    </select>
                  ) : ['description', 'body', 'message', 'options'].includes(
                      key,
                    ) ? (
                    <textarea
                      rows={key === 'body' ? 14 : 4}
                      value={
                        key === 'options'
                          ? ((draft.options as string[]) || []).join('\n')
                          : String(draft[key] || '')
                      }
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          [key]:
                            key === 'options'
                              ? e.target.value.split('\n')
                              : e.target.value,
                        })
                      }
                    />
                  ) : (
                    <input
                      type={
                        ['position', 'min', 'max', 'maxLength'].includes(key)
                          ? 'number'
                          : 'text'
                      }
                      value={String(draft[key] ?? '')}
                      required={[
                        'name',
                        'slug',
                        'title',
                        'key',
                        'contact',
                      ].includes(key)}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          [key]:
                            key === 'position'
                              ? Number(e.target.value)
                              : e.target.value,
                        })
                      }
                    />
                  )}
                </label>
              ))}
              {Object.entries(booleans).map(([key, label]) => (
                <label className="check" key={key}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft[key])}
                    onChange={(e) =>
                      setDraft({ ...draft, [key]: e.target.checked })
                    }
                  />
                  {label}
                </label>
              ))}
              {resource === 'custom_field_definitions' && (
                <fieldset>
                  <legend>Aplicar en categorías (ninguna = todas)</legend>
                  {categories.map((c) => (
                    <label className="check" key={c.id}>
                      <input
                        type="checkbox"
                        checked={(
                          (draft.category_ids as string[]) || []
                        ).includes(c.id)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            category_ids: e.target.checked
                              ? [
                                  ...((draft.category_ids as string[]) || []),
                                  c.id,
                                ]
                              : ((draft.category_ids as string[]) || []).filter(
                                  (id) => id !== c.id,
                                ),
                          })
                        }
                      />
                      {c.name}
                    </label>
                  ))}
                </fieldset>
              )}
              {resource === 'content_pages' && (
                <>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setPreview(!preview)}
                  >
                    Vista previa
                  </Button>
                  {preview && (
                    <article className="panel description">
                      <h2>{String(draft.title)}</h2>
                      {String(draft.body)}
                    </article>
                  )}
                  <small className="muted">
                    Publicar copia el contenido al sitio. Desmarca «Borrador
                    legal» únicamente después de revisar los textos y completar
                    la información del negocio.
                  </small>
                </>
              )}
              <Button disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</Button>
              <p role="status" className="inline-status">
                {message}
              </p>
            </form>
          ) : (
            <div className="empty">
              Selecciona un registro o crea uno nuevo.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
