import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_SUPPLIERS,
  GET_SUPPLIER,
  CREATE_SUPPLIER,
  DEACTIVATE_SUPPLIER,
  ACTIVATE_SUPPLIER,
} from "../graphql/ingredients";
import { GET_COUNTRIES } from "../graphql/location";
import { useAuth } from "../context/AuthContext";
import { GET_LOCATIONS } from "../graphql/location";

const inputStyle = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  border: "1px solid #e5e7eb",
  borderRadius: "0.5rem",
  fontSize: "0.875rem",
  color: "#1a1a2e",
  outline: "none",
  backgroundColor: "white",
};

const labelStyle = {
  display: "block",
  fontSize: "0.8rem",
  fontWeight: "600",
  color: "#374151",
  marginBottom: "0.4rem",
};

const btnPrimario = {
  backgroundColor: "#ea580c",
  color: "white",
  border: "none",
  padding: "0.625rem 1.25rem",
  borderRadius: "0.625rem",
  fontSize: "0.875rem",
  fontWeight: "600",
  cursor: "pointer",
};

const btnSecundario = {
  backgroundColor: "white",
  color: "#374151",
  border: "1px solid #e5e7eb",
  padding: "0.625rem 1.25rem",
  borderRadius: "0.625rem",
  fontSize: "0.875rem",
  fontWeight: "600",
  cursor: "pointer",
};

