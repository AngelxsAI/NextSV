begin;
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;

create table public.roles (name text primary key);
insert into public.roles values ('owner'),('editor'),('viewer');
create table public.permissions (role text references public.roles(name), permission text not null, primary key(role,permission));
insert into public.permissions select 'owner', unnest(array['catalog.write','content.write','settings.write','media.write','reports.read']);
insert into public.permissions select 'editor', unnest(array['catalog.write','content.write','media.write','reports.read']);
insert into public.permissions values ('viewer','reports.read');
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default '', role text not null references public.roles(name) default 'viewer', created_at timestamptz not null default now());

create function public.has_permission(p_permission text) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((auth.jwt()->>'aal')='aal2',false) and exists(select 1 from public.profiles p join public.permissions r on r.role=p.role where p.id=auth.uid() and r.permission=p_permission)
$$;
create function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((auth.jwt()->>'aal')='aal2',false) and exists(select 1 from public.profiles where id=auth.uid())
$$;

create table public.categories (id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100), slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), description text not null default '', featured boolean not null default false, active boolean not null default true, position integer not null default 0);
create table public.products (
 id uuid primary key default gen_random_uuid(), sku text not null unique check(length(sku) between 1 and 80), slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), name text not null check(length(name) between 1 and 180), description text not null default '' check(length(description)<=12000),
 price numeric(12,2) not null check(price>=0), sale_price numeric(12,2), sale_starts_at timestamptz, sale_ends_at timestamptz,
 status text not null default 'draft' check(status in ('draft','published','scheduled','archived')), publish_at timestamptz,
 stock integer not null default 0 check(stock>=0), low_stock_threshold integer not null default 3 check(low_stock_threshold>=0),
 brand text, material text, dimensions text, warranty text, delivery text, badge text,
 featured boolean not null default false, views bigint not null default 0 check(views>=0),
 deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), version integer not null default 1,
 check(sale_price is null or (sale_price>=0 and sale_price<price)), check(sale_ends_at is null or sale_starts_at is null or sale_ends_at>sale_starts_at), check(status<>'scheduled' or publish_at is not null)
);
create index products_catalog on public.products(status,created_at desc) where deleted_at is null;
create index products_price on public.products(price);
create index products_search on public.products using gin(to_tsvector('spanish',name||' '||description));
create table public.product_categories (product_id uuid references public.products on delete cascade, category_id uuid references public.categories on delete cascade, primary key(product_id,category_id));
create table public.product_variants (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade, sku text not null unique, color text, size text, price numeric(12,2) check(price>=0), stock integer not null default 0 check(stock>=0), unique(product_id,color,size));
create table public.media_assets (id uuid primary key default gen_random_uuid(), path text not null unique, mime_type text not null check(mime_type in ('image/png','image/jpeg','image/webp','application/pdf')), size_bytes integer not null check(size_bytes between 1 and 5242880), owner_id uuid not null references auth.users(id), created_at timestamptz not null default now());
create table public.product_images (id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products on delete cascade, asset_id uuid not null references public.media_assets, alt text not null check(length(alt) between 1 and 300), position integer not null default 0);
create table public.custom_field_definitions (id uuid primary key default gen_random_uuid(), key text not null unique check(key ~ '^[a-z][a-z0-9_]{0,49}$'), name text not null, type text not null check(type in ('text','textarea','number','price','percentage','date','boolean','select','multiselect','color','size','url','image','file','list')), default_value jsonb, required boolean not null default false, is_public boolean not null default true, on_image boolean not null default false, position integer not null default 0, options text[] not null default '{}', rules jsonb not null default '{}', category_ids uuid[] not null default '{}');
create table public.product_field_values (product_id uuid references public.products on delete cascade, field_id uuid references public.custom_field_definitions on delete cascade, value jsonb not null, primary key(product_id,field_id));
create index product_field_query on public.product_field_values using gin(value);
create table public.inventory_movements (id bigint generated always as identity primary key, product_id uuid references public.products on delete set null, delta integer not null, previous_stock integer not null, current_stock integer not null, actor_id uuid references auth.users, created_at timestamptz not null default now());
create table public.price_history (id bigint generated always as identity primary key, product_id uuid references public.products on delete set null, old_price numeric(12,2), new_price numeric(12,2) not null, created_at timestamptz not null default now());
create table public.image_templates (id uuid primary key default gen_random_uuid(), name text not null, config jsonb not null, updated_at timestamptz not null default now());
create table public.generated_assets (id uuid primary key default gen_random_uuid(), product_id uuid references public.products on delete set null, asset_id uuid references public.media_assets, template_id uuid references public.image_templates, created_at timestamptz not null default now());
create table public.site_settings (id boolean primary key default true check(id), draft jsonb not null default '{}', published jsonb not null default '{}', updated_at timestamptz not null default now());
insert into public.site_settings(id,draft,published) values(true,'{"name":"NextSV","headline":"Encuentra tu próximo favorito","description":"Explora nuestro catálogo y consulta disponibilidad directamente con nosotros."}','{"name":"NextSV","headline":"Encuentra tu próximo favorito","description":"Explora nuestro catálogo y consulta disponibilidad directamente con nosotros."}');
create table public.content_pages (id uuid primary key default gen_random_uuid(), slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), title text not null, body text not null default '', published_body text, status text not null default 'draft' check(status in ('draft','published')), legal_draft boolean not null default true, updated_at timestamptz not null default now());
create table public.audit_logs (id bigint generated always as identity primary key, actor_id uuid references auth.users, entity text not null, entity_id text, operation text not null, changed_keys text[], created_at timestamptz not null default now());
create table public.contact_requests (id uuid primary key default gen_random_uuid(), product_id uuid references public.products on delete set null, name text not null, contact text not null, message text not null, status text not null default 'new' check(status in ('new','contacted','closed')), created_at timestamptz not null default now());
create table public.saved_filters (id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users, name text not null, filters jsonb not null);
create table public.notifications (id uuid primary key default gen_random_uuid(), message text not null, read_at timestamptz, created_at timestamptz not null default now());
create table private.rate_limits (key text primary key, hits integer not null, window_start timestamptz not null);

