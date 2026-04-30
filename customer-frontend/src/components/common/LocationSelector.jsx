import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation } from '@apollo/client/react';
import { 
  UPDATE_PROFILE_MUTATION, 
  GET_COUNTRIES, 
  GET_LOCATIONS 
} from '../../graphql/operations';
import { MapPin, ArrowLeft, Building2, Globe, Loader2 } from 'lucide-react';

const LocationSelector = () => {
  const { user, updateUser, logout } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Consultas dinámicas
  const { data: countriesData, loading: loadingCountries } = useQuery(GET_COUNTRIES);
  const { data: locationsData, loading: loadingLocations } = useQuery(GET_LOCATIONS);
  const [updateProfile] = useMutation(UPDATE_PROFILE_MUTATION);

  // Si el usuario ya tiene sede o es admin, no mostrar
  if (!user || user.role === 'admin' || user.branch) return null;

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setStep(2);
  };

  const handleBranchSelect = async (location) => {
    if (!user?.id) {
      alert("Error: No se encontró el ID del usuario.");
      return;
    }
    setLoadingAction(true);
    try {
      const { data } = await updateProfile({
        variables: {
          id: user.id,
          name: user.name || "Usuario",
          email: user.email || "email@ejemplo.com",
          phone: user.phone ?? null,
          country: selectedCountry.name,
          city: "Principal", // Default ya que no hay ciudades en el modelo actual
          branch: location.name
        }
      });
      if (data?.updateUserProfile) {
        updateUser(data.updateUserProfile);
      }
    } catch (error) {
      alert("Error al guardar ubicación: " + error.message);
    } finally {
      setLoadingAction(false);
    }
  };

  const countries = countriesData?.countries || [];
  const locations = locationsData?.locations || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 text-center">
          <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MapPin size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">¡Bienvenido a RestoHub!</h3>
          <p className="text-slate-500 mb-8">Personaliza tu experiencia seleccionando tu país y sede.</p>

          {(loadingCountries || loadingLocations) ? (
            <div className="py-12 flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-brand-600" size={32} />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Cargando sedes reales...</p>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block text-left mb-2">
                    1. Selecciona tu País
                  </label>
                  {countries.map((country) => (
                    <button
                      key={country.id}
                      onClick={() => handleCountrySelect(country)}
                      className="w-full p-4 flex items-center justify-between border-2 border-slate-100 rounded-2xl hover:border-brand-500 hover:bg-brand-50 transition-all font-bold group"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="text-slate-400 group-hover:text-brand-500" size={20} />
                        <span>{country.name}</span>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-brand-500 group-hover:text-white">
                        →
                      </div>
                    </button>
                  ))}
                  {countries.length === 0 && <p className="text-slate-400 italic py-4 text-sm">No hay países registrados.</p>}
                </div>
              )}

              {step === 2 && (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block text-left mb-2">
                    2. Selecciona tu Sede en {selectedCountry?.name}
                  </label>
                  {locations
                    .filter(loc => loc.countryId === selectedCountry?.id)
                    .map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => handleBranchSelect(loc)}
                        disabled={loadingAction}
                        className="w-full p-4 text-left border-2 border-slate-100 rounded-2xl hover:border-brand-600 hover:bg-brand-600 hover:text-white transition-all font-bold flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-3">
                          <Building2 className="text-slate-400 group-hover:text-white" size={20} />
                          <div>
                            <div>{loc.name}</div>
                            <div className="text-[10px] opacity-70 font-medium tracking-tight leading-none group-hover:text-white">
                              {loc.address}
                            </div>
                          </div>
                        </div>
                        {loadingAction && <Loader2 className="animate-spin" size={16} />}
                      </button>
                    ))}
                  {locations.filter(loc => loc.countryId === selectedCountry?.id).length === 0 && (
                    <p className="text-slate-400 italic py-4 text-sm">No hay sedes en este país.</p>
                  )}
                  
                  <button 
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-slate-400 text-sm font-bold hover:text-slate-600 mt-4 mx-auto"
                  >
                    <ArrowLeft size={16} /> Cambiar País
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100">
            <button 
              onClick={logout}
              className="text-slate-400 hover:text-rose-500 text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2 mx-auto"
            >
              Cerrar Sesión Actual
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;
