'use client';
import { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import Link from 'next/link';
import type { Product, Category, FieldDefinition } from '@/lib/types';
import { productSchema, type ProductInput } from '@/lib/schemas';
import { api, errorMessage } from './api';
import { Button } from '../ui/button';
import { MediaField } from './media-field';
const blank: ProductInput = {
  name: '',
  sku: '',
  slug: '',
  description: '',
  price: 0,
  stock: 0,
  low_stock_threshold: 3,
  status: 'draft',
  featured: false,
  category_ids: [],
  variants: [],
  field_values: [],
};
const moneyInput = { setValueAs: (v: string) => (v === '' ? null : Number(v)) };
export function ProductEditor({
  initial,
  categories,
  fields,
}: {
  initial: Product | null;
  categories: Category[];
  fields: FieldDefinition[];
}) {
  const form = useForm<ProductInput>({
    defaultValues: initial
      ? {
          ...initial,
          category_ids: initial.product_categories.map((c) => c.category_id),
          variants: initial.product_variants,
          field_values: initial.product_field_values,
        }
      : blank,
  });
  const { register, control, getValues, setValue, watch } = form;
  const variants = useFieldArray({ control, name: 'variants' });
  const id = useRef(initial?.id);
  const version = useRef(initial?.version);
  const persistedStatus = useRef(initial?.status || 'draft');
  const [images, setImages] = useState(initial?.product_images || []);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<(auto?: boolean) => Promise<void>>(async () => {});
  const status = watch('status');
  const categoryIds = watch('category_ids');
  async function save(auto = false) {
    if (saving.current) return;
    const snapshot = JSON.stringify(getValues());
    if (
      auto &&
      (!id.current ||
        persistedStatus.current !== 'draft' ||
        getValues('status') !== 'draft')
    )
      return;
    const current = getValues();
    const applicable = fields.filter(
      (f) =>
        !f.category_ids.length ||
        f.category_ids.some((c) => current.category_ids.includes(c)),
    );
    const field_values = applicable.flatMap((f) => {
      const existing = current.field_values.find((v) => v.field_id === f.id);
      return existing
        ? [existing]
        : f.default_value !== undefined && f.default_value !== null
          ? [{ field_id: f.id!, value: f.default_value }]
          : [];
    });
    const validation = productSchema.safeParse({
      ...current,
      field_values,
      id: id.current,
      version: version.current,
    });
    if (!validation.success) {
      if (!auto)
        setMessage(
          validation.error.issues
            .map((i) => `${i.path.join('.')}: ${i.message}`)
            .join('\n'),
        );
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      const saved = await api<Product>('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(validation.data),
      });
      id.current = saved.id;
      version.current = saved.version;
      persistedStatus.current = saved.status;
      setDirty(JSON.stringify(getValues()) !== snapshot);
      setMessage(
        `${auto ? 'Borrador guardado automáticamente' : 'Producto guardado'} · ${new Date().toLocaleTimeString('es-SV')}`,
      );
      if (!initial)
        history.replaceState(null, '', `/admin/productos/${saved.id}`);
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const sub = watch((_value, { name }) => {
      if (!name) return;
      setDirty(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void saveRef.current(true), 2000);
    });
    return () => {
      sub.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [watch]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const navigate = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a');
      if (
        dirty &&
        anchor &&
        anchor.target !== '_blank' &&
        anchor.href !== location.href &&
        !confirm('Hay cambios sin guardar. ¿Salir de todos modos?')
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('beforeunload', guard);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', guard);
      document.removeEventListener('click', navigate, true);
    };
  }, [dirty]);
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    if (!id.current) {
      setMessage('Guarda el producto antes de cargar imágenes.');
      return;
    }
    setBusy(true);
    try {
      for (const [fileIndex, file] of Array.from(files).entries()) {
        const data = new FormData();
        data.set('file', file);
        data.set('product_id', id.current);
        data.set('alt', getValues('name'));
        data.set('position', String(images.length + fileIndex));
        await api('/api/admin/media', { method: 'POST', body: data });
      }
      const all = await api<Product[]>('/api/admin/products');
      setImages(all.find((p) => p.id === id.current)?.product_images || []);
      setMessage('Fotografías cargadas.');
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function reorder(index: number, direction: number) {
    const list = [...images];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    try {
      await api('/api/admin/media', {
        method: 'PATCH',
        body: JSON.stringify({
          images: list.map((v, i) => ({ id: v.id, position: i, alt: v.alt })),
        }),
      });
      setImages(list);
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }
  async function duplicate() {
    if (!confirm('¿Crear una copia en borrador sin fotografías?')) return;
    try {
      const input = {
        ...getValues(),
        id: undefined,
        version: undefined,
        status: 'draft',
        sku: `${getValues('sku').slice(0, 60)}-${Date.now()}`,
        slug: `${getValues('slug').slice(0, 130)}-${Date.now()}`,
        variants: [],
      };
      const copy = await api<Product>('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      location.assign(`/admin/productos/${copy.id}`);
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }
  return (
    <>
      <span className="eyebrow">CATÁLOGO / PRODUCTO</span>
      <h1>{initial ? 'Editar producto' : 'Nuevo producto'}</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="toolbar row spread">
          <span className="inline-status" role="status">
            {dirty ? 'Cambios sin guardar. ' : ''}
            {message}
          </span>
          <div className="row">
            <Button
              type="button"
              variant="outline"
              onClick={duplicate}
              disabled={!id.current || busy}
            >
              Duplicar
            </Button>
            <Button disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
        <div className="stack">
          <section className="panel form-grid">
            <h2 className="span-2">Información del producto</h2>
            <label>
              Nombre
              <input {...register('name')} required maxLength={180} />
            </label>
            <label>
              SKU / identificador
              <input {...register('sku')} required maxLength={80} />
            </label>
            <label className="span-2">
              URL amigable
              <input
                {...register('slug')}
                required
                placeholder="lampara-solar"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
              />
            </label>
            <label className="span-2">
              Descripción
              <textarea {...register('description')} maxLength={12000} />
            </label>
            <label>
              Precio normal (USD)
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('price', { valueAsNumber: true })}
                required
              />
            </label>
            <label>
              Precio de oferta (opcional)
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('sale_price', moneyInput)}
              />
            </label>
            {(['sale_starts_at', 'sale_ends_at', 'publish_at'] as const).map(
              (k) => (
                <label key={k}>
                  {
                    {
                      sale_starts_at: 'Inicio de oferta',
                      sale_ends_at: 'Fin de oferta',
                      publish_at: 'Publicar el',
                    }[k]
                  }
                  <Controller
                    control={control}
                    name={k}
                    render={({ field }) => (
                      <input
                        type="datetime-local"
                        value={
                          field.value
                            ? new Date(
                                new Date(field.value).getTime() -
                                  new Date(field.value).getTimezoneOffset() *
                                    60000,
                              )
                                .toISOString()
                                .slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? new Date(e.target.value).toISOString()
                              : null,
                          )
                        }
                      />
                    )}
                  />
                </label>
              ),
            )}
            <label>
              Estado
              <select {...register('status')}>
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="scheduled">Programado</option>
                <option value="archived">Archivado</option>
              </select>
            </label>
            <small className="muted span-2">
              Las fechas usan la zona horaria de tu dispositivo. El autoguardado
              solo se aplica a productos que ya están guardados como borrador.
            </small>
            <label>
              Existencias
              <input
                type="number"
                min="0"
                {...register('stock', { valueAsNumber: true })}
              />
            </label>
            <label>
              Alerta de bajo inventario
              <input
                type="number"
                min="0"
                {...register('low_stock_threshold', { valueAsNumber: true })}
              />
            </label>
            {(
              [
                'brand',
                'material',
                'dimensions',
                'warranty',
                'delivery',
                'badge',
              ] as const
            ).map((k) => (
              <label key={k}>
                {
                  {
                    brand: 'Marca',
                    material: 'Material',
                    dimensions: 'Dimensiones',
                    warranty: 'Garantía aplicable',
                    delivery: 'Información de entrega',
                    badge: 'Etiqueta promocional',
                  }[k]
                }
                <input {...register(k)} />
              </label>
            ))}
            <label className="check">
              <input type="checkbox" {...register('featured')} />
              Producto destacado
            </label>
            <fieldset className="span-2">
              <legend>Categorías</legend>
              <div className="row wrap">
                {categories.map((c) => (
                  <label className="check" key={c.id}>
                    <input
                      type="checkbox"
                      value={c.id}
                      {...register('category_ids')}
                    />
                    {c.name}
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
          <section className="panel stack">
            <div className="row spread">
              <h2>Variantes</h2>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  variants.append({
                    sku: '',
                    color: '',
                    size: '',
                    price: null,
                    stock: 0,
                  })
                }
              >
                Añadir variante
              </Button>
            </div>
            {variants.fields.map((v, i) => (
              <div className="form-grid" key={v.id}>
                <label>
                  SKU
                  <input {...register(`variants.${i}.sku`)} required />
                </label>
                <label>
                  Color
                  <input {...register(`variants.${i}.color`)} />
                </label>
                <label>
                  Talla
                  <input {...register(`variants.${i}.size`)} />
                </label>
                <label>
                  Precio específico
                  <input
                    type="number"
                    step="0.01"
                    {...register(`variants.${i}.price`, moneyInput)}
                  />
                </label>
                <label>
                  Existencias
                  <input
                    type="number"
                    min="0"
                    {...register(`variants.${i}.stock`, {
                      valueAsNumber: true,
                    })}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => variants.remove(i)}
                >
                  Quitar variante
                </Button>
              </div>
            ))}
          </section>
          <section className="panel form-grid">
            <h2 className="span-2">Campos personalizados</h2>
            {fields
              .filter(
                (f) =>
                  !f.category_ids.length ||
                  f.category_ids.some((c) => categoryIds.includes(c)),
              )
              .map((f) => {
                const values = watch('field_values');
                const value =
                  values.find((v) => v.field_id === f.id)?.value ??
                  f.default_value ??
                  '';
                function update(val: unknown) {
                  setValue(
                    'field_values',
                    [
                      ...getValues('field_values').filter(
                        (v) => v.field_id !== f.id,
                      ),
                      { field_id: f.id!, value: val },
                    ],
                    { shouldDirty: true },
                  );
                }
                return (
                  <label key={f.id}>
                    {f.name}
                    {f.required ? ' *' : ''}
                    {f.type === 'image' || f.type === 'file' ? (
                      <MediaField value={String(value)} onChange={update} />
                    ) : f.type === 'boolean' ? (
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => update(e.target.checked)}
                      />
                    ) : f.type === 'select' ? (
                      <select
                        value={String(value)}
                        onChange={(e) => update(e.target.value)}
                      >
                        <option value="">Seleccionar</option>
                        {f.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : f.type === 'multiselect' ? (
                      <select
                        multiple
                        value={Array.isArray(value) ? value : []}
                        onChange={(e) =>
                          update(
                            Array.from(e.target.selectedOptions).map(
                              (o) => o.value,
                            ),
                          )
                        }
                      >
                        {f.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : f.type === 'textarea' ? (
                      <textarea
                        value={String(value)}
                        onChange={(e) => update(e.target.value)}
                      />
                    ) : (
                      <input
                        type={
                          ['number', 'price', 'percentage'].includes(f.type)
                            ? 'number'
                            : f.type === 'date'
                              ? 'date'
                              : f.type === 'url'
                                ? 'url'
                                : 'text'
                        }
                        step="any"
                        value={
                          Array.isArray(value)
                            ? value.join(', ')
                            : String(value)
                        }
                        placeholder={
                          f.type === 'list'
                            ? 'Valores separados por comas'
                            : ''
                        }
                        onChange={(e) =>
                          update(
                            ['number', 'price', 'percentage'].includes(f.type)
                              ? e.target.value === ''
                                ? null
                                : Number(e.target.value)
                              : f.type === 'list'
                                ? e.target.value.split(',').map((v) => v.trim())
                                : e.target.value,
                          )
                        }
                      />
                    )}
                  </label>
                );
              })}
            {!fields.length && (
              <p>
                No hay campos definidos.{' '}
                <Link className="link-arrow" href="/admin/campos">
                  Crear campos
                </Link>
              </p>
            )}
          </section>
          <section className="panel stack">
            <h2>Fotografías</h2>
            <label>
              Cargar imágenes (PNG, JPEG, WebP; hasta 5 MB por archivo)
              <input
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => void upload(e.target.files)}
              />
            </label>
            {images.map((image, i) => (
              <div className="row wrap" key={image.id}>
                <span>
                  {i + 1}. {image.alt}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => reorder(i, -1)}
                  disabled={i === 0}
                >
                  ↑ Subir
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => reorder(i, 1)}
                  disabled={i === images.length - 1}
                >
                  ↓ Bajar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={async () => {
                    if (!confirm('¿Quitar esta fotografía del producto?'))
                      return;
                    try {
                      await api('/api/admin/media', {
                        method: 'DELETE',
                        body: JSON.stringify({ id: image.id }),
                      });
                      setImages(images.filter((v) => v.id !== image.id));
                    } catch (e) {
                      setMessage(errorMessage(e));
                    }
                  }}
                >
                  Quitar
                </Button>
              </div>
            ))}
          </section>
          {id.current && (
            <div className="row wrap">
              <Link
                href={`/admin/estudio?product=${id.current}`}
                className="button button-outline"
              >
                Crear imagen comercial
              </Link>
              {status === 'published' && (
                <Link
                  className="button button-outline"
                  href={`/producto/${getValues('slug')}`}
                >
                  Ver producto ↗
                </Link>
              )}
            </div>
          )}
        </div>
      </form>
    </>
  );
}