create function public.product_visible(p public.products) returns boolean language sql stable set search_path='' as $$ select p.deleted_at is null and (p.status='published' or (p.status='scheduled' and p.publish_at<=now())) $$;
create function public.can_read_product(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.products p where p.id=p_id and (public.product_visible(p) or public.is_staff())) $$;

do $$ declare t text; begin
 foreach t in array array['roles','permissions','profiles','categories','products','product_categories','product_variants','media_assets','product_images','custom_field_definitions','product_field_values','inventory_movements','price_history','image_templates','generated_assets','site_settings','content_pages','audit_logs','contact_requests','saved_filters','notifications'] loop
 execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy roles_read on public.roles for select to authenticated using(public.is_staff());
create policy permissions_read on public.permissions for select to authenticated using(public.is_staff());
create policy catalog_read on public.products for select using(public.product_visible(products) or public.is_staff());
create policy categories_read on public.categories for select using(active or public.is_staff());
create policy fields_read on public.custom_field_definitions for select using(is_public or public.is_staff());
create policy values_read on public.product_field_values for select using(public.can_read_product(product_id) and exists(select 1 from public.custom_field_definitions f where f.id=field_id and (f.is_public or public.is_staff())));
create policy media_read on public.media_assets for select using(public.is_staff() or exists(select 1 from public.product_images i where i.asset_id=media_assets.id and public.can_read_product(i.product_id)));
create policy images_read on public.product_images for select using(public.can_read_product(product_id));
create policy variants_read on public.product_variants for select using(public.can_read_product(product_id));
create policy product_categories_read on public.product_categories for select using(public.can_read_product(product_id));
create policy pages_read on public.content_pages for select using(public.is_staff());
create policy settings_read on public.site_settings for select using(public.is_staff());
-- Public RPCs expose only published columns, never the CMS draft.
create function public.public_settings() returns jsonb language sql stable security definer set search_path='' as $$select published from public.site_settings where id=true$$;
create function public.public_pages() returns table(slug text,title text,body text,updated_at timestamptz) language sql stable security definer set search_path='' as $$select slug,title,published_body,updated_at from public.content_pages where status='published' and not legal_draft$$;

