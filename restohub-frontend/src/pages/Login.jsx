import { useState } from "react";
import { useMutation, useApolloClient } from "@apollo/client/react";
import { LOGIN, GET_LOCATIONS } from "../graphql/location";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const client = useApolloClient();

  const [loginMutation, { loading }] = useMutation(LOGIN, {
    onCompleted: async (data) => {
      const { token, user } = data.login;
      
      try {
        console.log("Iniciando resolución de sede para:", user.locationId);
        // Descarga fresca de sedes
        const { data: locs } = await client.query({
          query: GET_LOCATIONS,
          fetchPolicy: 'network-only'
        });
        
        // Mapeo exhaustivo
        const location = locs?.locations?.find(l => 
          parseInt(l.id) === parseInt(user.locationId)
        );
        
        // Si no se encuentra en el servidor (raro), forzamos casos conocidos
        let branchName = location ? location.name : "Global";
        if (branchName === "Global" && parseInt(user.locationId) === 1) {
          branchName = "Portugal";
        }
        
        console.log("Sede resuelta:", branchName);
        login(user, token, user.locationId, branchName);
        navigate("/");
      } catch (err) {
        console.error("Error crítico en login:", err);
        login(user, token, user.locationId, "Global");
        navigate("/");
      }
    },
    onError: (e) => {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
    },
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = () => {
    if (!form.email || !form.password) {
      setError("Completa todos los campos");
      return;
    }
    loginMutation({
      variables: { email: form.email, password: form.password },
    });
  };

  const handleKeyDown = (e) => {
    // Permite hacer login con Enter
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#1a1a2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "1.5rem",
          padding: "3rem",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "2rem",
              fontWeight: "800",
              color: "#ea580c",
            }}
          >
            RestoHub
          </h1>
          <p
            style={{
              margin: "0.5rem 0 0 0",
              color: "#6b7280",
              fontSize: "0.875rem",
            }}
          >
            Sistema de gestión de restaurantes
          </p>
        </div>

        {/* Formulario */}
        <div
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "0.4rem",
              }}
            >
              Email
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="tu@email.com"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "1.5px solid #e5e7eb",
                borderRadius: "0.625rem",
                fontSize: "0.875rem",
                color: "#1a1a2e",
                outline: "none",
                backgroundColor: "white",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "0.4rem",
              }}
            >
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: "1.5px solid #e5e7eb",
                borderRadius: "0.625rem",
                fontSize: "0.875rem",
                color: "#1a1a2e",
                outline: "none",
                backgroundColor: "white",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Mensaje de error */}
          {error && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.5rem",
                padding: "0.75rem 1rem",
                fontSize: "0.8rem",
                color: "#dc2626",
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              backgroundColor: loading ? "#f97316" : "#ea580c",
              color: "white",
              border: "none",
              padding: "0.875rem",
              borderRadius: "0.625rem",
              fontSize: "0.95rem",
              fontWeight: "700",
              cursor: loading ? "not-allowed" : "pointer",
              marginTop: "0.5rem",
              transition: "background-color 0.2s",
            }}
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
