import { Link } from 'react-router-dom';
import { Mountain, Mail, Phone } from 'lucide-react';

const IconInstagram = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
const IconFacebook = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

export default function Footer() {
  return (
    <footer className="bg-primary-900 text-white mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 font-bold text-xl mb-3">
              <Mountain className="w-6 h-6 text-primary-300" />
              Palen Tour
            </div>
            <p className="text-primary-200 text-sm leading-relaxed">
              Organizamos viajes y excursiones en grupo para personas que comparten la pasión por la naturaleza y la aventura.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-primary-100">Navegación</h4>
            <ul className="space-y-2 text-sm text-primary-300">
              <li><Link to="/" className="hover:text-white transition-colors">Inicio</Link></li>
              <li><Link to="/viajes" className="hover:text-white transition-colors">Viajes</Link></li>
              <li><Link to="/nosotros" className="hover:text-white transition-colors">Nosotros</Link></li>
              <li><Link to="/contacto" className="hover:text-white transition-colors">Contacto</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-primary-100">Contacto</h4>
            <ul className="space-y-3 text-sm text-primary-300">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                info@palentour.es
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                +34 600 000 000
              </li>
            </ul>
            <div className="flex gap-4 mt-4">
              <a href="#" className="text-primary-300 hover:text-white transition-colors">
                <IconInstagram />
              </a>
              <a href="#" className="text-primary-300 hover:text-white transition-colors">
                <IconFacebook />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-700 mt-10 pt-6 text-center text-xs text-primary-400">
          © {new Date().getFullYear()} Palen Tour. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
