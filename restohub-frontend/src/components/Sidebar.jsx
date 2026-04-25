import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GET_LOCATIONS, GET_COUNTRIES } from "../graphql/location";
import { useQuery } from "@apollo/client/react";
import {
  ChartColumn,
  UtensilsCrossed,
  Globe,
  Soup,
  Truck,
  Store,
  Users,
  ShelvingUnit,
  ClipboardList,
  ChefHat,
  MonitorCheck,
  FileText,
  Star,
  Settings,
  Gift,
} from "lucide-react";

function Sidebar() {
  const { user, isGerenteGeneral, isAdmin } = useAuth();

  // Secciones del menú
  const groups = [
    {
      title: "General",
      items: [
        {
          label: "Dashboard",
          path: "/",
          icon: <ChartColumn size={18} />,
          roles: ["general_manager", "admin"],
        },
      ],
    },
    {
      title: "Operaciones",
      items: [
        {
          label: "Menú",
          path: "/menu",
          icon: <UtensilsCrossed size={18} />,
          roles: ["admin"],
        },
        {
          label: "Ingredientes",
          path: "/ingredientes",
          icon: <Soup size={18} />,
          roles: ["admin"],
        },
        {
          label: "Inventario",
          path: "/inventario",
          icon: <ShelvingUnit size={18} />,
          roles: ["admin"],
        },
        {
          label: "Proveedores",
          path: "/proveedores",
          icon: <Truck size={18} />,
          roles: ["admin"],
        },
        {
          label: "Órdenes",
          path: "/orders",
          icon: <ClipboardList size={18} />,
          roles: ["admin"],
        },
        {
          label: "Cocina",
          path: "/kitchen",
          icon: <ChefHat size={18} />,
          roles: ["cocinero"],
        },
        {
          label: "Caja (POS)",
          path: "/pos",
          icon: <MonitorCheck size={18} />,
          roles: ["cajero"],
        },
        {
          label: "Staff",
          path: "/staff",
          icon: <Users size={18} />,
          roles: ["admin"],
        },
      ],
    },
    {
      title: "Gestión Global",
      roles: ["general_manager"],
      items: [
        {
          label: "Gestión Global",
          path: "/gestion-global",
          icon: <Globe size={18} />,
          roles: ["general_manager"],
        },
        {
          label: "Menú",
          path: "/menu-bank",
          icon: <UtensilsCrossed size={18} />,
          roles: ["general_manager"],
        },
        {
          label: "Reportes",
          path: "/reportes",
          icon: <FileText size={18} />,
          roles: ["admin", "general_manager"],
        },
      ],
    },
    {
      title: "Loyalty & Clientes",
      roles: ["admin"],
      items: [
        {
          label: "Clientes",
          path: "/loyalty/clientes",
          icon: <Users size={18} />,
          roles: ["admin"],
        },
        {
          label: "Puntos y Premios",
          path: "/loyalty/premios",
          icon: <Gift size={18} />,
          roles: ["admin"],
        },
        {
          label: "Reseñas",
          path: "/loyalty/resenas",
          icon: <Star size={18} />,
          roles: ["admin"],
        },
      ],
    },
  ];

  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: countriesData } = useQuery(GET_COUNTRIES);

  const sedeActual = locationsData?.locations?.find(
    (l) => String(l.id) === String(user?.locationId),
  );

  const paisActual = countriesData?.countries?.find(
    (c) => String(c.id) === String(sedeActual?.countryId),
  );

  return (
    <aside
      style={{
        width: "280px",
        height: "100vh",
        position: "sticky",
        top: 0,
        backgroundColor: "#1a1a2e",
        display: "flex",
        flexDirection: "column",
        padding: "2rem 1.25rem",
        boxSizing: "border-box",
        flexShrink: 0,
        zIndex: 50,
        borderRight: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      {/* Brand Header */}
      <div style={{ marginBottom: "2.5rem", padding: "0 0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: "#ea580c",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "900",
              fontSize: "1.2rem",
            }}
          >
            R
          </div>
          <div>
            <h1
              style={{
                color: "white",
                fontSize: "1.25rem",
                fontWeight: "800",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              RestoHub
            </h1>
            <p
              style={{
                color: "#4b5563",
                fontSize: "0.65rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: 0,
              }}
            >
              Management System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Groups */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
        className="sidebar-scroll"
      >
        {groups.map((group, gIdx) => {
          const filteredItems = group.items.filter((i) =>
            i.roles.includes(user?.role),
          );
          if (filteredItems.length === 0) return null;

          return (
            <div key={gIdx}>
              <p
                style={{
                  color: "#4b5563",
                  fontSize: "0.65rem",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.75rem",
                  paddingLeft: "0.75rem",
                }}
              >
                {group.title}
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem",
                }}
              >
                {filteredItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      gap: "0.875rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.75rem",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      textDecoration: "none",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      backgroundColor: isActive ? "#ea580c" : "transparent",
                      color: isActive ? "white" : "#9ca3af",
                      boxShadow: isActive
                        ? "0 10px 15px -3px rgba(234, 88, 12, 0.2)"
                        : "none",
                    })}
                    onMouseEnter={(e) => {
                      if (!e.currentTarget.classList.contains("active")) {
                        e.currentTarget.style.color = "white";
                        e.currentTarget.style.backgroundColor =
                          "rgba(255,255,255,0.03)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!e.currentTarget.classList.contains("active")) {
                        e.currentTarget.style.color = "#9ca3af";
                        e.currentTarget.style.backgroundColor = "transparent";
                      }
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.9,
                      }}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Sede Info & User Card */}
      <div
        style={{
          marginTop: "2rem",
          borderTop: "1px solid rgba(255,255,255,0.05)",
          paddingTop: "1.5rem",
        }}
      >
        {isAdmin && user?.locationId && (
          <div
            style={{
              backgroundColor: "rgba(234, 88, 12, 0.05)",
              padding: "1rem",
              borderRadius: "1rem",
              border: "1px solid rgba(234, 88, 12, 0.1)",
            }}
          >
            <p
              style={{
                margin: "0 0 0.5rem 0",
                fontSize: "0.6rem",
                fontWeight: "800",
                color: "#ea580c",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Sede Actual
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "white",
                fontSize: "0.8rem",
                fontWeight: "700",
              }}
            >
              <Store size={14} />
              {sedeActual?.name ?? `Sede #${user.locationId}`}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#6b7280",
                fontSize: "0.7rem",
                marginTop: "0.25rem",
              }}
            >
              <Globe size={14} />
              {paisActual?.name ?? "Cargando..."}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
