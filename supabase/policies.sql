-- ============================================
-- BAJÁ APP — Row Level Security Policies
-- ============================================
-- Ejecutar DESPUÉS de schema.sql
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dnd_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bus_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES
-- ============================================
-- Usuarios solo ven/editan su propio perfil
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- FAVORITES
-- ============================================
CREATE POLICY "favorites_select_own"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "favorites_insert_own"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_update_own"
  ON public.favorites FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "favorites_delete_own"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- ALERT CONFIGS
-- ============================================
CREATE POLICY "alert_configs_select_own"
  ON public.alert_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "alert_configs_update_own"
  ON public.alert_configs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIPS
-- ============================================
CREATE POLICY "trips_select_own"
  ON public.trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "trips_insert_own"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trips_update_own"
  ON public.trips FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- TRIP ALERTS
-- ============================================
CREATE POLICY "trip_alerts_select_own"
  ON public.trip_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_alerts.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "trip_alerts_insert_own"
  ON public.trip_alerts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = trip_alerts.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- ============================================
-- SHARED TRIPS
-- ============================================
-- El dueño del viaje puede ver/crear/editar
CREATE POLICY "shared_trips_select_own"
  ON public.shared_trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "shared_trips_insert_own"
  ON public.shared_trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "shared_trips_update_own"
  ON public.shared_trips FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Cualquiera con el token puede ver la ubicación compartida (público, sin auth)
CREATE POLICY "shared_trips_select_by_token"
  ON public.shared_trips FOR SELECT
  USING (true); -- Se filtra por share_token en la query

-- ============================================
-- DND SCHEDULES
-- ============================================
CREATE POLICY "dnd_select_own"
  ON public.dnd_schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "dnd_insert_own"
  ON public.dnd_schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dnd_update_own"
  ON public.dnd_schedules FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "dnd_delete_own"
  ON public.dnd_schedules FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- BUS LINES (lectura pública)
-- ============================================
CREATE POLICY "bus_lines_select_all"
  ON public.bus_lines FOR SELECT
  USING (true);

-- ============================================
-- USER BUS LINES
-- ============================================
CREATE POLICY "user_bus_lines_select_own"
  ON public.user_bus_lines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_bus_lines_insert_own"
  ON public.user_bus_lines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_bus_lines_update_own"
  ON public.user_bus_lines FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- LOCATION LOGS
-- ============================================
CREATE POLICY "location_logs_insert_own"
  ON public.location_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = location_logs.trip_id
      AND trips.user_id = auth.uid()
    )
  );

CREATE POLICY "location_logs_select_own"
  ON public.location_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trips
      WHERE trips.id = location_logs.trip_id
      AND trips.user_id = auth.uid()
    )
  );

-- ============================================
-- REALTIME (habilitar para shared_trips)
-- ============================================
-- En Supabase Dashboard: Database → Replication → Activar para shared_trips
-- O ejecutar:
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_trips;