do $$ declare t text; perm text; begin
 foreach t in array array['products','categories','product_categories','product_variants','product_images','custom_field_definitions','product_field_values','media_assets','image_templates','generated_assets','content_pages','site_settings','contact_requests','notifications'] loop
 perm := case when t in ('content_pages') then 'content.write' when t='site_settings' then 'settings.write' when t in ('media_assets','image_templates','generated_assets') then 'media.write' else 'catalog.write' end;
 execute format('create policy staff_insert on public.%I for insert to authenticated with check(public.has_permission(%L))',t,perm);
 execute format('create policy staff_update on public.%I for update to authenticated using(public.has_permission(%L)) with check(public.has_permission(%L))',t,perm,perm);
 if t not in ('products','media_assets') then execute format('create policy staff_delete on public.%I for delete to authenticated using(public.has_permission(%L))',t,perm); end if;
 if t in ('image_templates','generated_assets','contact_requests','notifications') then execute format('create policy staff_read on public.%I for select to authenticated using(public.is_staff())',t); end if;
 end loop;
 foreach t in array array['inventory_movements','price_history','audit_logs'] loop execute format('create policy reports_read on public.%I for select to authenticated using(public.has_permission(''reports.read''))',t); end loop;
end $$;
create policy filters_own on public.saved_filters for all to authenticated using(owner_id=auth.uid() and public.is_staff()) with check(owner_id=auth.uid() and public.is_staff());

