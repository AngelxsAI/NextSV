begin;
-- Validate custom values even when an administrator calls PostgREST directly.
create function private.validate_field_value() returns trigger language plpgsql set search_path='' as $$
declare f public.custom_field_definitions; s text; n numeric; begin
 select * into strict f from public.custom_field_definitions where id=new.field_id;
 if cardinality(f.category_ids)>0 and not exists(select 1 from public.product_categories c where c.product_id=new.product_id and c.category_id=any(f.category_ids)) then raise exception 'Field does not apply to category'; end if;
 if new.value='null'::jsonb or new.value='""'::jsonb then return new; end if;
 s=new.value#>>'{}';
 if f.type in ('number','price','percentage') then
 if jsonb_typeof(new.value)<>'number' then raise exception 'Expected number'; end if; n=s::numeric;
 if (f.type in ('price','percentage') and n<0) or (f.type='percentage' and n>100) or (f.rules?'min' and n<(f.rules->>'min')::numeric) or (f.rules?'max' and n>(f.rules->>'max')::numeric) then raise exception 'Number out of range'; end if;
 elsif f.type='boolean' then if jsonb_typeof(new.value)<>'boolean' then raise exception 'Expected boolean'; end if;
 elsif f.type in ('list','multiselect') then
 if jsonb_typeof(new.value)<>'array' or jsonb_array_length(new.value)>100 then raise exception 'Expected list'; end if;
 if exists(select 1 from jsonb_array_elements(new.value) v where jsonb_typeof(v)<>'string' or (v#>>'{}') ~ '[<>]' or length(v#>>'{}')>300 or (f.type='multiselect' and not ((v#>>'{}')=any(f.options)))) then raise exception 'Invalid list value'; end if;
 else
 if jsonb_typeof(new.value)<>'string' or s ~ '[<>]' or length(s)>coalesce((f.rules->>'maxLength')::int,case when f.type='textarea' then 12000 else 500 end) then raise exception 'Invalid text'; end if;
 if f.type='url' and s !~ '^https?://' then raise exception 'Invalid URL'; end if;
 if f.type='date' then perform s::date; if s !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Invalid date'; end if; end if;
 if f.type='select' and not(s=any(f.options)) then raise exception 'Invalid selection'; end if;
 if f.type in ('image','file') and not exists(select 1 from public.media_assets where id=s::uuid) then raise exception 'Unknown media'; end if;
 end if;
 return new;
end $$;
create trigger validate_value before insert or update on public.product_field_values for each row execute function private.validate_field_value();
create function private.required_fields() returns trigger language plpgsql set search_path='' as $$
declare pid uuid; begin
 if tg_table_name='products' then pid=coalesce(new.id,old.id);else pid=coalesce(new.product_id,old.product_id);end if;
 if exists(select 1 from public.products where id=pid and status in ('published','scheduled') and deleted_at is null) and exists(
 select 1 from public.custom_field_definitions f where f.required and (cardinality(f.category_ids)=0 or exists(select 1 from public.product_categories c where c.product_id=pid and c.category_id=any(f.category_ids))) and not exists(select 1 from public.product_field_values v where v.product_id=pid and v.field_id=f.id and v.value not in ('null'::jsonb,'""'::jsonb,'[]'::jsonb))
 ) then raise exception 'Required field missing'; end if;return null;
end $$;
create constraint trigger required_product after insert or update on public.products deferrable initially deferred for each row execute function private.required_fields();
create constraint trigger required_value after insert or update or delete on public.product_field_values deferrable initially deferred for each row execute function private.required_fields();
create constraint trigger required_category after insert or update or delete on public.product_categories deferrable initially deferred for each row execute function private.required_fields();

-- Only explicitly selected, published branding assets become publicly readable.
create function public.is_brand_asset(asset uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.site_settings where published->>'logo_asset_id'=asset::text or published->>'banner_asset_id'=asset::text)$$;
create policy brand_media_read on public.media_assets for select using(public.is_brand_asset(id));
create policy brand_storage_read on storage.objects for select using(bucket_id='catalog' and exists(select 1 from public.media_assets m where m.path=storage.objects.name and public.is_brand_asset(m.id)));
alter table public.products add constraint product_plain_text check(name !~ '[<>]' and description !~ '[<>]' and coalesce(brand,'') !~ '[<>]' and coalesce(material,'') !~ '[<>]' and coalesce(warranty,'') !~ '[<>]');
alter table public.content_pages add constraint page_plain_text check(body !~ '[<>]' and title !~ '[<>]');
commit;
