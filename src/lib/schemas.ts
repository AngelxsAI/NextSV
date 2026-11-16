import { z } from 'zod';
export const text = (max = 300) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(
      (v) => !/[<>\u0000]/.test(v),
      'No se permite HTML ni caracteres de control.',
    );
const optionalText = text(1000).nullable().optional();
export const slugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Usa letras minúsculas, números y guiones.',
  );
const dateTime = z.iso.datetime({ offset: true }).nullable().optional();
export const variantSchema = z.object({
  sku: text(80).min(1),
  color: text(80).optional(),
  size: text(80).optional(),
  price: z.number().min(0).max(9999999999).nullable().optional(),
  stock: z.number().int().min(0),
});
export const productSchema = z
  .object({
    id: z.uuid().optional(),
    version: z.number().int().positive().optional(),
    sku: text(80).min(1),
    slug: slugSchema,
    name: text(180).min(1),
    description: text(12000).default(''),
    price: z.number().min(0).max(9999999999),
    sale_price: z.number().min(0).nullable().optional(),
    sale_starts_at: dateTime,
    sale_ends_at: dateTime,
    status: z
      .enum(['draft', 'published', 'scheduled', 'archived'])
      .default('draft'),
    publish_at: dateTime,
    stock: z.number().int().min(0).max(2147483647).default(0),
    low_stock_threshold: z.number().int().min(0).default(3),
    brand: optionalText,
    material: optionalText,
    dimensions: optionalText,
    warranty: optionalText,
    delivery: optionalText,
    badge: optionalText,
    featured: z.boolean().default(false),
    category_ids: z.array(z.uuid()).max(30).default([]),
    variants: z.array(variantSchema).max(100).default([]),
    field_values: z
      .array(z.object({ field_id: z.uuid(), value: z.unknown() }))
      .max(100)
      .default([]),
  })
  .superRefine((v, ctx) => {
    if (v.sale_price != null && v.sale_price >= v.price)
      ctx.addIssue({
        code: 'custom',
        path: ['sale_price'],
        message: 'La oferta debe ser menor al precio normal.',
      });
    if (v.status === 'scheduled' && !v.publish_at)
      ctx.addIssue({
        code: 'custom',
        path: ['publish_at'],
        message: 'Indica la fecha de publicación.',
      });
    if (
      v.sale_starts_at &&
      v.sale_ends_at &&
      v.sale_starts_at >= v.sale_ends_at
    )
      ctx.addIssue({
        code: 'custom',
        path: ['sale_ends_at'],
        message: 'La oferta debe terminar después de iniciar.',
      });
    if (new Set(v.variants.map((x) => x.sku)).size !== v.variants.length)
      ctx.addIssue({
        code: 'custom',
        path: ['variants'],
        message: 'Los SKU de variantes deben ser únicos.',
      });
  });
export type ProductInput = z.infer<typeof productSchema>;
export const fieldTypes = [
  'text',
  'textarea',
  'number',
  'price',
  'percentage',
  'date',
  'boolean',
  'select',
  'multiselect',
  'color',
  'size',
  'url',
  'image',
  'file',
  'list',
] as const;
export const fieldSchema = z.object({
  id: z.uuid().optional(),
  key: z.string().regex(/^[a-z][a-z0-9_]{0,49}$/),
  name: text(100).min(1),
  type: z.enum(fieldTypes),
  required: z.boolean().default(false),
  is_public: z.boolean().default(true),
  on_image: z.boolean().default(false),
  position: z.number().int().default(0),
  options: z.array(text(100)).max(100).default([]),
  rules: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      maxLength: z.number().int().min(1).max(12000).optional(),
    })
    .default({}),
  category_ids: z.array(z.uuid()).default([]),
  default_value: z.unknown().optional(),
});
export type FieldDefinition = z.infer<typeof fieldSchema>;
export function validateFields(
  defs: FieldDefinition[],
  values: { field_id: string; value: unknown }[],
  categoryIds: string[],
  published: boolean,
) {
  const applicable = defs.filter(
    (d) =>
      !d.category_ids.length ||
      d.category_ids.some((c) => categoryIds.includes(c)),
  );
  for (const val of values)
    if (!applicable.some((d) => d.id === val.field_id))
      throw new Error('Campo desconocido o no aplicable a la categoría.');
  if (new Set(values.map((v) => v.field_id)).size !== values.length)
    throw new Error('Campo duplicado.');
  for (const def of applicable) {
    const value = values.find((v) => v.field_id === def.id)?.value;
    if (value === undefined || value === null || value === '') {
      if (def.required && published)
        throw new Error(`${def.name} es obligatorio.`);
      continue;
    }
    let schema: z.ZodType = text(
      def.rules.maxLength ?? (def.type === 'textarea' ? 12000 : 500),
    );
    if (['number', 'price', 'percentage'].includes(def.type)) {
      let n = z.number();
      if (def.type !== 'number') n = n.min(0);
      if (def.type === 'percentage') n = n.max(100);
      if (def.rules.min !== undefined) n = n.min(def.rules.min);
      if (def.rules.max !== undefined) n = n.max(def.rules.max);
      schema = n;
    }
    if (def.type === 'boolean') schema = z.boolean();
    if (def.type === 'date') schema = z.iso.date();
    if (def.type === 'url')
      schema = z
        .url()
        .refine((v) => /^https?:\/\//.test(v), 'Solo HTTP/HTTPS.');
    if (def.type === 'image' || def.type === 'file') schema = z.uuid();
    if (def.type === 'select')
      schema = z.string().refine((v) => def.options.includes(v));
    if (def.type === 'multiselect')
      schema = z
        .array(z.string().refine((v) => def.options.includes(v)))
        .max(100);
    if (def.type === 'list') schema = z.array(text(300)).max(100);
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw new Error(`${def.name}: valor inválido.`);
  }
}
export const settingsSchema = z.object({
  name: text(100).min(1),
  headline: text(180).min(1),
  description: text(2000),
  phone: text(30).optional(),
  whatsapp: z
    .string()
    .regex(/^\d{8,15}$/)
    .or(z.literal(''))
    .optional(),
  hours: text(300).optional(),
  address: text(500).optional(),
  logo_asset_id: z.uuid().or(z.literal('')).optional(),
  banner_asset_id: z.uuid().or(z.literal('')).optional(),
  announcement: text(300).optional(),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#146c52'),
  social_links: z
    .array(
      z.object({
        label: text(50),
        url: z.url().refine((v) => v.startsWith('https://')),
      }),
    )
    .default([]),
  faqs: z
    .array(z.object({ question: text(300), answer: text(2000) }))
    .default([]),
});
export const pageSchema = z.object({
  id: z.uuid().optional(),
  slug: slugSchema,
  title: text(180).min(1),
  body: text(30000),
  status: z.enum(['draft', 'published']),
  legal_draft: z.boolean().default(true),
});
export function activePrice(
  p: {
    price: number;
    sale_price?: number | null;
    sale_starts_at?: string | null;
    sale_ends_at?: string | null;
  },
  now = Date.now(),
) {
  return p.sale_price != null &&
    (!p.sale_starts_at || Date.parse(p.sale_starts_at) <= now) &&
    (!p.sale_ends_at || Date.parse(p.sale_ends_at) > now)
    ? p.sale_price
    : p.price;
}
export function safeCsvCell(v: unknown) {
  const s = String(v ?? '');
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}
