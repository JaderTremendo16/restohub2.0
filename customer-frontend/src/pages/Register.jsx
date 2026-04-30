import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Phone, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMutation, useQuery } from '@apollo/client/react';
import { REGISTER_MUTATION, GET_COUNTRIES } from '../graphql/operations';
import MapPicker from '../components/common/MapPicker';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    country: 'Colombia',
    latitude: null,
    longitude: null
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const { data: countriesData } = useQuery(GET_COUNTRIES);
  const countries = countriesData?.countries || [];

  const [registerUser, { loading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: () => {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    },
    onError: (err) => {
      setError(err.message || 'Error al crear la cuenta. Intenta con otro email.');
    }
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocationChange = (lat, lng, address) => {
    setFormData(prev => ({ 
      ...prev, 
      latitude: lat, 
      longitude: lng,
      address: address || prev.address 
    }));
  };

  const getCountryCenter = (countryName) => {
    const centers = {
      'Colombia': [4.6097, -74.0817],
      'Portugal': [38.7223, -9.1393],
      'España': [40.4168, -3.7038],
      'México': [19.4326, -99.1332]
    };
    return centers[countryName] || [4.6097, -74.0817];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    registerUser({ variables: formData });
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-black text-brand-dark mb-2">¡Registro Exitoso!</h2>
          <p className="text-slate-500 font-medium">Tu cuenta ha sido creada. Serás redirigido al login en unos instantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 md:p-10 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-brand-orange/5 rounded-full opacity-50 blur-3xl"></div>
          
          <button 
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-slate-400 hover:text-brand-orange font-black text-sm mb-8 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            Volver al Login
          </button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-brand-dark tracking-tight uppercase">Crea tu cuenta</h1>
            <p className="text-slate-500 mt-2 font-medium italic">Se parte del ecosistema RestoHub</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                  <User size={18} />
                </div>
                <input
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-brand-dark font-black placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-orange/5 focus:border-brand-orange transition-all text-sm"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                    <Mail size={18} />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-brand-dark font-black placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-orange/5 focus:border-brand-orange transition-all text-sm"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Teléfono (WhatsApp)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                  <Phone size={18} />
                </div>
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-brand-dark font-black placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-orange/5 focus:border-brand-orange transition-all text-sm"
                  placeholder="300 123 4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">País / Sede</label>
              <select
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-brand-dark font-black focus:outline-none focus:ring-4 focus:ring-brand-orange/5 focus:border-brand-orange transition-all text-sm"
              >
                {countries.length === 0 && (
                  <option value="">Cargando países...</option>
                )}
                {countries.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Dirección de Entrega</label>
              <div className="relative mb-4">
                <input
                  name="address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-brand-dark font-black placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-orange/5 focus:border-brand-orange transition-all text-sm"
                  placeholder="Calle, Número, Ciudad"
                />
              </div>
              
              <MapPicker 
                lat={formData.latitude} 
                lng={formData.longitude} 
                onChange={handleLocationChange}
                suggestedCenter={getCountryCenter(formData.country)}
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-300">
                  <Lock size={18} />
                </div>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-brand-dark font-black placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-brand-orange/5 focus:border-brand-orange transition-all text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-orange hover:bg-brand-700 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-brand-orange/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Crear mi cuenta'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
