import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  UPDATE_PROFILE_MUTATION,
  GET_COUNTRIES,
  GET_LOCATIONS,
} from '../../graphql/operations';
import { MapPin, ArrowLeft, Globe, Loader2, CheckCircle2 } from 'lucide-react';

// ── Importamos Leaflet y el CSS necesario ─────────────────────────
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { createPathComponent } from '@react-leaflet/core';
import L from 'leaflet';
import 'leaflet.markercluster';

// Custom MarkerClusterGroup compatible with React-Leaflet v5
const MarkerClusterGroup = createPathComponent(({ children: _c, ...props }, ctx) => {
  const instance = new L.MarkerClusterGroup(props);
  return { instance, context: { ...ctx, layerContainer: instance } };
});

// Fix Leaflet icon path (Vite build issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Icono personalizado naranja para las sucursales
const branchIcon = new L.DivIcon({
  className: '',
  html: `<div style="
    background: linear-gradient(135deg, #ea580c, #c2410c);
    color: white;
    width: 36px;
    height: 36px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(234,88,12,0.5);
    border: 2px solid white;
  ">
    <span style="display: flex; align-items: center; justify-content: center; transform: rotate(45deg);">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
      </svg>
    </span>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -38],
});

// Componente para centrar el mapa cuando cambian los bounds
function MapBoundsFitter({ locations }) {
  const map = useMap();
  const locationsStr = JSON.stringify(locations.map(l => l.id));

  useEffect(() => {
    if (!locations || locations.length === 0) return;
    const validLocs = locations.filter(
      (l) => l.latitude != null && l.longitude != null
    );
    if (validLocs.length === 0) return;

    if (validLocs.length === 1) {
      map.setView([validLocs[0].latitude, validLocs[0].longitude], 14);
    } else {
      const bounds = L.latLngBounds(
        validLocs.map((l) => [l.latitude, l.longitude])
      );
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 13 });
    }
  }, [locationsStr, map]); // Use stringified locations to prevent re-renders on hover
  return null;
}

const LocationSelector = ({ forceShow = false, onClose }) => {
  const { user, updateUser, logout } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [loadingAction, setLoadingAction] = useState(false);

  const { data: countriesData, loading: loadingCountries } = useQuery(GET_COUNTRIES);
  const { data: locationsData, loading: loadingLocations } = useQuery(GET_LOCATIONS);
  const [updateProfile] = useMutation(UPDATE_PROFILE_MUTATION);

  // Si el usuario ya tiene sede o es admin, no mostrar a menos que se force
  if ((!user || user.role === 'admin' || user.branch) && !forceShow) return null;

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setStep(2);
  };

  const handleBranchSelect = async (location) => {
    if (!user?.id || loadingAction) return;
    setLoadingAction(true);
    try {
      const { data } = await updateProfile({
        variables: {
          id: user.id,
          name: user.name || 'Usuario',
          email: user.email || 'email@ejemplo.com',
          phone: user.phone ?? null,
          country: selectedCountry.name,
          city: (user.city && user.city !== 'Sede') ? user.city : '', // Keep existing city or empty
          branch: location.name,
        },
      });
      if (data?.updateUserProfile) {
        updateUser(data.updateUserProfile);
        if (onClose) onClose(); // Cerrar el modal si se seleccionó desde el perfil
      }
    } catch (error) {
      console.error('Error al guardar sede:', error);
    } finally {
      setLoadingAction(false);
    }
  };

  const countries = countriesData?.countries || [];
  const allLocations = locationsData?.locations || [];
  const filteredLocations = allLocations.filter(
    (l) => l.countryId === selectedCountry?.id
  );

  // Ubicaciones con coordenadas válidas para el mapa
  const mapLocations = filteredLocations.filter(
    (l) => l.latitude != null && l.longitude != null
  );
  const hasMap = mapLocations.length > 0;

  // Centro inicial del mapa (primer punto con coords o LAM)
  const defaultCenter = mapLocations.length > 0
    ? [mapLocations[0].latitude, mapLocations[0].longitude]
    : [4.7110, -74.0721];

  const isLoading = loadingCountries || loadingLocations;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div
        className="w-full bg-white rounded-3xl shadow-2xl overflow-hidden relative"
        style={{ maxWidth: step === 2 && hasMap ? '780px' : '460px', transition: 'max-width 0.4s ease' }}
      >
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-[1000] p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        )}
        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white relative overflow-hidden">
          {/* Decorative circle */}
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-orange-500/20 rounded-full blur-xl" />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-orange-400/10 rounded-full blur-xl" />

          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500/20 border border-orange-500/30 rounded-2xl flex items-center justify-center flex-shrink-0">
              <MapPin className="text-orange-400" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {step === 1 ? '¿Dónde estás?' : `Sedes en ${selectedCountry?.name}`}
              </h2>
              <p className="text-slate-400 text-xs font-medium mt-0.5">
                {step === 1
                  ? 'Selecciona tu país para ver las sucursales'
                  : hasMap
                    ? 'Toca un marcador en el mapa o elige de la lista'
                    : 'Selecciona tu sede favorita'}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div className="relative flex items-center gap-2 mt-4">
            <div className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${step >= 1 ? 'bg-orange-500' : 'bg-slate-700'}`} />
            <div className={`h-1.5 rounded-full flex-1 transition-all duration-500 ${step >= 2 ? 'bg-orange-500' : 'bg-slate-700'}`} />
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-6">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-orange-500" size={36} />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Cargando sedes...
              </p>
            </div>
          ) : (
            <>
              {/* ── PASO 1: Seleccionar País ── */}
              {step === 1 && (
                <div className="space-y-2.5">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    Paso 1 · Elige tu país
                  </p>
                  {countries.length === 0 ? (
                    <p className="text-slate-400 text-sm italic text-center py-6">
                      No hay países registrados.
                    </p>
                  ) : (
                    countries.map((country) => {
                      const branchCount = allLocations.filter(
                        (l) => l.countryId === country.id
                      ).length;
                      return (
                        <button
                          key={country.id}
                          onClick={() => handleCountrySelect(country)}
                          className="w-full p-4 flex items-center justify-between border-2 border-slate-100 rounded-2xl hover:border-orange-400 hover:bg-orange-50 transition-all font-bold group text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 group-hover:bg-orange-100 rounded-xl flex items-center justify-center transition-colors">
                              <Globe className="text-slate-400 group-hover:text-orange-500" size={18} />
                            </div>
                            <div>
                              <div className="text-slate-800 font-bold text-sm">{country.name}</div>
                              <div className="text-slate-400 text-xs font-medium">
                                {branchCount} sede{branchCount !== 1 ? 's' : ''} disponible{branchCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all text-slate-400 font-black text-sm">
                            →
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── PASO 2: Mapa + Lista de Sedes ── */}
              {step === 2 && (
                <div>
                  {hasMap ? (
                    /* Layout con mapa + lista lateral */
                    <div className="flex gap-4" style={{ height: '380px' }}>
                      {/* Mapa Leaflet */}
                      <div className="flex-1 rounded-2xl overflow-hidden border-2 border-slate-100 relative" style={{ minWidth: 0 }}>
                        <MapContainer
                          center={defaultCenter}
                          zoom={6}
                          scrollWheelZoom={true}
                          style={{ height: '100%', width: '100%' }}
                          zoomControl={true}
                          attributionControl={false}
                        >
                          <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            attribution=""
                          />
                          <MapBoundsFitter locations={mapLocations} />
                          <MarkerClusterGroup
                            chunkedLoading={true}
                            showCoverageOnHover={false}
                            maxClusterRadius={50}
                            iconCreateFunction={(cluster) => {
                              return L.divIcon({
                                html: `<div style="background-color: #ea580c; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; box-shadow: 0 4px 6px rgba(234, 88, 12, 0.4); border: 3px solid white;">${cluster.getChildCount()}</div>`,
                                className: 'custom-cluster-icon',
                                iconSize: L.point(40, 40, true),
                              });
                            }}
                          >
                            {mapLocations.map((loc) => (
                              <Marker
                                key={loc.id}
                                position={[loc.latitude, loc.longitude]}
                                icon={branchIcon}
                                eventHandlers={{
                                  mouseover: () => setHoveredLocation(loc.id),
                                  mouseout: () => setHoveredLocation(null),
                                }}
                              >
                                <Popup className="leaflet-popup-restohub">
                                  <div className="text-center p-1" style={{ minWidth: '160px' }}>
                                    <p className="font-black text-slate-900 text-sm mb-0.5">{loc.name}</p>
                                    <p className="text-slate-500 text-xs mb-3">{loc.address}</p>
                                    <button
                                      onClick={() => handleBranchSelect(loc)}
                                      disabled={loadingAction}
                                      className="w-full py-2 px-4 rounded-xl text-white text-xs font-black uppercase tracking-wider transition-all"
                                      style={{
                                        background: 'linear-gradient(135deg, #ea580c, #c2410c)',
                                        boxShadow: '0 4px 12px rgba(234,88,12,0.35)',
                                      }}
                                    >
                                      {loadingAction ? (
                                        <Loader2 className="animate-spin inline" size={12} />
                                      ) : (
                                        '✓ Seleccionar esta sede'
                                      )}
                                    </button>
                                  </div>
                                </Popup>
                              </Marker>
                            ))}
                          </MarkerClusterGroup>
                        </MapContainer>

                        {/* Leyenda sobre el mapa */}
                        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-lg border border-slate-100">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            🗺️ Toca un marcador para seleccionar
                          </p>
                        </div>
                      </div>

                      {/* Lista compacta lateral */}
                      <div className="w-52 flex flex-col gap-2 overflow-y-auto pr-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0 mb-1">
                          Lista de sedes
                        </p>
                        {filteredLocations.map((loc) => (
                          <button
                            key={loc.id}
                            onClick={() => handleBranchSelect(loc)}
                            disabled={loadingAction}
                            className={`
                              w-full p-3 text-left rounded-2xl border-2 transition-all text-sm font-bold flex-shrink-0
                              ${hoveredLocation === loc.id
                                ? 'border-orange-400 bg-orange-50'
                                : 'border-slate-100 hover:border-orange-300 hover:bg-orange-50/50'
                              }
                            `}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-orange-500 flex-shrink-0 mt-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
                                </svg>
                              </span>
                              <div>
                                <div className="text-slate-800 text-xs font-black leading-tight">{loc.name}</div>
                                <div className="text-slate-400 text-[10px] font-medium mt-0.5 leading-tight line-clamp-2">
                                  {loc.address}
                                </div>
                              </div>
                            </div>
                            {loadingAction && (
                              <Loader2 className="animate-spin text-orange-500 mt-1" size={12} />
                            )}
                          </button>
                        ))}
                        {filteredLocations.length === 0 && (
                          <p className="text-slate-400 text-xs italic text-center py-4">
                            No hay sedes en este país.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Sin coordenadas: lista clásica mejorada */
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                        Paso 2 · Elige tu sede
                      </p>
                      {filteredLocations.length === 0 ? (
                        <p className="text-slate-400 text-sm italic text-center py-6">
                          No hay sedes en este país.
                        </p>
                      ) : (
                        filteredLocations.map((loc) => (
                          <button
                            key={loc.id}
                            onClick={() => handleBranchSelect(loc)}
                            disabled={loadingAction}
                            className="w-full p-4 text-left border-2 border-slate-100 rounded-2xl hover:border-orange-500 hover:bg-orange-500 hover:text-white transition-all font-bold flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-slate-100 group-hover:bg-orange-400/30 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-orange-600 transition-colors">
                                  <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>
                                </svg>
                              </div>
                              <div>
                                <div className="text-sm">{loc.name}</div>
                                <div className="text-[10px] opacity-70 font-medium tracking-tight leading-none mt-0.5">
                                  {loc.address}
                                </div>
                              </div>
                            </div>
                            {loadingAction ? (
                              <Loader2 className="animate-spin flex-shrink-0" size={16} />
                            ) : (
                              <CheckCircle2 className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" size={18} />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Botón volver */}
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 text-slate-400 text-xs font-black hover:text-slate-600 mt-4 transition-colors"
                  >
                    <ArrowLeft size={14} /> Cambiar País
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 pb-5 pt-1 flex justify-center border-t border-slate-50">
          <button
            onClick={logout}
            className="text-slate-400 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationSelector;
