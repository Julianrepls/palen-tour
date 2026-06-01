# Migraciones Supabase — Fase 1

## Orden de aplicación

Ejecutar **en este orden** desde el SQL Editor del dashboard de Supabase, o con `supabase db push` si tienes la CLI:

1. `001_profiles.sql` — Tabla `profiles`, roles, helper `is_admin()`, trigger `handle_new_user`, migración de `admins`.
2. `002_bookings_user_fk.sql` — Liga `bookings` a `profiles`, unique index anti-duplicado.
3. `003_rls_policies.sql` — RLS en `profiles`, `trips`, `bookings`.
4. `004_trip_availability.sql` — Vista `trips_with_availability` y RPC `register_to_trip`.

## Antes de aplicar

- **Backup** de la base (Supabase Dashboard → Database → Backups).
- Verifica que la tabla `admins` existe y tiene columna `user_id`. Si no, comenta el bloque `do $$ ... admins ...` en `001`.
- Confirma que `bookings` tiene columnas `trip_id, name, email, phone, people, notes, status, registered_at`.

## Qué pasa con los datos existentes

- Las `bookings` actuales NO tienen `user_id` (eran de invitado). Quedan marcadas como `cancelado` para no romper el FK ni la unique constraint. Si necesitas conservarlas activas, haz el matching `bookings.email → auth.users.email` manualmente antes de correr `002`.
- La tabla `admins` se conserva (no se borra) por compatibilidad con el código actual de `Admin.jsx`. La eliminaremos en Fase 2 cuando el frontend lea de `profiles.role`.

## Verificación post-migración

```sql
-- Debe devolver tu usuario admin
select id, email, role, active from public.profiles where role = 'admin';

-- Debe ser true para tu sesión admin
select public.is_admin();

-- Vista con disponibilidad
select id, title, spots, enrolled, spots_remaining from public.trips_with_availability;
```

## Rollback (si algo va mal)

```sql
drop view if exists public.trips_with_availability;
drop function if exists public.register_to_trip(uuid, int, text);
drop function if exists public.is_admin();
drop function if exists public.handle_new_user();
drop trigger if exists on_auth_user_created on auth.users;
alter table public.bookings drop column if exists user_id;
drop table if exists public.profiles cascade;
```
