import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, MapPin, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMutation, useQuery } from '@apollo/client/react';
import { gql } from '@apollo/client';
import { REGISTER_MUTATION } from '../graphql/operations';

// ── Helper: leer sede desde el JWT del admin logueado ────────────────────
// El token se guarda en localStorage al hacer login como admin/staff.
// Si el claim `branch` está presente, se usa para pre-asignar la sede.
function getBranchFromToken() {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.branch || payload?.sede || null;
  } catch {
    return null;
  }
}

// Query para obtener sedes disponibles (location-service via Gateway)
const GET_BRANCHES = gql`
  query GetBranches {
    branches {
      id
      name
    }
  }
`;

export default function Register() {
  const detectedBranch = getBranchFromToken();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    // Se pre-rellena con la sede detectada; el admin puede cambiarla si
    // no se pudo detectar automáticamente.
    branch: detectedBranch || '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Cargar sedes disponibles para el <select> de fallback
  const { data: branchesData } = useQuery(GET_BRANCHES, {
    // Solo cargar si no detectamos sede automáticamente
    skip: Boolean(detectedBranch),
    onError: () => { /* silencioso: el campo queda como input libre */ },
  });

  // Si el token cambia mientras está montado (edge case: re-login),
  // actualizamos el campo branch.
  useEffect(() => {
    const branch = getBranchFromToken();
    if (branch) {
      setFormData(prev => ({ ...prev, branch }));
    }
  }, []);

  const [registerUser, { loading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: () => {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    },
    onError: (err) => {
      setError(err.message || 'Error al crear la cuenta. Intenta con otro email.');
    },
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // Pasar `branch` solo si tiene valor (es opcional para clientes externos)
    const variables = { ...formData };
    if (!variables.branch) delete variables.branch;
    registerUser({ variables });
  };

  // ── Render de éxito ────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2">¡Registro Exitoso!</h2>
          <p className="text-slate-500 font-medium">
            Tu cuenta ha sido creada
            {formData.branch ? ` en la sede <strong>${formData.branch}</strong>` : ''}.
            Serás redirigido al login en unos instantes...
          </p>
        </div>
      </div>
    );
  }

  const branches = branchesData?.branches || [];
  const branchIsLocked = Boolean(detectedBranch);

  // ── Render del formulario ──────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 md:p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-brand-50 rounded-full opacity-50 blur-3xl" />

          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-slate-400 hover:text-brand-600 font-bold text-sm mb-8 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Volver al Login
          </button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Crea tu cuenta</h1>
            <p className="text-slate-500 mt-2 font-medium">Únete a la comunidad de RestoHub</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nombre */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
                Nombre Completo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                  <User size={18} />
                </div>
                <input
                  name="name" type="text" required value={formData.name} onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all text-sm"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                  <Mail size={18} />
                </div>
                <input
                  name="email" type="email" required value={formData.email} onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all text-sm"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
                Teléfono (WhatsApp)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                  <Phone size={18} />
                </div>
                <input
                  name="phone" type="tel" value={formData.phone} onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all text-sm"
                  placeholder="300 123 4567"
                />
              </div>
            </div>

            {/* ── Sede: auto-detectada o seleccionable ─────────────────── */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1 flex items-center gap-1">
                <MapPin size={11} />
                Sede
                {branchIsLocked && (
                  <span className="ml-1 text-emerald-500 normal-case font-bold tracking-normal">
                    · detectada automáticamente
                  </span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                  <MapPin size={18} />
                </div>

                {/* Si la sede viene del JWT, mostrar campo solo-lectura */}
                {branchIsLocked ? (
                  <input
                    name="branch"
                    type="text"
                    readOnly
                    value={formData.branch}
                    className="block w-full pl-11 pr-4 py-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 font-bold text-sm cursor-not-allowed"
                  />
                ) : branches.length > 0 ? (
                  /* Si hay sedes del location-service, mostrar select */
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold text-sm focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all appearance-none"
                  >
                    <option value="">Sin sede específica</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                ) : (
                  /* Fallback: input libre si no hay datos del location-service */
                  <input
                    name="branch"
                    type="text"
                    value={formData.branch}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all text-sm"
                    placeholder="Ej. Centro, Norte…"
                  />
                )}
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                  <Lock size={18} />
                </div>
                <input
                  name="password" type="password" required value={formData.password} onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Crear mi cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}