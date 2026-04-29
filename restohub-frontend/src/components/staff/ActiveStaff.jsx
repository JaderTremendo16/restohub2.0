import { useState, useEffect } from "react";

const ActiveStaff = ({ activeStaff }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    // Actualiza cada minuto para que el contador de tiempo "vivo" cambie
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  const calculateLiveTime = (startTime) => {
    if (!startTime) return "0m";

    let start;

    if (!isNaN(startTime)) {
      start = new Date(Number(startTime));
    } else {
      start = new Date(startTime);
    }

    if (isNaN(start.getTime())) return "0m";

    let diffMs = now - start;

    if (diffMs < 0) diffMs = 0;

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) return `${remainingMinutes}m`;
    return `${hours}h ${remainingMinutes}m`;
  };

  // DEBUG CORREGIDO: Solo logueamos el array completo aquí fuera
  console.log("ACTIVE STAFF ARRAY:", activeStaff);

  return (
    <div
      style={{
        backgroundColor: "#f0fdf4",
        padding: "20px",
        borderRadius: "12px",
        marginBottom: "20px",
        border: "1px solid #dcfce7",
      }}
    >
      <h3 style={{ margin: "0 0 15px 0", color: "#166534" }}>
        Personal en turno actual
      </h3>

      {activeStaff.length === 0 ? (
        <p style={{ color: "#6b7280", fontStyle: "italic", margin: 0 }}>
          No hay turnos iniciados en este momento.
        </p>
      ) : (
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {activeStaff.map((s) => {
            // Si quieres ver el log de cada empleado, hazlo AQUÍ dentro:
            console.log(`Empleado: ${s.name}, Inicio: ${s.start}`);

            return (
              <div
                key={s.id}
                style={{
                  background: "white",
                  padding: "12px 18px",
                  borderRadius: "10px",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span style={{ fontWeight: "700", color: "#1a1a2e" }}>
                  {s.name}
                </span>

                <span
                  style={{
                    color: "#22c55e",
                    fontWeight: "800",
                  }}
                >
                  {calculateLiveTime(s.start)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActiveStaff;
