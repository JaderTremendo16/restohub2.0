import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
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
        if (center) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

const MapPicker = ({ lat, lng, onChange, address, suggestedCenter }) => {
    const defaultCenter = [4.6097, -74.0817]; // Bogotá por defecto
    const [position, setPosition] = useState(lat && lng ? [lat, lng] : null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (lat && lng) {
            setPosition([lat, lng]);
        }
    }, [lat, lng]);

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
                </MapContainer>
            </div>
            
            {address && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Ubicación seleccionada: <span className="text-brand-dark">{address}</span>
                </div>
            )}
            
            <p className="text-[9px] text-slate-400 italic">
                * Haz clic en el mapa para marcar tu ubicación y obtener la dirección automáticamente.
            </p>
        </div>
    );
};

export default MapPicker;
