import { useRef, useState, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useStaff } from "../../hooks/useStaff";
import { useAuth } from "../../context/AuthContext"; // Necesario para el filtro
import { GET_STAFF_DATA } from "../../graphql/staffOperations"; // Importar la query

const QRScanner = () => {
  const { scanQR } = useStaff();
  const { user } = useAuth(); // Obtenemos el locationId del admin logueado
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);

  // Función auxiliar para convertir horas decimales (0.5) a "30m" o "1h 30m"
  const formatHoursToHM = (hours) => {
    if (!hours || isNaN(hours) || hours <= 0) return "0m";
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  useEffect(() => {
    scannerRef.current = new Html5Qrcode("reader");
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current.clear());
      }
    };
  }, []);

  const startScanner = async () => {
    if (!scannerRef.current || scanning) return;

    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 300 }, aspectRatio: 1.0 },
        async (decodedText) => {
          try {
            await scannerRef.current.stop();
            setScanning(false);

            const id = parseInt(decodedText.split("_").pop());

            // Ejecutamos el scan pasándole las instrucciones de actualización
            const result = await scanQR(id, {
              refetchQueries: [
                {
                  query: GET_STAFF_DATA,
                  variables: { location_id: Number(user?.locationId) },
                },
              ],
            });

            if (result) {
              const msg = `${result.status}${
                result.hours > 0
                  ? ` - Trabajado: ${formatHoursToHM(result.hours)}${
                      result.overtime > 0
                        ? ` (+${formatHoursToHM(result.overtime)} extra)`
                        : ""
                    }`
                  : ""
              }`;
              alert(msg);
            }
          } catch (error) {
            console.error("Error procesando QR:", error);
            alert("Error al procesar el QR");
          }
        },
      );
      setScanning(true);
    } catch (err) {
      console.error("Error iniciando cámara:", err);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      setScanning(false);
    }
  };

  return (
    <div style={{ marginTop: "30px", textAlign: "center" }}>
      <h2 style={{ color: "#1a1a2e" }}>Escanear QR de Empleado</h2>
      <div style={{ marginBottom: "15px" }}>
        <button
          onClick={startScanner}
          disabled={scanning}
          style={{ marginRight: "10px", padding: "8px 16px" }}
        >
          Iniciar Cámara
        </button>
        <button
          onClick={stopScanner}
          disabled={!scanning}
          style={{ padding: "8px 16px" }}
        >
          Detener Cámara
        </button>
      </div>
      <div
        id="reader"
        style={{
          width: "100%",
          maxWidth: "400px",
          margin: "0 auto",
          border: "2px solid #333",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      />
    </div>
  );
};

export default QRScanner;
