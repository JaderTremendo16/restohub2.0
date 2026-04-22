import { useAuth } from "../../context/AuthContext";
import { useQuery } from "@apollo/client/react";
import { GET_STAFF_DATA } from "../../graphql/staffOperations";

const WorkHistory = () => {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_STAFF_DATA, {
    variables: {
      location_id: Number(user?.locationId),
    },
    skip: !user?.locationId,
  });

  // Función para convertir horas decimales (ej: 1.5) a formato legible (1h 30m)
  const formatHoursToHM = (hours) => {
    if (!hours || isNaN(hours) || hours <= 0) return "0m";
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  if (loading)
    return (
      <p style={{ padding: "2rem", textAlign: "center" }}>
        Filtrando historial...
      </p>
    );
  if (error) return <p>Error: {error.message}</p>;

  const history = data?.workHistory || [];

  const tableHeaderStyle = {
    padding: "0.75rem 1rem",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    borderBottom: "1px solid #f3f4f6",
  };

  const cellStyle = {
    padding: "1rem",
    fontSize: "0.875rem",
    color: "#374151",
    borderBottom: "1px solid #f3f4f6",
  };

  if (history.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "3rem",
          color: "#9ca3af",
          background: "white",
          borderRadius: "1rem",
        }}
      >
        <p>No hay registros de turnos para esta sede.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "1rem",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead style={{ backgroundColor: "#f9fafb" }}>
          <tr>
            <th style={tableHeaderStyle}>Empleado</th>
            <th style={tableHeaderStyle}>Fecha</th>
            <th style={tableHeaderStyle}>Entrada / Salida</th>
            <th style={tableHeaderStyle}>Horas Trabajadas</th>
            <th style={tableHeaderStyle}>Extras</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id}>
              <td style={{ ...cellStyle, fontWeight: "600" }}>{h.emp_name}</td>
              <td style={cellStyle}>{h.date}</td>
              <td style={cellStyle}>
                {h.start_time} - {h.end_time || "--:--"}
              </td>
              <td style={cellStyle}>{formatHoursToHM(h.hours_worked)}</td>
              <td
                style={{
                  ...cellStyle,
                  color: h.overtime_hours > 0 ? "#f97316" : "#374151",
                }}
              >
                {/* Formato aplicado a horas extras */}
                {h.overtime_hours > 0
                  ? `+${formatHoursToHM(h.overtime_hours)}`
                  : "0m"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WorkHistory;
