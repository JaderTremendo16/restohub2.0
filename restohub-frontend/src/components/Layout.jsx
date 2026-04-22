import { Outlet, useNavigate, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";

function Layout() {
  const { user, logout, isGerenteGeneral, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Si no hay usuario, redirige al login directamente desde el Layout
  if (!user) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const inicial =
    user?.firstName?.charAt(0)?.toUpperCase() ??
    user?.first_name?.charAt(0)?.toUpperCase() ??
    "U";

  const nombreCompleto = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ""}`
    : `${user?.first_name ?? ""} ${user?.last_name ?? ""}`;

  const rolLabel = isGerenteGeneral ? "Gerente General" : "Administrador";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
      }}
    >
      <Sidebar />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.875rem 2rem",
            backgroundColor: "white",
            borderBottom: "1px solid #f3f4f6",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          <p
            style={{
              color: "#9ca3af",
              fontSize: "0.8rem",
              margin: 0,
              fontWeight: "500",
            }}
          >
            Sistema de gestión ·{" "}
            <span style={{ color: "#ea580c" }}>RestoHub</span>
          </p>
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}
          >
            <div style={{ textAlign: "right" }}>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#1a1a2e",
                }}
              >
                {nombreCompleto.trim()}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.72rem",
                  color: "#9ca3af",
                  fontWeight: "500",
                }}
              >
                {rolLabel}
              </p>
            </div>
            <div
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "50%",
                backgroundColor: "#ea580c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "0.875rem",
                fontWeight: "700",
                flexShrink: 0,
              }}
            >
              {inicial}
            </div>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: "transparent",
                border: "1.5px solid #e5e7eb",
                borderRadius: "0.625rem",
                padding: "0.375rem 0.875rem",
                fontSize: "0.78rem",
                color: "#6b7280",
                cursor: "pointer",
                fontWeight: "500",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#ea580c";
                e.target.style.color = "#ea580c";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#e5e7eb";
                e.target.style.color = "#6b7280";
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </header>
        <main style={{ flex: 1, padding: "2rem" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
