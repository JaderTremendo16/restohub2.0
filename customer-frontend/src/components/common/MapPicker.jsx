import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corregir iconos de Leaflet en React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapEvents = ({ onChange }) => {
    useMapEvents({
        click(e) {
            const { lat, lng } = e.latlng;
            onChange(lat, lng);
        },
    });
    return null;
};

const ChangeView = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && Array.isArray(center) && center.length === 2 && !isNaN(center[0]) && !isNaN(center[1])) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
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

const MapPicker = ({ lat, lng, onChange, address, suggestedCenter, branchLocation, onValidationChange }) => {
    console.log("Customer MapPicker Props:", { lat, lng, branch: branchLocation });
    const defaultCenter = [4.6097, -74.0817]; // Bogotá por defecto
    const [position, setPosition] = useState(lat && lng ? [lat, lng] : null);
    const [loading, setLoading] = useState(false);
    const [distanceWarning, setDistanceWarning] = useState(false);

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
        }
    }, [lat, lng, branchLocation, onValidationChange]);

    const reverseGeocode = async (newLat, newLng) => {
        setLoading(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&zoom=18&addressdetails=1`, {
                headers: {
                    'Accept-Language': 'es'
                }
            });
            const data = await response.json();
            if (data && data.display_name) {
                // Simplificamos la dirección para la casilla
                const addr = data.display_name;
                onChange(newLat, newLng, addr);
            } else {
                onChange(newLat, newLng, null);
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
                    <ChangeView center={mapCenter} />
                    {position && <Marker position={position} />}
                    
                    {/* Círculo de Geofencing (8km) */}
                    {branchLocation?.latitude && branchLocation?.longitude && (
                        <Circle 
                            center={[branchLocation.latitude, branchLocation.longitude]}
                            radius={8000} // 8km en metros
                            pathOptions={{
                                fillColor: '#ea580c',
                                fillOpacity: 0.1,
                                color: '#ea580c',
                                weight: 2,
                                dashArray: '5, 10'
                            }}
                        />
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
            
            <p className="text-[9px] text-slate-400 italic">
                * Haz clic en el mapa para marcar tu ubicación y obtener la dirección automáticamente.
            </p>
        </div>
    );
};

export default MapPicker;
