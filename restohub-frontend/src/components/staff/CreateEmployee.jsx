import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { GET_COUNTRIES, GET_LOCATIONS } from "../../graphql/location";
import { useAuth } from "../../context/AuthContext";
import { CreditCard, ChefHat } from "lucide-react";

const inputStyle = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  fontSize: "0.875rem",
  color: "#1a1a2e",
  outline: "none",
  backgroundColor: "white",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: "600",
  color: "#374151",
  marginBottom: "0.4rem",
};

const CreateEmployee = ({ createEmployee, creating }) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("cajero");
  const { user } = useAuth(); // Obtenemos el usuario para saber su sede/país

  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: countriesData } = useQuery(GET_COUNTRIES);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const sedeActual = locationsData?.locations?.find(
    (l) => String(l.id) === String(user?.locationId),
  );

  const paisActual = countriesData?.countries?.find(
    (c) => String(c.id) === String(sedeActual?.countryId),
  );
  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim() || !email.trim() || !password.trim()) {
      alert("Todos los campos son obligatorios");
      return;
    }

    // Validación de email
    if (!email.includes("@")) {
      alert("El correo electrónico debe contener un '@'");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Por favor, ingresa un formato de correo válido (ej: usuario@empresa.com)");
      return;
    }

    // Verificamos que tengamos el ID del país antes de enviar
    if (!paisActual?.id) {
      alert("Error: No se pudo determinar el país de la sede.");
      return;
    }

    try {
      // Usamos paisActual.id para la mutación
      await createEmployee(
        name,
        paisActual.id,
        Number(user.locationId),
        phone,
        email,
        password,
        role,
      );
      setName("");
      setPhone("");
      setEmail("");
      setPassword("");
      setRole("cajero");
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "1rem",
        padding: "1.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        marginBottom: "1.5rem",
      }}
    >
      <h3
        style={{
          margin: "0 0 1.25rem 0",
          fontSize: "1rem",
          fontWeight: "700",
          color: "#1a1a2e",
        }}
      >
        Crear empleado
      </h3>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "flex-end",
        }}
      >
        <div style={{ flex: 2, minWidth: "160px" }}>
          <label style={labelStyle}>Nombre completo *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Juan Pérez"
            style={inputStyle}
          />
        </div>

        <div style={{ flex: 1, minWidth: "140px" }}>
          <label style={labelStyle}>Teléfono</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
            placeholder="Ej: 123456789"
            inputMode="numeric"
            maxLength={15}
            style={inputStyle}
          />
        </div>

        <div style={{ flex: 1, minWidth: "140px" }}>
          <label style={labelStyle}>Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=" "
            style={inputStyle}
          />
        </div>

        <div style={{ flex: 1, minWidth: "140px" }}>
          <label style={labelStyle}>Contraseña *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="****"
            style={inputStyle}
          />
        </div>

        {/* País fijo — no editable */}
        <div style={{ flex: 1, minWidth: "140px" }}>
          <label style={labelStyle}>País</label>
          <div
            style={{
              padding: "0.625rem 0.875rem",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              color: "#6b7280",
              backgroundColor: "#f9fafb",
            }}
          >
            🌍 {paisActual?.name || "No asignado"}
          </div>
        </div>

        {/* Rol del empleado */}
        <div style={{ flex: 1, minWidth: "140px" }}>
          <label style={labelStyle}>Rol *</label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{
              color: role === "cajero" ? "#1d4ed8" : "#c2410c",
              display: "flex",
              alignItems: "center",
            }}>
              {role === "cajero" ? <CreditCard size={16} /> : <ChefHat size={16} />}
            </span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={{
                ...inputStyle,
                flex: 1,
                borderColor: role === "cajero" ? "#3b82f6" : "#f97316",
                color: role === "cajero" ? "#1d4ed8" : "#c2410c",
                fontWeight: "600",
              }}
            >
              <option value="cajero">Cajero</option>
              <option value="cocinero">Cocinero</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={creating}
          style={{
            backgroundColor: creating ? "#f97316" : "#ea580c",
            color: "white",
            border: "none",
            padding: "0.625rem 1.25rem",
            borderRadius: "0.625rem",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: creating ? "not-allowed" : "pointer",
            flexShrink: 0,
          }}
        >
          {creating ? "Creando..." : "Crear empleado"}
        </button>
      </div>
    </div>
  );
};
export default CreateEmployee;
