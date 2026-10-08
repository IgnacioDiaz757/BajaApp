-- ============================================
-- BAJÁ APP — Schema (tablas base)
-- ============================================
-- Ejecutar ANTES de policies.sql
-- ============================================

create extension if not exists pgcrypto;

-- ============================================
-- PROFILES
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  preferred_lang text not null default 'es' check (preferred_lang in ('es', 'en', 'pt')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Crea automáticamente un perfil cuando se registra un usuario nuevo
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- FAVORITES (destinos guardados)
-- ============================================
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  address text not null,
  latitude double precision,
  longitude double precision,
  glyph text,
  tint text,
  created_at timestamptz not null default now()
);

create index favorites_user_id_idx on public.favorites (user_id);

-- ============================================
-- BUS LINES (catálogo público de líneas de colectivo)
-- ============================================
create table public.bus_lines (
  id uuid primary key default gen_random_uuid(),
  number text not null,
  direction text not null,
  city text not null default 'Córdoba',
  created_at timestamptz not null default now(),
  unique (number, direction)
);

-- ============================================
-- USER BUS LINES (líneas favoritas/elegidas por usuario)
-- ============================================
create table public.user_bus_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bus_line_id uuid not null references public.bus_lines (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, bus_line_id)
);

-- ============================================
-- ALERT CONFIGS (preferencias de alertas por usuario)
-- ============================================
create table public.alert_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  two_km boolean not null default true,
  one_km boolean not null default true,
  five_hundred_m boolean not null default true,
  two_hundred_m boolean not null default true,
  vibrate_on_silent boolean not null default true,
  repeat_final_alert boolean not null default false,
  mode text not null default 'distance' check (mode in ('distance', 'time')),
  updated_at timestamptz not null default now()
);

-- ============================================
-- DND SCHEDULES (horarios de no molestar)
-- ============================================
create table public.dnd_schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index dnd_schedules_user_id_idx on public.dnd_schedules (user_id);

-- ============================================
-- TRIPS (viajes)
-- ============================================
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  destination_label text not null,
  destination_address text,
  destination_latitude double precision not null,
  destination_longitude double precision not null,
  bus_line_id uuid references public.bus_lines (id) on delete set null,
  alert_mode text not null default 'distance' check (alert_mode in ('distance', 'time')),
  status text not null default 'active' check (status in ('active', 'arrived', 'missed', 'cancelled')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index trips_user_id_idx on public.trips (user_id);
create index trips_status_idx on public.trips (status);

-- ============================================
-- TRIP ALERTS (avisos disparados durante un viaje)
-- ============================================
create table public.trip_alerts (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  kind text not null check (kind in ('two_km', 'one_km', 'five_hundred_m', 'two_hundred_m', 'arrived', 'missed')),
  distance_meters double precision,
  triggered_at timestamptz not null default now()
);

create index trip_alerts_trip_id_idx on public.trip_alerts (trip_id);

-- ============================================
-- SHARED TRIPS (enlaces de seguimiento en vivo)
-- ============================================
create table public.shared_trips (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  share_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index shared_trips_trip_id_idx on public.shared_trips (trip_id);
create index shared_trips_share_token_idx on public.shared_trips (share_token);

-- ============================================
-- LOCATION LOGS (histórico de posiciones durante un viaje)
-- ============================================
create table public.location_logs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  recorded_at timestamptz not null default now()
);

create index location_logs_trip_id_idx on public.location_logs (trip_id);
