-- ============================================
-- BAJÁ APP — Ajustes para publicar en Google Play y App Store
-- ============================================
-- Ejecutar UNA vez en el SQL Editor de Supabase (después de schema.sql y policies.sql).

-- 1) Eliminación de cuenta desde la app (requisito de Google Play y App Store).
--    Borra al usuario de auth.users; todas las tablas del schema tienen
--    "on delete cascade", así que se eliminan perfil, favoritos, viajes, avisos,
--    preferencias y enlaces compartidos.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'No autenticado';
  end if;
  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- 2) Seguridad: la política "shared_trips_select_by_token" permitía que cualquiera
--    leyera TODOS los viajes compartidos. Se quita; cuando se implemente compartir
--    en vivo se hará con una función que reciba el token y devuelva solo ese viaje.
drop policy if exists "shared_trips_select_by_token" on public.shared_trips;
