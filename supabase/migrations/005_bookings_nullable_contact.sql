-- bookings: contacto desnormalizado se vuelve opcional.
--
-- Originalmente name/email/phone eran obligatorios porque bookings se llenaba desde
-- un formulario público de invitado. Ahora la fuente de verdad es profiles (via user_id),
-- así que estos campos quedan como snapshot informativo del momento de inscripción.
-- Algunos miembros pueden no tener phone en profile, por lo que NOT NULL rompía la RPC.

alter table public.bookings alter column phone drop not null;
alter table public.bookings alter column name  drop not null;
alter table public.bookings alter column email drop not null;
