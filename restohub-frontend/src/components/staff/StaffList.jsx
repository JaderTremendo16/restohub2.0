import { CreditCard, ChefHat } from "lucide-react";

const StaffList = ({ employees, toggleStatus }) => {
  return (
    <div style={{ marginTop: "30px" }}>
      <h2 style={{ marginBottom: "20px", color: "#1a1a2e" }}>
        Listado de Personal
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "20px",
        }}
      >
        {employees.map((emp) => (
          <div
            key={emp.id}
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              border: `1px solid ${emp.active ? "#e5e7eb" : "#fee2e2"}`,
              position: "relative",
            }}
          >
            {/* Indicador de estado visual */}
            <div
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: emp.active ? "#22c55e" : "#ef4444",
              }}
            />

            <h3 style={{ margin: "0 0 5px 0", fontSize: "1.1rem" }}>
              {emp.name}
            </h3>

            {/* Badge de rol */}
            <div style={{ marginBottom: "10px" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 10px",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  backgroundColor: emp.role === "cajero" ? "#dbeafe" : "#ffedd5",
                  color: emp.role === "cajero" ? "#1d4ed8" : "#c2410c",
                }}
              >
                {emp.role === "cajero"
                  ? <><CreditCard size={12} /> Cajero</>
                  : <><ChefHat size={12} /> Cocinero</>}
              </span>
            </div>

            <div
              style={{
                fontSize: "0.8rem",
                color: "#6b7280",
                marginBottom: "15px",
              }}
            >
              <div>📞 {emp.phone || "Sin teléfono"}</div>
              <div>✉️ {emp.email || "Sin email"}</div>
              <div style={{ marginTop: "5px", fontWeight: "600" }}>
                ⏳ Base: {emp.base_hours || 0}h
              </div>
            </div>

            {/* QR optimizado para escaneo */}
            <div
              style={{
                background: "#f9fafb",
                padding: "10px",
                borderRadius: "8px",
                marginBottom: "15px",
              }}
            >
              <img
                src={`data:image/png;base64,${emp.qr_code}`}
                alt="QR"
                style={{
                  width: "100%",
                  height: "auto",
                  maxWidth: "150px",
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </div>

            <button
              onClick={() => toggleStatus(emp.id)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: emp.active ? "#fee2e2" : "#dcfce7",
                color: emp.active ? "#991b1b" : "#166534",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              {emp.active ? "Desactivar Empleado" : "Activar Empleado"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StaffList;
