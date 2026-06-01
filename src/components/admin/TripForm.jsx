import { useEffect, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { categories } from '../../data/trips';
import { supabase } from '../../lib/supabase';

const empty = {
  title: '',
  description: '',
  date: '',
  return_date: '',
  price: '',
  spots: '',
  difficulty: 'Media',
  duration: '',
  location: '',
  image: '',
  category: 'montaña',
  included: '',
};

const categoryOptions = categories.filter((c) => c.id !== 'todos');

export default function TripForm({ trip, onClose, onSaved }) {
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isEdit = !!trip;

  useEffect(() => {
    if (trip) {
      setForm({
        title: trip.title ?? '',
        description: trip.description ?? '',
        date: trip.date ?? '',
        return_date: trip.returnDate ?? '',
        price: trip.price ?? '',
        spots: trip.spots ?? '',
        difficulty: trip.difficulty ?? 'Media',
        duration: trip.duration ?? '',
        location: trip.location ?? '',
        image: trip.image ?? '',
        category: trip.category ?? 'montaña',
        included: Array.isArray(trip.included) ? trip.included.join('\n') : '',
      });
    } else {
      setForm(empty);
    }
  }, [trip]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validación mínima
    if (!form.title || !form.description || !form.date || !form.return_date ||
        !form.duration || !form.location || !form.category) {
      setError('Completa todos los campos obligatorios.');
      return;
    }
    if (new Date(form.return_date) < new Date(form.date)) {
      setError('La fecha de regreso no puede ser anterior a la de salida.');
      return;
    }
    const price = Number(form.price);
    const spots = Number(form.spots);
    if (Number.isNaN(price) || price < 0) return setError('Precio inválido.');
    if (!Number.isInteger(spots) || spots <= 0) return setError('Plazas totales debe ser un entero mayor que 0.');

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      return_date: form.return_date,
      price,
      spots,
      difficulty: form.difficulty,
      duration: form.duration.trim(),
      location: form.location.trim(),
      image: form.image.trim() || null,
      category: form.category,
      included: form.included
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    setSaving(true);
    let dbError;
    if (isEdit) {
      ({ error: dbError } = await supabase.from('trips').update(payload).eq('id', trip.id));
    } else {
      ({ error: dbError } = await supabase.from('trips').insert(payload));
    }
    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-extrabold text-gray-900">
            {isEdit ? 'Editar viaje' : 'Nuevo viaje'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 rounded-xl p-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <Field label="Título *">
            <input
              name="title" value={form.title} onChange={handleChange} required
              className="inp"
              placeholder="Sierra Nevada: Ruta de los Tres Mil"
            />
          </Field>

          <Field label="Descripción *">
            <textarea
              name="description" value={form.description} onChange={handleChange} required
              rows={3} className="inp resize-none"
              placeholder="Breve descripción del viaje..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha salida *">
              <input type="date" name="date" value={form.date} onChange={handleChange} required className="inp" />
            </Field>
            <Field label="Fecha regreso *">
              <input type="date" name="return_date" value={form.return_date} onChange={handleChange} required className="inp" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Precio (€) *">
              <input type="number" min="0" step="0.01" name="price" value={form.price} onChange={handleChange} required className="inp" placeholder="189" />
            </Field>
            <Field label="Plazas totales *" hint="Las plazas libres se calculan automáticamente según las inscripciones.">
              <input type="number" min="1" name="spots" value={form.spots} onChange={handleChange} required className="inp" placeholder="20" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Dificultad *">
              <select name="difficulty" value={form.difficulty} onChange={handleChange} className="inp">
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            </Field>
            <Field label="Categoría *">
              <select name="category" value={form.category} onChange={handleChange} className="inp">
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Duración *">
              <input name="duration" value={form.duration} onChange={handleChange} required className="inp" placeholder="3 días" />
            </Field>
            <Field label="Destino *">
              <input name="location" value={form.location} onChange={handleChange} required className="inp" placeholder="Granada, España" />
            </Field>
          </div>

          <Field label="Imagen (URL)" hint="Pega un enlace a la imagen. Recomendado Unsplash.">
            <input name="image" value={form.image} onChange={handleChange} className="inp" placeholder="https://images.unsplash.com/..." />
          </Field>

          {form.image && (
            <img src={form.image} alt="preview" className="w-full h-40 object-cover rounded-xl border border-gray-100" />
          )}

          <Field label="¿Qué incluye?" hint="Un elemento por línea">
            <textarea
              name="included" value={form.included} onChange={handleChange}
              rows={4} className="inp resize-none"
              placeholder={'Transporte en autobús\nAlojamiento 2 noches\nGuía certificado'}
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-full text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-full text-sm font-bold bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear viaje'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .inp {
          width: 100%;
          border: 1px solid rgb(229 231 235);
          border-radius: 0.75rem;
          padding: 0.625rem 1rem;
          font-size: 0.875rem;
          outline: none;
        }
        .inp:focus {
          box-shadow: 0 0 0 2px rgb(99 102 241 / 0.4);
          border-color: transparent;
        }
      `}</style>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
