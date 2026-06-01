# Edge Function: admin-users

Acciones administrativas que requieren `service_role`.

## Deploy

### Opción A — Supabase CLI (recomendado)

```powershell
# Una vez:
npm i -g supabase
supabase login
supabase link --project-ref TU_PROJECT_REF

# Deploy:
supabase functions deploy admin-users
```

`TU_PROJECT_REF` lo ves en la URL del dashboard: `app.supabase.com/project/<ref>`.

### Opción B — Dashboard (sin CLI)

1. Dashboard → **Edge Functions** → **Create function**.
2. Nombre: `admin-users`.
3. Pega el contenido de `index.ts` en el editor.
4. Click **Deploy**.

## Variables (Secrets)

Solo necesitas configurar **una** manualmente:

- `SITE_URL` → URL pública de la app (ej. `http://localhost:5174` en dev, `https://palentour.com` en prod).

Las demás (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) las inyecta Supabase automáticamente.

Configurar en: **Edge Functions → admin-users → Settings → Secrets**.

## Config Auth (importante)

En **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:5174` (dev) o tu dominio prod.
- **Redirect URLs**: añade `http://localhost:5174/reset-password` y la versión prod.

Sin esto, los emails de invitación/recovery redirigen a un URL que falla.

## Operaciones

| action          | body                                       | qué hace |
|-----------------|--------------------------------------------|----------|
| `invite`        | `{ email, full_name, phone? }`             | Envía email de invitación con magic link. El trigger `handle_new_user` crea el profile con `role='member'`. |
| `reset_password`| `{ user_id }`                              | Envía email de recovery al user. |
| `set_active`    | `{ user_id, active: boolean }`             | Activa/desactiva. Si desactiva, revoca sesiones. |
| `delete`        | `{ user_id }`                              | Borra de `auth.users` (cascade a profiles/bookings). |

Toda la lógica verifica que el caller es admin activo antes de actuar.

## Test rápido

```powershell
$TOKEN = "tu_jwt_de_admin"
curl -X POST "https://<ref>.supabase.co/functions/v1/admin-users" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"action":"invite","email":"test@ejemplo.com","full_name":"Test User"}'
```
