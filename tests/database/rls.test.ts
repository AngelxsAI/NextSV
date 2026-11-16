import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, it, expect } from 'vitest';
let db: PGlite;
const owner = '11111111-1111-4111-8111-111111111111';
const editor = '22222222-2222-4222-8222-222222222222';
const productId = '33333333-3333-4333-8333-333333333333';
async function as(role: string, uid: string | null = null, aal = 'aal1') {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({ sub: uid, aal }),
  ]);
  await db.exec(`set role ${role}`);
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon nologin;create role authenticated nologin;create schema auth;create schema storage;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select (current_setting('request.jwt.claims',true)::jsonb->>'sub')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
 grant usage on schema public,auth,storage to anon,authenticated;grant select,insert,delete on storage.objects to anon,authenticated;
 `);
  for (const file of [
    '20261115204611_nextsv_core.sql',
    '20261115204624_nextsv_validation.sql',
    '20261115204631_nextsv_legal_drafts.sql',
    '20261115204636_nextsv_media_and_history.sql',
  ]) {
    await db.exec(
      readFileSync(`supabase/migrations/${file}`, 'utf8').replace(
        'create extension if not exists pgcrypto;',
        '',
      ),
    );
  }
  await db.exec(
    `insert into auth.users values('${owner}'),('${editor}');insert into public.profiles(id,role) values('${owner}','owner'),('${editor}','editor');`,
  );
});
afterAll(async () => {
  await db?.close();
});
it('anónimo no puede insertar productos', async () => {
  await as('anon');
  await expect(
    db.exec("insert into products(sku,slug,name,price) values('X','x','X',1)"),
  ).rejects.toThrow();
});
it('administrador sin MFA no puede escribir', async () => {
  await as('authenticated', owner);
  await expect(
    db.exec("insert into products(sku,slug,name,price) values('X','x','X',1)"),
  ).rejects.toThrow();
});
it('propietario MFA crea y consulta borrador con persistencia', async () => {
  await as('authenticated', owner, 'aal2');
  const input = {
    id: productId,
    sku: 'T-1',
    slug: 'test-1',
    name: 'Prueba',
    price: 10,
    stock: 4,
  };
  await db.query('select save_product($1::jsonb,null)', [
    JSON.stringify(input),
  ]);
  expect((await db.query('select name from products')).rows).toEqual([
    { name: 'Prueba' },
  ]);
});
it('anónimo no ve borradores', async () => {
  await as('anon');
  expect((await db.query('select * from products')).rows).toHaveLength(0);
});
it('conflicto de versión no sobrescribe datos', async () => {
  await as('authenticated', owner, 'aal2');
  await expect(
    db.query('select save_product($1::jsonb,99)', [
      JSON.stringify({
        id: productId,
        sku: 'T-1',
        slug: 'test-1',
        name: 'Cambio',
        price: 10,
      }),
    ]),
  ).rejects.toThrow('VERSION_CONFLICT');
  expect(
    (await db.query<{ name: string }>('select name from products')).rows[0]
      .name,
  ).toBe('Prueba');
});
it('publicación es visible para anónimo, escritura sigue denegada', async () => {
  await as('authenticated', owner, 'aal2');
  await db.query("update products set status='published' where id=$1", [
    productId,
  ]);
  await as('anon');
  expect((await db.query('select id from products')).rows).toHaveLength(1);
  await expect(db.exec('update products set price=0')).rejects.toThrow();
});
it('editor no puede modificar ajustes ni elevar su rol', async () => {
  await as('authenticated', editor, 'aal2');
  expect(
    (await db.exec("update site_settings set published='{}'"))[0].affectedRows,
  ).toBe(0);
  await expect(db.exec("update profiles set role='owner'")).rejects.toThrow();
});
it('borrador de CMS no se filtra a lectores públicos', async () => {
  await as('authenticated', owner, 'aal2');
  await db.exec(
    `update site_settings set draft='{"secret":"draft"}',published='{"name":"NextSV"}'`,
  );
  await as('anon');
  expect((await db.query('select * from site_settings')).rows).toHaveLength(0);
  expect(
    (await db.query<{ public_settings: unknown }>('select public_settings()'))
      .rows[0].public_settings,
  ).toEqual({ name: 'NextSV' });
});
it('archivo privado no es visible para anónimo', async () => {
  await as('anon');
  expect((await db.query('select * from storage.objects')).rows).toHaveLength(
    0,
  );
  await expect(
    db.exec(
      "insert into storage.objects(bucket_id,name) values('catalog','evil.svg')",
    ),
  ).rejects.toThrow();
});
it('inventario y auditoría se registran en el servidor', async () => {
  await as('authenticated', owner, 'aal2');
  await db.query('update products set stock=2 where id=$1', [productId]);
  expect(
    (await db.query('select delta from inventory_movements')).rows,
  ).toEqual([{ delta: 4 }, { delta: -2 }]);
  expect(
    (await db.query('select id from audit_logs')).rows.length,
  ).toBeGreaterThan(0);
});
it('papelera oculta y restauración conserva producto', async () => {
  await as('authenticated', owner, 'aal2');
  await db.exec('update products set deleted_at=now()');
  await as('anon');
  expect((await db.query('select * from products')).rows).toHaveLength(0);
  await as('authenticated', owner, 'aal2');
  await db.exec("update products set deleted_at=null,status='draft'");
  expect((await db.query('select id from products')).rows).toHaveLength(1);
});

it('campos personalizados validan tipo incluso por SQL directo', async () => {
  await as('authenticated', owner, 'aal2');
  await db.exec(
    "insert into custom_field_definitions(id,key,name,type,rules) values('44444444-4444-4444-8444-444444444444','potencia','Potencia','number','{\"min\":1,\"max\":100}')",
  );
  await expect(
    db.query(
      'insert into product_field_values(product_id,field_id,value) values($1,$2,$3::jsonb)',
      [productId, '44444444-4444-4444-8444-444444444444', '"texto"'],
    ),
  ).rejects.toThrow('Expected number');
  await db.query(
    'insert into product_field_values(product_id,field_id,value) values($1,$2,$3::jsonb)',
    [productId, '44444444-4444-4444-8444-444444444444', '50'],
  );
});
it('campos privados no aparecen en la API pública', async () => {
  await as('authenticated', owner, 'aal2');
  await db.exec(
    "update custom_field_definitions set is_public=false;update products set status='published'",
  );
  await as('anon');
  expect(
    (await db.query('select * from product_field_values')).rows,
  ).toHaveLength(0);
});
it('campos obligatorios impiden publicación incompleta y revierten transacción', async () => {
  await as('authenticated', owner, 'aal2');
  await db.exec(
    "update products set status='draft';insert into custom_field_definitions(key,name,type,required) values('garantia_test','Garantía requerida','text',true)",
  );
  await expect(
    db.exec("update products set status='published'"),
  ).rejects.toThrow('Required field missing');
  expect(
    (await db.query<{ status: string }>('select status from products')).rows[0]
      .status,
  ).toBe('draft');
  await db.exec('update custom_field_definitions set required=false');
});
it('imágenes publicadas son visibles, imágenes en borrador no', async () => {
  await as('authenticated', owner, 'aal2');
  const asset = '55555555-5555-4555-8555-555555555555';
  await db.query(
    "insert into media_assets(id,path,mime_type,size_bytes,owner_id) values($1,$2,'image/png',100,$3)",
    [asset, owner + '/test.png', owner],
  );
  await db.query(
    "insert into storage.objects(bucket_id,name) values('catalog',$1)",
    [owner + '/test.png'],
  );
  await db.query(
    "insert into product_images(product_id,asset_id,alt) values($1,$2,'Prueba')",
    [productId, asset],
  );
  await as('anon');
  expect((await db.query('select * from storage.objects')).rows).toHaveLength(
    0,
  );
  await as('authenticated', owner, 'aal2');
  await db.exec("update products set status='published'");
  await as('anon');
  expect((await db.query('select * from storage.objects')).rows).toHaveLength(
    1,
  );
});
it('páginas legales permanecen privadas sin revisión', async () => {
  await as('anon');
  expect((await db.query('select * from content_pages')).rows).toHaveLength(0);
  expect((await db.query('select * from public_pages()')).rows).toHaveLength(0);
});
it('programación futura permanece oculta y fecha vencida permite lectura', async () => {
  await as('authenticated', owner, 'aal2');
  await db.exec(
    "update products set status='scheduled',publish_at=now()+interval '1 day'",
  );
  await as('anon');
  expect((await db.query('select id from products')).rows).toHaveLength(0);
  await as('authenticated', owner, 'aal2');
  await db.exec("update products set publish_at=now()-interval '1 minute'");
  await as('anon');
  expect((await db.query('select id from products')).rows).toHaveLength(1);
});
it('copia de PostgreSQL embebido conserva datos al restaurar', async () => {
  await as('postgres');
  const archive = await db.dumpDataDir();
  const restored = new PGlite({ loadDataDir: archive });
  try {
    await restored.waitReady;
    expect(
      (await restored.query<{ id: string }>('select id from public.products'))
        .rows[0].id,
    ).toBe(productId);
  } finally {
    await restored.close();
  }
});
