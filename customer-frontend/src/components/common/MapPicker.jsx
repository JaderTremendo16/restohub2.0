import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin, Navigation, Building2 } from 'lucide-react';

// Icono para el Cliente (Azul)
const customerIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Icono para el Restaurante (Naranja)
const restaurantIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const MapEvents = ({ onChange }) => {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            onChange(lat, lng);
        },
    });
    return null;
};

const ChangeView = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
            map.setView(center, zoom || map.getZoom());
        }
    }, [center, map, zoom]);
    return null;
};

// Función de Haversine para calcular distancia en km
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; // Distancia en km
};

const MapPicker = ({ lat, lng, onChange, address, suggestedCenter, branchLocation, onValidationChange, targetCountry, targetCountryCode }) => {
    console.log("Customer MapPicker Props:", { lat, lng, branch: branchLocation, targetCountry, targetCountryCode });
    const defaultCenter = [4.6097, -74.0817]; // Bogotá por defecto
    const [position, setPosition] = useState(lat && lng ? [lat, lng] : null);
    const [loading, setLoading] = useState(false);
    const [distanceWarning, setDistanceWarning] = useState(false);
    const [countryWarning, setCountryWarning] = useState(false);

    useEffect(() => {
        if (lat && lng) {
            setPosition([lat, lng]);
            if (branchLocation?.latitude && branchLocation?.longitude) {
                const dist = calculateDistance(lat, lng, branchLocation.latitude, branchLocation.longitude);
                console.log("Distance calculated (useEffect):", dist, "Limit: 8km");
                onValidationChange?.(dist > 8);
                setDistanceWarning(dist > 8); // 8km límite
            } else {
                console.warn("No branch coordinates available for validation", branchLocation);
                onValidationChange?.(false);
            }
        } else {
            // Si las coordenadas son nulas (ej. por cambio de país), reseteamos el pin
            setPosition(null);
            setCountryWarning(false);
            setDistanceWarning(false);
        }
    }, [lat, lng, branchLocation, onValidationChange]);

    const reverseGeocode = async (newLat, newLng) => {
        setLoading(true);
        setCountryWarning(false);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&zoom=18&addressdetails=1`, {
                headers: {
                    'Accept-Language': 'es'
                }
            });
            const data = await response.json();
            if (data && data.display_name) {
                // Validación de país por código (más robusto que el nombre)
                if (targetCountryCode) {
                    const detectedCode = data.address.country_code; // Viene en minúsculas (ej: 'br')
                    if (detectedCode && detectedCode.toLowerCase() !== targetCountryCode.toLowerCase()) {
                        setCountryWarning(true);
                        setPosition(null);
                        onChange(null, null, null, null); // Añadimos ciudad null
                        return;
                    }
                } else if (targetCountry) {
                    // Fallback por nombre si no hay código (retrocompatibilidad)
                    const detectedCountry = data.address.country;
                    if (detectedCountry && detectedCountry.toLowerCase() !== targetCountry.toLowerCase()) {
                        setCountryWarning(true);
                        setPosition(null);
                        onChange(null, null, null, null);
                        return;
                    }
                }

                const addr = data.display_name;
                const city = data.address.city || data.address.town || data.address.village || data.address.suburb || '';
                onChange(newLat, newLng, addr, city);
            } else {
                onChange(newLat, newLng, null, null);
            }
        } catch (error) {
            console.error("Error en geocodificación inversa:", error);
            onChange(newLat, newLng, null);
        } finally {
            setLoading(false);
        }
    };

    const handleMapClick = (newLat, newLng) => {
        setPosition([newLat, newLng]);
        if (branchLocation?.latitude && branchLocation?.longitude) {
            const dist = calculateDistance(newLat, newLng, branchLocation.latitude, branchLocation.longitude);
            console.log("Distance calculated (click):", dist);
            const isInvalid = dist > 8;
            setDistanceWarning(isInvalid);
            onValidationChange?.(isInvalid);
        }
        reverseGeocode(newLat, newLng);
    };

    const mapCenter = position || suggestedCenter || defaultCenter;

    return (
        <div className="space-y-4">
            <div className="h-[300px] w-full rounded-2xl overflow-hidden border-2 border-slate-100 shadow-inner z-0 relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 z-[1000] flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                <MapContainer 
                    center={mapCenter} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    <MapEvents onChange={handleMapClick} />
                    <ChangeView center={mapCenter} zoom={distanceWarning ? 12 : 14} />
                    
                    {/* Pin del Cliente */}
                    {position && (
                        <Marker position={position} icon={customerIcon}>
                            <Popup className="font-bold text-slate-800">Tu Ubicación de Entrega</Popup>
                        </Marker>
                    )}
                    
                    {/* Pin de la Sede y Radio de Cobertura */}
                    {branchLocation?.latitude && branchLocation?.longitude && (
                        <>
                            <Marker 
                                position={[parseFloat(branchLocation.latitude), parseFloat(branchLocation.longitude)]} 
                                icon={restaurantIcon}
                            >
                                <Popup>
                                    <div className="text-center min-w-[120px]">
                                        <p className="font-black text-brand-orange uppercase text-[9px] tracking-widest mb-1">Sede Seleccionada</p>
                                        <p className="font-bold text-slate-800 text-sm leading-tight">{branchLocation.name}</p>
                                        <p className="text-[10px] text-slate-500 mt-1">{branchLocation.address}</p>
                                    </div>
                                </Popup>
                            </Marker>
                            
                            {/* Radio de 8km */}
                            <Circle 
                                center={[parseFloat(branchLocation.latitude), parseFloat(branchLocation.longitude)]}
                                radius={8000} // 8km en metros
                                pathOptions={{
                                    fillColor: distanceWarning ? '#ef4444' : '#f97316',
                                    fillOpacity: 0.1,
                                    color: distanceWarning ? '#ef4444' : '#f97316',
                                    weight: 1,
                                    dashArray: '5, 5'
                                }}
                            />
                        </>
                    )}
                </MapContainer>
            </div>
            
            {address && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Ubicación seleccionada: <span className="text-brand-dark">{address}</span>
                </div>
            )}
            
            {distanceWarning && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-200 text-xs font-semibold flex items-start gap-2">
                    <span>⚠️</span>
                    <p>
                        <strong>Dirección fuera de alcance:</strong> Esta ubicación se encuentra demasiado lejos (más de 8km) de la sede seleccionada. Por favor, selecciona una ubicación dentro de la misma ciudad.
                    </p>
                </div>
            )}

            {countryWarning && (
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-200 text-xs font-semibold flex items-start gap-2">
                    <span>🌍</span>
                    <p>
                        <strong>País incorrecto:</strong> Has marcado un punto fuera de {targetCountry}. Por favor, selecciona una ubicación dentro del país elegido.
                    </p>
                </div>
            )}
            
            <p className="text-[9px] text-slate-400 italic">
                * Haz clic en el mapa para marcar tu ubicación y obtener la dirección automáticamente.
            </p>
        </div>
    );
};

export default MapPicker;
