import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

/**
 * Envuelve rutas que requieren autenticación.
 *
 * Props:
 *   - requireRole: 'admin' | 'member' | undefined (cualquier autenticado)
 *
 * Comportamiento:
 *   - status loading: muestra splash mínimo.
 *   - no auth: redirige a /login conservando la ruta original en state.
 *   - rol insuficiente: muestra mensaje de acceso denegado (no redirige para
 *     no esconder el motivo al usuario).
 */
export function ProtectedRoute({ children, requireRole }) {
  const { status, isAuthenticated, isAdmin, isMember, profile } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <Splash />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Hay sesión pero el profile aún no se ha cargado. Esperamos antes de decidir
  // sobre el rol — si no, parpadearíamos "Acceso denegado" mientras carga.
  if (requireRole && !profile) {
    return <Splash />;
  }

  if (profile && profile.active === false) {
    return <AccessDenied reason="Tu cuenta está desactivada." />;
  }

  if (requireRole === 'admin' && !isAdmin) {
    return <AccessDenied reason="Necesitas permisos de administrador." />;
  }
  if (requireRole === 'member' && !isMember && !isAdmin) {
    return <AccessDenied reason="Necesitas una cuenta de miembro." />;
  }

  return children;
}

function Splash() {
  return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
      Cargando...
    </div>
  );
}

function AccessDenied({ reason }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso denegado</h2>
        <p className="text-sm text-gray-500">{reason}</p>
      </div>
    </div>
  );
}
