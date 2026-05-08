import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  UPDATE_PROFILE_MUTATION,
  LIST_ALL_EXTERNAL_COUNTRIES,
  GET_COUNTRIES,
  GET_LOCATIONS,
} from "../graphql/operations";
import MapPicker from "../components/common/MapPicker";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Save,
  Loader2,
  CheckCircle2,
  Globe,
  LogOut,
} from "lucide-react";

const Profile = () => {
  const { user, updateUser, logout, getCurrencyConfig } = useAuth();

  const { data: extCountriesData, loading: loadingExt } = useQuery(LIST_ALL_EXTERNAL_COUNTRIES);
  const { data: intCountriesData, loading: loadingInt } = useQuery(GET_COUNTRIES);
  const { data: locationsData, loading: loadingLocs } = useQuery(GET_LOCATIONS);

  const countries = extCountriesData?.listAllExternalCountries || [];
  const internalCountries = intCountriesData?.countries || [];
  const locations = locationsData?.locations || [];

  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    country: user?.country || "",
    countryCode: "", // Se llenará en el useEffect o al cambiar
    city: user?.city || "",
    branch: user?.branch || "",
    address: user?.address || "",
    latitude: user?.latitude || null,
    longitude: user?.longitude || null,
  });
  const [suggestedCenter, setSuggestedCenter] = useState([4.6097, -74.0817]);
  const [showSuccess, setShowSuccess] = useState(false);

  const [updateProfile, { loading: updating }] = useMutation(
    UPDATE_PROFILE_MUTATION,
    {
      onCompleted: (data) => {
        updateUser(data.updateUserProfile);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      },
    },
  );

  useEffect(() => {
    if (user?.country) {
      // Sincronizar el countryCode inicial
      if (countries.length > 0) {
        const cObj = countries.find(c => c.name === user.country);
        if (cObj) setFormData(prev => ({ ...prev, countryCode: cObj.code }));
      }

      const centerMap = async () => {
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(user.country)}&limit=1`);
          const data = await response.json();
          if (data && data[0]) {
            setSuggestedCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
          }
        } catch (err) {
          console.error("Error centering map on load:", err);
        }
      };
      centerMap();
    }
  }, [user?.country]);

  const handleChange = async (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'country') {
      const selectedCountry = countries.find(c => c.name === value);
      const code = selectedCountry?.code || '';

      setFormData(prev => ({
        ...prev,
        country: value,
        countryCode: code,
        city: '',
        address: '',
        latitude: null,
        longitude: null,
        branch: ''
      }));

      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=1`);
        const data = await response.json();
        if (data && data[0]) {
          setSuggestedCenter([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      } catch (err) {
        console.error("Error centering map:", err);
      }
    }
  };

  const handleLocationChange = (lat, lng, address, city) => {
    setFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      address: address || prev.address,
      city: city || prev.city,
    }));
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile({
      variables: {
        id: user.id,
        ...formData
      },
    });
  };

  if (loadingExt || loadingInt || loadingLocs) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-slate-400 font-bold">
        <Loader2 className="animate-spin text-brand-600" size={32} />
        <p className="text-xs uppercase tracking-widest">
          Cargando tu perfil dinámico...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Mi Perfil
          </h1>
          <p className="text-[var(--text-secondary)] font-medium mt-1">
            Gestiona tu información personal y sede preferida.
          </p>
        </div>
      </div>

      {showSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 font-bold animate-in slide-in-from-top-4">
          <CheckCircle2 size={20} />
          Perfil actualizado correctamente
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-8"
      >
        {/* Profile Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[var(--bg-card)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
              <User size={14} /> Información Personal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] px-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-bold text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] px-1">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-bold text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] px-1">
                  Teléfono
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-bold text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] px-1">
                  Ciudad
                </label>
                <div className="relative">
                  <MapPin
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-bold text-[var(--text-primary)]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-secondary)] flex items-center gap-2">
              <MapPin size={14} /> Ubicación y Sede
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] px-1">
                  País
                </label>
                <div className="relative">
                  <Globe
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-2xl text-[var(--text-primary)] font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all text-sm"
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-primary)] px-1">
                  Sede Preferida
                </label>
                <div className="relative">
                  <Building2
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    size={18}
                  />
                  <select
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 bg-brand-dark text-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-brand-orange/20 font-bold appearance-none cursor-pointer"
                  >
                    <option value="">Selecciona una sede</option>
                    {locations
                      .filter((loc) => {
                        // Buscamos el ID interno del país seleccionado por nombre
                        const internalCountry = internalCountries.find(
                          (c) => c.name.toLowerCase() === formData.country.toLowerCase(),
                        );
                        return loc.countryId === internalCountry?.id;
                      })
                      .map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-50 dark:border-slate-700">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[var(--text-primary)] px-1">
                    Dirección de Entrega
                  </label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                      size={18}
                    />
                    <input
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-[var(--border-color)] rounded-2xl outline-none focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 transition-all font-bold text-[var(--text-primary)]"
                      placeholder="Calle, Número, Ciudad"
                    />
                  </div>
                </div>

                <MapPicker
                  lat={formData.latitude}
                  lng={formData.longitude}
                  onChange={handleLocationChange}
                  suggestedCenter={suggestedCenter}
                  targetCountry={formData.country}
                  targetCountryCode={formData.countryCode}
                  branchLocation={locations.find(loc => loc.name === formData.branch)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Card */}
        <div className="space-y-6">
          <div className="bg-brand-dark rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl shadow-black/20">
            <div className="w-16 h-16 bg-brand-orange rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-orange/30">
              <Building2 size={32} />
            </div>
            <h4 className="text-xl font-black italic uppercase tracking-tight">
              ¿Cambias de ambiente?
            </h4>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Al actualizar tu sede, el menú y las promociones se ajustarán
              automáticamente a tu nueva ubicación.
            </p>
            <button
              type="submit"
              disabled={updating}
              className="w-full py-4 bg-brand-orange hover:bg-brand-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-orange/20"
            >
              {updating ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Save size={18} /> Guardar Cambios
                </>
              )}
            </button>
            <button
              type="button"
              onClick={logout}
              className="w-full py-4 bg-rose-400 hover:bg-rose-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl shadow-rose-400/20 mt-4"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Profile;
