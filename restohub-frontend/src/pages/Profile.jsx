import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation } from '@apollo/client/react';
import { 
  UPDATE_PROFILE_MUTATION 
} from '../graphql/operations';
import { 
  GET_COUNTRIES, 
  GET_LOCATIONS 
} from '../graphql/location';
import { User, Mail, Phone, MapPin, Building2, Save, Loader2, CheckCircle2, Globe } from 'lucide-react';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    country: user?.country || '',
    branch: user?.branch || ''
  });
  const [showSuccess, setShowSuccess] = useState(false);

  // Queries dinámicas
  const { data: countriesData, loading: loadingCountries } = useQuery(GET_COUNTRIES);
  const { data: locationsData, loading: loadingLocations } = useQuery(GET_LOCATIONS);

  const [updateProfile, { loading: updating }] = useMutation(UPDATE_PROFILE_MUTATION, {
    onCompleted: (data) => {
      updateUser(data.updateUserProfile);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  });

  const countries = countriesData?.countries || [];
  const locations = locationsData?.locations || [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile({
      variables: {
        id: user.id,
        ...formData,
        city: "Sede" // Valor por defecto
      }
    });
  };

  if (loadingCountries || loadingLocations) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400 font-bold">
        <Loader2 className="animate-spin text-brand-600" size={32} />
        <p className="text-xs uppercase tracking-widest">Cargando perfil administrativo...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Mi Perfil Administrativo</h1>
          <p className="text-slate-500 font-medium mt-1">Configura tus datos de acceso y sede asignada.</p>
        </div>
      </div>

      {showSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 font-bold animate-in slide-in-from-top-4">
          <CheckCircle2 size={20} />
          Perfil actualizado correctamente
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <User size={14} /> Información Personal
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 px-1">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 px-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 px-1">Teléfono</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <MapPin size={14} /> Ubicación y Sede
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 px-1">País</label>
                <div className="relative">
                   <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <select 
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 font-bold text-slate-800 appearance-none"
                  >
                    <option value="">Selecciona un país</option>
                    {countries.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 px-1">Sede Asignada</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <select 
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900 text-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/20 font-bold appearance-none cursor-pointer"
                  >
                    <option value="">Selecciona una sede</option>
                    {locations
                      .filter(loc => {
                        const countryObj = countries.find(c => c.name === formData.country);
                        return loc.countryId === countryObj?.id;
                      })
                      .map(b => <option key={b.id} value={b.name}>{b.name}</option>)
                    }
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6">
            <div className="w-16 h-16 bg-brand-500 rounded-2xl flex items-center justify-center mb-4">
              <Building2 size={32} />
            </div>
            <h4 className="text-xl font-black">Control de Gestión</h4>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Como administrador, tu sede asignada determina qué inventario y platos puedes gestionar en el panel principal.
            </p>
            <button 
              type="submit"
              disabled={updating}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-500/20"
            >
              {updating ? <Loader2 className="animate-spin" size={20} /> : (
                <><Save size={18} /> Guardar Perfil</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Profile;
