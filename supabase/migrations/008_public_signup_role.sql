-- Endurece handle_new_user para abrir el registro público con seguridad.
--
-- Hasta ahora el alta solo ocurría por invitación del admin (Edge Function), que
-- pasaba role='member' en los metadatos. Al abrir `supabase.auth.signUp()` público,
-- un usuario podría enviar `options.data.role = 'admin'` y, como el trigger leía el
-- rol de los metadatos, auto-escalarse a admin.
--
-- Solución: el rol de CUALQUIER alta nueva es SIEMPRE 'member', ignorando lo que
-- mande el cliente. Los admin se crean promocionando a un member existente desde
-- el panel (UPDATE public.profiles.role), nunca en el alta. `active` sigue por
-- defecto en true => el nuevo miembro queda activo al instante.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'phone',
    'member'   -- nunca se confía el rol al cliente
  )
  on conflict (id) do nothing;
  return new;
end $$;
