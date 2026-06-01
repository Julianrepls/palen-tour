import { useState } from 'react';
import { Mail, Phone, CheckCircle } from 'lucide-react';

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

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Contacto</h1>
        <p className="text-gray-500 text-lg">¿Tienes dudas? Escríbenos y te contestamos en menos de 24h</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Form */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8">
          {sent ? (
            <div className="text-center py-8">
              <CheckCircle className="w-14 h-14 text-primary-500 mx-auto mb-4" />
              <h3 className="font-bold text-gray-900 text-xl mb-2">¡Mensaje enviado!</h3>
              <p className="text-gray-500">Te responderemos pronto. ¡Gracias por contactarnos!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="font-bold text-xl text-gray-900 mb-1">Envíanos un mensaje</h2>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre *</label>
                <input
                  type="text" name="name" value={form.name} onChange={handleChange} required
                  placeholder="Tu nombre"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                <input
                  type="email" name="email" value={form.email} onChange={handleChange} required
                  placeholder="tu@email.com"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mensaje *</label>
                <textarea
                  name="message" value={form.message} onChange={handleChange} required
                  placeholder="¿En qué podemos ayudarte?"
                  rows={5}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary-600 text-white font-bold py-3 rounded-full hover:bg-primary-700 transition-colors"
              >
                Enviar mensaje
              </button>
            </form>
          )}
        </div>

        {/* Info */}
        <div className="space-y-8">
          <div>
            <h2 className="font-bold text-xl text-gray-900 mb-4">Información de contacto</h2>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Email</div>
                  <div className="font-semibold">info@palentour.es</div>
                </div>
              </li>
              <li className="flex items-center gap-3 text-gray-700">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-primary-700" />
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Teléfono / WhatsApp</div>
                  <div className="font-semibold">+34 600 000 000</div>
                </div>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-bold text-gray-900 mb-3">Síguenos en redes</h3>
            <div className="flex gap-4">
              <a href="#" className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 hover:bg-primary-200 transition-colors">
                <IconInstagram />
              </a>
              <a href="#" className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 hover:bg-primary-200 transition-colors">
                <IconFacebook />
              </a>
            </div>
          </div>

          <div className="bg-primary-50 rounded-2xl p-6">
            <h3 className="font-bold text-gray-900 mb-2">Horario de atención</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex justify-between">
                <span>Lunes – Viernes</span>
                <span className="font-medium">09:00 – 19:00</span>
              </li>
              <li className="flex justify-between">
                <span>Sábados</span>
                <span className="font-medium">10:00 – 14:00</span>
              </li>
              <li className="flex justify-between">
                <span>Domingos</span>
                <span className="font-medium text-gray-400">Cerrado</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
