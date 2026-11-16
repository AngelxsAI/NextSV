begin;
create function public.is_field_asset(asset uuid) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.product_field_values v join public.custom_field_definitions f on f.id=v.field_id join public.products p on p.id=v.product_id where f.is_public and f.type in ('image','file') and v.value=to_jsonb(asset::text) and public.product_visible(p))
$$;
create policy field_media_read on public.media_assets for select using(public.is_field_asset(id));
create policy field_storage_read on storage.objects for select using(bucket_id='catalog' and exists(select 1 from public.media_assets m where m.path=storage.objects.name and public.is_field_asset(m.id)));
create function private.initial_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.price_history(product_id,old_price,new_price) values(new.id,null,new.price);
 if new.stock>0 then insert into public.inventory_movements(product_id,delta,previous_stock,current_stock,actor_id) values(new.id,new.stock,0,new.stock,auth.uid()); end if;
 return new;
end $$;
create trigger initial_history after insert on public.products for each row execute function private.initial_history();
commit;