create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.audit_logs(actor_id,entity,entity_id,operation,changed_keys) values(auth.uid(),tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id'),tg_op, array(select key from jsonb_each(coalesce(to_jsonb(new),'{}')) where value is distinct from coalesce(to_jsonb(old),'{}')->key));
 return coalesce(new,old);
end $$;
do $$ declare t text; begin foreach t in array array['products','product_variants','product_images','product_field_values','categories','custom_field_definitions','site_settings','content_pages','profiles','contact_requests'] loop execute format('create trigger audit after insert or update or delete on public.%I for each row execute function private.audit_change()',t); end loop; end $$;

create function private.product_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' then
 new.updated_at=now(); new.version=old.version+1;
 if new.stock<>old.stock then insert into public.inventory_movements(product_id,delta,previous_stock,current_stock,actor_id) values(new.id,new.stock-old.stock,old.stock,new.stock,auth.uid()); end if;
 if new.price<>old.price then insert into public.price_history(product_id,old_price,new_price) values(new.id,old.price,new.price); end if;
 else
 insert into public.price_history(product_id,old_price,new_price) values(new.id,null,new.price);
 end if;
 return new;
end $$;
-- History insert runs after insertion because of foreign keys.
create trigger product_history before update on public.products for each row execute function private.product_change();

create function public.consume_rate_limit(p_action text) returns boolean language plpgsql security definer set search_path='' as $$
declare h integer; k text; begin
 if not public.is_staff() then return false; end if;
 k=auth.uid()::text||':'||left(p_action,40);
 insert into private.rate_limits(key,hits,window_start) values(k,1,now()) on conflict(key) do update set hits=case when private.rate_limits.window_start<now()-interval '1 minute' then 1 else private.rate_limits.hits+1 end, window_start=case when private.rate_limits.window_start<now()-interval '1 minute' then now() else private.rate_limits.window_start end returning hits into h;
 return h<=120;
end $$;

-- A single transaction saves the product and its dependent rows. A version mismatch
-- raises an error instead of silently overwriting another administrator's edits.
create function public.save_product(payload jsonb, expected_version integer default null) returns uuid language plpgsql security invoker set search_path='' as $$
declare pid uuid; oldv integer; rowdata public.products; item jsonb; begin
 if not public.has_permission('catalog.write') then raise exception 'Forbidden' using errcode='42501'; end if;
 pid=coalesce((payload->>'id')::uuid,gen_random_uuid());
 select version into oldv from public.products where id=pid for update;
 if oldv is not null and (expected_version is null or oldv<>expected_version) then raise exception 'VERSION_CONFLICT'; end if;
 rowdata=jsonb_populate_record(null::public.products,payload);
 insert into public.products(id,sku,slug,name,description,price,sale_price,sale_starts_at,sale_ends_at,status,publish_at,stock,low_stock_threshold,brand,material,dimensions,warranty,delivery,badge,featured)
 values(pid,rowdata.sku,rowdata.slug,rowdata.name,coalesce(rowdata.description,''),rowdata.price,rowdata.sale_price,rowdata.sale_starts_at,rowdata.sale_ends_at,coalesce(rowdata.status,'draft'),rowdata.publish_at,coalesce(rowdata.stock,0),coalesce(rowdata.low_stock_threshold,3),rowdata.brand,rowdata.material,rowdata.dimensions,rowdata.warranty,rowdata.delivery,rowdata.badge,coalesce(rowdata.featured,false))
 on conflict(id) do update set sku=excluded.sku,slug=excluded.slug,name=excluded.name,description=excluded.description,price=excluded.price,sale_price=excluded.sale_price,sale_starts_at=excluded.sale_starts_at,sale_ends_at=excluded.sale_ends_at,status=excluded.status,publish_at=excluded.publish_at,stock=excluded.stock,low_stock_threshold=excluded.low_stock_threshold,brand=excluded.brand,material=excluded.material,dimensions=excluded.dimensions,warranty=excluded.warranty,delivery=excluded.delivery,badge=excluded.badge,featured=excluded.featured;
 delete from public.product_categories where product_id=pid;
 insert into public.product_categories select pid,value::uuid from jsonb_array_elements_text(coalesce(payload->'category_ids','[]'));
 delete from public.product_variants where product_id=pid;
 for item in select * from jsonb_array_elements(coalesce(payload->'variants','[]')) loop
 insert into public.product_variants(product_id,sku,color,size,price,stock) values(pid,item->>'sku',nullif(item->>'color',''),nullif(item->>'size',''),(item->>'price')::numeric,coalesce((item->>'stock')::integer,0)); end loop;
 delete from public.product_field_values where product_id=pid;
 for item in select * from jsonb_array_elements(coalesce(payload->'field_values','[]')) loop
 insert into public.product_field_values(product_id,field_id,value) values(pid,(item->>'field_id')::uuid,item->'value'); end loop;
 return pid;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('catalog','catalog',false,5242880,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do nothing;
create policy storage_staff_insert on storage.objects for insert to authenticated with check(bucket_id='catalog' and public.has_permission('media.write') and (storage.foldername(name))[1]=auth.uid()::text);
create policy storage_staff_read on storage.objects for select to authenticated using(bucket_id='catalog' and public.is_staff());
create policy storage_public_read on storage.objects for select to anon,authenticated using(bucket_id='catalog' and exists(select 1 from public.media_assets m join public.product_images i on i.asset_id=m.id join public.products p on p.id=i.product_id where m.path=storage.objects.name and public.product_visible(p)));
create policy storage_staff_delete on storage.objects for delete to authenticated using(bucket_id='catalog' and public.has_permission('media.write'));

-- Tight function grants, including PostgreSQL's default PUBLIC EXECUTE grant.
revoke all on function public.save_product(jsonb,integer) from public,anon;
grant execute on function public.save_product(jsonb,integer) to authenticated;
revoke all on function public.consume_rate_limit(text) from public,anon;
grant execute on function public.consume_rate_limit(text) to authenticated;
grant select on all tables in schema public to anon,authenticated;
grant insert,update,delete on public.products,public.product_variants,public.product_categories,public.product_images,public.product_field_values,public.categories,public.custom_field_definitions,public.media_assets,public.image_templates,public.generated_assets,public.site_settings,public.content_pages,public.contact_requests,public.saved_filters,public.notifications to authenticated;
grant usage,select on all sequences in schema public to authenticated;
commit;
