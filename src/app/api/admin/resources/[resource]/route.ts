import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireStaff } from '@/lib/supabase';
import { mutation, jsonBody, apiError, dbError } from '@/lib/http';
import {
  fieldSchema,
  pageSchema,
  settingsSchema,
  slugSchema,
  text,
} from '@/lib/schemas';
const config = {
  categories: {
    permission: 'catalog.write',
    schema: z.object({
      id: z.uuid().optional(),
      name: text(100).min(1),
      slug: slugSchema,
      description: text(2000).default(''),
      featured: z.boolean().default(false),
      active: z.boolean().default(true),
      position: z.number().int().default(0),
    }),
  },
  custom_field_definitions: {
    permission: 'catalog.write',
    schema: fieldSchema,
  },
  content_pages: { permission: 'content.write', schema: pageSchema },
  image_templates: {
    permission: 'media.write',
    schema: z.object({
      id: z.uuid().optional(),
      name: text(100).min(1),
      config: z.record(z.string(), z.unknown()),
    }),
  },
  contact_requests: {
    permission: 'catalog.write',
    schema: z.object({
      id: z.uuid().optional(),
      product_id: z.uuid().nullable().optional(),
      name: text(100).min(1),
      contact: text(200).min(1),
      message: text(3000),
      status: z.enum(['new', 'contacted', 'closed']).default('new'),
    }),
  },
  saved_filters: {
    permission: 'catalog.write',
    schema: z.object({
      id: z.uuid().optional(),
      name: text(100).min(1),
      filters: z.record(z.string(), z.unknown()),
    }),
  },
} as const;
type Context = { params: Promise<{ resource: string }> };
export async function GET(_req: Request, context: Context) {
  try {
    const { resource } = await context.params;
    const allowed = [
      ...Object.keys(config),
      'site_settings',
      'audit_logs',
      'inventory_movements',
      'price_history',
      'notifications',
    ];
    if (!allowed.includes(resource))
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const { client } = await requireStaff();
    const { data, error } = await client.from(resource).select('*').limit(1000);
    dbError(error);
    return NextResponse.json(data);
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request, context: Context) {
  try {
    const { resource } = await context.params;
    if (resource === 'site_settings') {
      const { client } = await mutation(req, 'settings.write');
      const body = z
        .object({ settings: settingsSchema, publish: z.boolean() })
        .parse(await jsonBody(req));
      const { data, error } = await client
        .from('site_settings')
        .update({
          draft: body.settings,
          ...(body.publish ? { published: body.settings } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', true)
        .select()
        .single();
      dbError(error);
      return NextResponse.json(data);
    }
    if (!(resource in config))
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });
    const entry = config[resource as keyof typeof config];
    const { client, user } = await mutation(req, entry.permission);
    const parsed = entry.schema.parse(await jsonBody(req));
    const row: Record<string, unknown> = { ...parsed };
    if (resource === 'saved_filters') row.owner_id = user.id;
    if (resource === 'content_pages') {
      const page = pageSchema.parse(row);
      if (page.status === 'published' && page.legal_draft)
        throw new Error('Confirma la revisión legal antes de publicar.');
      if (page.status === 'published') row.published_body = page.body;
      row.updated_at = new Date().toISOString();
    }
    const { data, error } = await client
      .from(resource)
      .upsert(row)
      .select()
      .single();
    dbError(error);
    return NextResponse.json(data);
  } catch (e) {
    return apiError(e);
  }
}
