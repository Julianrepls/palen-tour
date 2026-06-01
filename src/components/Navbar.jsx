import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Mountain, User, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import { useAuth } from '../auth/useAuth';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, profile, signOut } = useAuth();

  const links = [
    { to: '/', label: 'Inicio' },
    { to: '/viajes', label: 'Viajes' },
    { to: '/nosotros', label: 'Nosotros' },
    { to: '/contacto', label: 'Contacto' },
  ];

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const accountTo = isAdmin ? '/admin' : '/mi-cuenta';
  const firstName = profile?.full_name?.split(' ')[0] || profile?.email || 'Mi cuenta';

  // Cerrar el dropdown al hacer click fuera o pulsar Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  // Cerrar el dropdown al navegar
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const handleLogout = async () => {
    setMenuOpen(false);
    setOpen(false);
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-primary-700">
            <Mountain className="w-7 h-7 text-primary-600" />
            Palen Tour
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`text-sm font-medium transition-colors ${
                  isActive(l.to)
                    ? 'text-primary-700 border-b-2 border-primary-600 pb-0.5'
                    : 'text-gray-600 hover:text-primary-700'
                }`}
              >
                {l.label}
              </Link>
            ))}

            {isAuthenticated ? (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2 bg-primary-600 text-white text-sm font-semibold pl-4 pr-3 py-2 rounded-full hover:bg-primary-700 transition-colors"
                >
                  <User className="w-4 h-4" />
                  {firstName}
                  <ChevronDown className={`w-4 h-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-gray-100 py-2 z-50"
                  >
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {profile?.full_name || 'Miembro'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
                    </div>
                    <Link
                      to={accountTo}
                      role="menuitem"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      {isAdmin ? 'Panel admin' : 'Mi cuenta'}
                    </Link>
                    {isAdmin && (
                      <Link
                        to="/mi-cuenta"
                        role="menuitem"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <User className="w-4 h-4" />
                        Mi cuenta
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      role="menuitem"
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary-700 transition-colors"
              >
                <User className="w-4 h-4" />
                Entrar
              </Link>
            )}
          </div>

          <button
            className="md:hidden p-2 text-gray-600"
            onClick={() => setOpen(!open)}
            aria-label="Menú"
          >
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white border-t px-4 pb-4 space-y-3">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className={`block py-2 text-sm font-medium ${
                isActive(l.to) ? 'text-primary-700' : 'text-gray-600'
              }`}
            >
              {l.label}
            </Link>
          ))}

          {isAuthenticated ? (
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="px-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {profile?.full_name || 'Miembro'}
                </p>
                <p className="text-xs text-gray-400 truncate">{profile?.email}</p>
              </div>
              <Link
                to={accountTo}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 py-2 text-sm font-medium text-gray-700"
              >
                <LayoutDashboard className="w-4 h-4" />
                {isAdmin ? 'Panel admin' : 'Mi cuenta'}
              </Link>
              {isAdmin && (
                <Link
                  to="/mi-cuenta"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 py-2 text-sm font-medium text-gray-700"
                >
                  <User className="w-4 h-4" />
                  Mi cuenta
                </Link>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 py-2 text-sm font-medium text-red-600"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="block bg-primary-600 text-white text-center text-sm font-semibold px-4 py-2 rounded-full hover:bg-primary-700 transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}