// ── Modal para crear proveedor ──────────────────────────────────
function ModalCrearProveedor({ onClose, onCreated, countryId, countryName }) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    country_id: countryId ?? "",
  });

  const [createSupplier, { loading }] = useMutation(CREATE_SUPPLIER, {
    refetchQueries: [
      {
        query: GET_SUPPLIERS,
        variables: {
          onlyActive: true,
          country_id: countryId ? parseInt(countryId) : undefined,
        },
      },
    ],
    onCompleted: () => onCreated(),
    onError: (error) => alert("Error al crear proveedor: " + error.message),
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    createSupplier({
      variables: {
        input: {
          ...form,
          country_id: countryId ? parseInt(countryId) : null,
        },
      },
    });
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "1rem",
          padding: "2rem",
          width: "100%",
          maxWidth: "480px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <h3
          style={{
            margin: "0 0 1.5rem 0",
            fontSize: "1.125rem",
            fontWeight: "700",
            color: "#1a1a2e",
          }}
        >
          Nuevo proveedor
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Distribuidora La Cosecha"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Teléfono</label>
            <input
              name="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => {
                // Solo dígitos, +, espacios, guiones y paréntesis
                const val = e.target.value.replace(/[^0-9+\-\s()]/g, "");
                setForm({ ...form, phone: val });
              }}
              placeholder="Ej: +57 300 123 4567"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Ej: contacto@proveedor.com"
              style={inputStyle}
            />
          </div>

          <div>
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
              🌍 {countryName || "País no asignado"}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            marginTop: "1.5rem",
            justifyContent: "flex-end",
          }}
        >
          <button onClick={onClose} style={btnSecundario}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} style={btnPrimario}>
            {loading ? "Guardando..." : "Crear proveedor"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panel lateral de detalles ───────────────────────────────────
function PanelDetalle({ supplierId, onClose, onDeactivated, countries }) {
  // Traemos los detalles del proveedor seleccionado
  // La query solo se ejecuta cuando supplierId tiene un valor
  const { data, loading } = useQuery(GET_SUPPLIER, {
    variables: { id: supplierId },
    skip: !supplierId,
  });

  const [deactivateSupplier] = useMutation(DEACTIVATE_SUPPLIER, {
    refetchQueries: [
      { query: GET_SUPPLIERS, variables: { onlyActive: true } },
      { query: GET_SUPPLIERS, variables: { onlyActive: false } },
    ],
    onCompleted: () => onDeactivated(),
  });

  const supplier = data?.supplier;

  const handleDeactivate = () => {
    if (window.confirm(`¿Desactivar "${supplier?.name}"?`)) {
      deactivateSupplier({ variables: { id: supplierId } });
    }
  };

  const [activateSupplier] = useMutation(ACTIVATE_SUPPLIER, {
    refetchQueries: [{ query: GET_SUPPLIERS, variables: { onlyActive: true } }],
    onCompleted: () => onDeactivated(),
  });
  return (
    <>
      {/* Fondo semitransparente — al hacer click cierra el panel */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.3)",
          zIndex: 40,
        }}
      />

      {/* Panel que sale desde la derecha */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "380px",
          backgroundColor: "white",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
          zIndex: 41,
          display: "flex",
          flexDirection: "column",
          padding: "2rem",
          overflowY: "auto",
        }}
      >
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          style={{
            alignSelf: "flex-end",
            background: "none",
            border: "none",
            fontSize: "1.25rem",
            cursor: "pointer",
            color: "#6b7280",
            marginBottom: "1.5rem",
          }}
        >
          ✕
        </button>

        {loading ? (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: "2rem",
                  backgroundColor: "#e5e7eb",
                  borderRadius: "0.5rem",
                }}
              />
            ))}
          </div>
        ) : supplier ? (
          <>
            {/* Avatar con inicial */}
            <div
              style={{
                width: "4rem",
                height: "4rem",
                borderRadius: "1rem",
                backgroundColor: "#ea580c",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                fontWeight: "700",
                color: "white",
                marginBottom: "1rem",
              }}
            >
              {supplier.name.charAt(0).toUpperCase()}
            </div>

            <h2
              style={{
                margin: "0 0 0.25rem 0",
                fontSize: "1.25rem",
                fontWeight: "700",
                color: "#1a1a2e",
              }}
            >
              {supplier.name}
            </h2>

            <span
              style={{
                display: "inline-block",
                backgroundColor: supplier.is_active ? "#dcfce7" : "#f3f4f6",
                color: supplier.is_active ? "#16a34a" : "#6b7280",
                padding: "0.2rem 0.75rem",
                borderRadius: "9999px",
                fontSize: "0.75rem",
                fontWeight: "600",
                marginBottom: "2rem",
              }}
            >
              {supplier.is_active ? "Activo" : "Inactivo"}
            </span>

            {/* Detalle en filas */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <FilaDetalle
                label="📞 Teléfono"
                value={supplier.phone || "No registrado"}
              />
              <FilaDetalle
                label="✉️ Email"
                value={supplier.email || "No registrado"}
              />
              <FilaDetalle
                label="País"
                value={
                  countries?.find(
                    (c) => String(c.id) === String(supplier.country_id),
                  )?.name || "No asignado"
                }
              />
            </div>

            {/* Botones activar/desactivar proveedor */}
            <div
              style={{
                marginTop: "2rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {supplier.is_active ? (
                <button
                  onClick={handleDeactivate}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "0.75rem",
                    color: "#dc2626",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Desactivar proveedor
                </button>
              ) : (
                <button
                  onClick={() =>
                    activateSupplier({
                      variables: { id: supplierId },
                      refetchQueries: [
                        { query: GET_SUPPLIERS, variables: { onlyActive: true } },
                      ],
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #86efac",
                    borderRadius: "0.75rem",
                    color: "#16a34a",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Activar proveedor
                </button>
              )}
            </div>
          </>
        ) : (
          <p style={{ color: "#9ca3af" }}>No se encontró el proveedor.</p>
        )}
      </div>
    </>
  );
}

// Componente pequeño para mostrar una fila de detalle
function FilaDetalle({ label, value }) {
  return (
    <div
      style={{
        padding: "0.875rem",
        backgroundColor: "#f9fafb",
        borderRadius: "0.75rem",
      }}
    >
      <p
        style={{
          margin: "0 0 0.25rem 0",
          fontSize: "0.75rem",
          color: "#6b7280",
          fontWeight: "500",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "0.875rem",
          color: "#1a1a2e",
          fontWeight: "500",
        }}
      >
        {value}
      </p>
    </div>
  );
}


// ── Página principal ────────────────────────────────────────────
function Suppliers() {
  const [selectedId, setSelectedId] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Obtenemos el país del admin
  const { user } = useAuth();
  const locationId = user?.locationId ? parseInt(user.locationId) : null;
  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: countriesData } = useQuery(GET_COUNTRIES);

  const sedeActual = locationsData?.locations?.find(
    (l) => String(l.id) === String(user?.locationId),
  );
  const paisActual = countriesData?.countries?.find(
    (c) => String(c.id) === String(sedeActual?.countryId),
  );

  // Filtramos proveedores por el país del admin
  const { data, loading, error } = useQuery(GET_SUPPLIERS, {
    variables: {
      onlyActive: true,
      country_id: paisActual?.id ? parseInt(paisActual.id) : undefined,
    },
    skip: !paisActual?.id,
  });

  const suppliers = data?.suppliers ?? [];

  return (
    <div>
      {/* Encabezado */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "2rem",
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: "700",
              color: "#1a1a2e",
            }}
          >
            Proveedores
          </h2>
          <p
            style={{
              margin: "0.25rem 0 0 0",
              color: "#6b7280",
              fontSize: "0.875rem",
            }}
          >
            {suppliers.length} proveedor{suppliers.length !== 1 ? "es" : ""}{" "}
            activo{suppliers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => setModalAbierto(true)} style={btnPrimario}>
          + Nuevo proveedor
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "0.75rem",
            padding: "1rem",
            color: "#dc2626",
            fontSize: "0.875rem",
            marginBottom: "1.5rem",
          }}
        >
          ⚠️ Error al cargar proveedores: {error.message}
        </div>
      )}

      {/* Grid de cards */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "8rem",
                backgroundColor: "white",
                borderRadius: "1rem",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      ) : suppliers.length === 0 ? (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            padding: "3rem",
            textAlign: "center",
            color: "#9ca3af",
          }}
        >
          <p style={{ fontSize: "2rem", margin: "0 0 0.5rem 0" }}>🚚</p>
          <p style={{ margin: 0 }}>No hay proveedores registrados aún.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1rem",
          }}
        >
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              onClick={() => setSelectedId(supplier.id)}
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                padding: "1.5rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                cursor: "pointer",
                transition: "box-shadow 0.2s, transform 0.2s",
                border:
                  selectedId === supplier.id
                    ? "2px solid #ea580c"
                    : "2px solid transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {/* Avatar + nombre */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "0.75rem",
                    backgroundColor: "#ea580c",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "700",
                    fontSize: "1.125rem",
                    flexShrink: 0,
                  }}
                >
                  {supplier.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontWeight: "600",
                      color: "#1a1a2e",
                      fontSize: "0.95rem",
                    }}
                  >
                    {supplier.name}
                  </p>
                  <p
                    style={{
                      margin: "0.1rem 0 0 0",
                      fontSize: "0.75rem",
                      color: "#6b7280",
                    }}
                  >
                    {supplier.email || "Sin email"}
                  </p>
                </div>
              </div>

              {/* Teléfono */}
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280" }}>
                📞 {supplier.phone || "Sin teléfono"}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Panel lateral */}
      {selectedId && (
        <PanelDetalle
          supplierId={selectedId}
          countries={countriesData?.countries ?? []}
          onClose={() => setSelectedId(null)}
          onDeactivated={() => setSelectedId(null)}
        />
      )}

      {/* Modal crear */}
      {modalAbierto && (
        <ModalCrearProveedor
          onClose={() => setModalAbierto(false)}
          onCreated={() => setModalAbierto(false)}
          countryId={paisActual?.id}
          countryName={paisActual?.name}
        />
      )}
    </div>
  );
}

export default Suppliers;
