import { useEffect, useRef, useState } from "react";

// CSS de Leaflet inyectado dinámicamente para no depender de imports globales
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

let leafletLoaded = false;
let L = null;

async function loadLeaflet() {
  if (leafletLoaded) return L;

  // Inyectar CSS si no existe
  if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);
  }

  // Importar Leaflet dinámicamente (ya instalado como dep)
  const mod = await import("leaflet");
  L = mod.default;
  leafletLoaded = true;
  return L;
}

/**
 * MapaPicker — mapa interactivo para seleccionar ubicación de sede
 *
 * Props:
 *   lat, lng          — coordenadas actuales (pueden ser null)
 *   countryName       — nombre del país seleccionado para restringir búsquedas y centrar
 *   onLocationChange  — callback({ lat, lng, address }) cuando cambia el pin
 */
export default function MapaPicker({
  lat,
  lng,
  countryName,
  onLocationChange,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  // Mantener las referencias más recientes para los callbacks de eventos del mapa
  const latLngRef = useRef({ lat, lng });
  useEffect(() => {
    latLngRef.current = { lat, lng };
  }, [lat, lng]);

  const countryRef = useRef(countryName);
  useEffect(() => {
    countryRef.current = countryName;
  }, [countryName]);

  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

  // Centro por defecto: Bogotá
  const defaultCenter = [4.711, -74.0721];
  const initialCenter = lat && lng ? [lat, lng] : defaultCenter;

  useEffect(() => {
    let mounted = true;

    loadLeaflet().then((Leaflet) => {
      if (!mounted || !containerRef.current || mapRef.current) return;

      // Inicializar mapa
      const map = Leaflet.map(containerRef.current).setView(
        initialCenter,
        lat && lng ? 15 : 5,
      );

      Leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Ícono personalizado para el pin
      const icon = Leaflet.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      // Pin inicial si ya hay coordenadas
      if (lat && lng) {
        markerRef.current = Leaflet.marker([lat, lng], {
          icon,
          draggable: true,
        }).addTo(map);
        markerRef.current.on("dragend", () => {
          const { lat: newLat, lng: newLng } = markerRef.current.getLatLng();
          const { lat: fLat, lng: fLng } = latLngRef.current;
          reverseGeocode(newLat, newLng, fLat, fLng);
        });
      }

      // Click en el mapa coloca/mueve el pin
      map.on("click", (e) => {
        const { lat: newLat, lng: newLng } = e.latlng;
        const { lat: fLat, lng: fLng } = latLngRef.current;
        if (markerRef.current) {
          markerRef.current.setLatLng([newLat, newLng]);
        } else {
          markerRef.current = Leaflet.marker([newLat, newLng], {
            icon,
            draggable: true,
          }).addTo(map);
          markerRef.current.on("dragend", () => {
            const { lat: dLat, lng: dLng } = markerRef.current.getLatLng();
            const { lat: fbLat, lng: fbLng } = latLngRef.current;
            reverseGeocode(dLat, dLng, fbLat, fbLng);
          });
        }
        reverseGeocode(newLat, newLng, fLat, fLng);
      });

      mapRef.current = map;
    });

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Efecto para centrar el mapa automáticamente si el usuario selecciona un país pero aún no ha puesto un pin
  useEffect(() => {
    if (countryName && !lat && !lng && mapRef.current) {
      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(countryName)}&limit=1`,
        { headers: { "Accept-Language": "en" } },
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data.length > 0 && mapRef.current) {
            mapRef.current.setView(
              [parseFloat(data[0].lat), parseFloat(data[0].lon)],
              5,
            );
          }
        })
        .catch(console.error);
    }
  }, [countryName, lat, lng]);

  // Geocodificación inversa: coordenadas → dirección textual
  const reverseGeocode = async (newLat, newLng, fallbackLat, fallbackLng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();

      const detectedCountry = data.address?.country;
      const currentCountry = countryRef.current;

      // Validación de coherencia de país
      if (currentCountry && detectedCountry) {
        // Normalizamos quitando tildes y mayúsculas para comparar "Japón" == "japon"
        const normalize = (s) =>
          s
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        if (normalize(detectedCountry) !== normalize(currentCountry)) {
          setSearchError(
            `Error: Has seleccionado ${currentCountry}, pero el pin está en ${detectedCountry}.`,
          );

          // Revertimos el pin a su posición anterior válida
          if (fallbackLat && fallbackLng && markerRef.current) {
            markerRef.current.setLatLng([fallbackLat, fallbackLng]);
          } else if (markerRef.current) {
            markerRef.current.remove();
            markerRef.current = null;
            onLocationChange({ lat: null, lng: null, address: "" });
          }
          return;
        }
      }

      setSearchError(""); // Todo en orden
      const address =
        data.display_name ?? `${newLat.toFixed(5)}, ${newLng.toFixed(5)}`;
      onLocationChange({ lat: newLat, lng: newLng, address });
    } catch {
      // Si la API falla, permitimos el cambio temporalmente
      const address = `${newLat.toFixed(5)}, ${newLng.toFixed(5)}`;
      onLocationChange({
        lat: newLat,
        lng: newLng,
        address,
      });
    }
  };

  // Geocodificación directa: dirección textual → coordenadas
  const handleSearch = async () => {
    if (!searchText.trim()) return;
    setSearching(true);
    setSearchError("");
    try {
      // Restringimos la búsqueda añadiendo el nombre del país al query (si hay uno seleccionado)
      const queryStr = countryName
        ? `${searchText}, ${countryName}`
        : searchText;
      // Añadimos addressdetails=1 para obtener el país en la respuesta
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryStr)}&limit=1&addressdetails=1`,
        { headers: { "Accept-Language": "en" } },
      );
      const results = await res.json();
      if (!results.length) {
        setSearchError("No se encontró la dirección. Intenta con más detalle.");
        return;
      }

      const { lat: rLat, lon: rLng, display_name, address } = results[0];

      const detectedCountry = address?.country;
      const currentCountry = countryRef.current;

      // Validación de coherencia en búsqueda
      if (currentCountry && detectedCountry) {
        const normalize = (s) =>
          s
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
        if (normalize(detectedCountry) !== normalize(currentCountry)) {
          setSearchError(
            `La dirección buscada parece estar en ${detectedCountry}, pero debes buscar en ${currentCountry}.`,
          );
          return;
        }
      }

      const numLat = parseFloat(rLat);
      const numLng = parseFloat(rLng);

      if (mapRef.current) {
        mapRef.current.setView([numLat, numLng], 16);
      }

      const Leaflet = await loadLeaflet();
      const icon = Leaflet.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      if (markerRef.current) {
        markerRef.current.setLatLng([numLat, numLng]);
      } else if (mapRef.current) {
        markerRef.current = Leaflet.marker([numLat, numLng], {
          icon,
          draggable: true,
        }).addTo(mapRef.current);
        markerRef.current.on("dragend", () => {
          const { lat: dLat, lng: dLng } = markerRef.current.getLatLng();
          reverseGeocode(dLat, dLng);
        });
      }

      onLocationChange({ lat: numLat, lng: numLng, address: display_name });
    } catch {
      setSearchError("Error buscando la dirección.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {/* Buscador de dirección */}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Buscar dirección o Escribir un pais para seleccionar en el mapa"
          style={{
            flex: 1,
            padding: "0.5rem 0.875rem",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            color: "#1a1a2e",
            outline: "none",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          type="button"
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#ea580c",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: searching ? "not-allowed" : "pointer",
            opacity: searching ? 0.7 : 1,
            flexShrink: 0,
          }}
        >
          {searching ? "..." : "Buscar"}
        </button>
      </div>

      {searchError && (
        <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: 0 }}>
          {searchError}
        </p>
      )}

      {/* Instrucción */}
      <p style={{ color: "#6b7280", fontSize: "0.78rem", margin: 0 }}>
        📍 Haz clic en el mapa o busca una dirección para colocar el pin. Puedes
        arrastrarlo para ajustarlo.
      </p>

      {/* El mapa */}
      <div
        ref={containerRef}
        style={{
          height: "320px",
          borderRadius: "0.75rem",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          zIndex: 0,
        }}
      />
    </div>
  );
}
