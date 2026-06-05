import { supabase } from './supabase';

// Cuenta UNA visita por entrada a la web (por sesión de navegador). Se llama al
// cargar la app, no en cada cambio de ruta: navegar por la web no suma visitas.
//
// El flag en sessionStorage se fija de forma SÍNCRONA antes del await, de modo
// que ni el doble montaje de StrictMode (en desarrollo) ni una recarga del
// service worker provocan visitas duplicadas. La escritura va por la RPC
// `record_page_view` (security definer): el visitante no puede leer el contador.
const SESSION_FLAG = 'pt_visit_recorded';

export async function recordVisitOncePerSession() {
  try {
    if (sessionStorage.getItem(SESSION_FLAG)) return;
    sessionStorage.setItem(SESSION_FLAG, '1');
    await supabase.rpc('record_page_view', { p_path: window.location.pathname });
  } catch {
    // El tracking nunca debe romper la navegación: fallar en silencio.
  }
}
