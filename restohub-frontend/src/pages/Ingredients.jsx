import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_INGREDIENTS,
  CREATE_INGREDIENT,
  DEACTIVATE_INGREDIENT,
  UPDATE_INGREDIENT,
  UPSERT_INGREDIENT_COST,
  ACTIVATE_INGREDIENT,
} from "../graphql/ingredients";
import { GET_SUPPLIERS } from "../graphql/ingredients";
import { useAuth } from "../context/AuthContext";
import { GET_LOCATIONS } from "../graphql/location";
import { GET_COUNTRIES } from "../graphql/location";

// Categorías y unidades disponibles según tu schema de GraphQL
const CATEGORIAS = [
  "Frutas",
  "Verduras",
  "Proteinas",
  "Lacteos",
  "Cereales",
  "Bebidas",
  "Otros",
];
const UNIDADES = ["kg", "g", "l", "ml", "unidad"];

// ── Componente del Modal ────────────────────────────────────────
// Lo separamos para mantener el código organizado
function ModalCrearIngrediente({ onClose, onCreated, suppliers, location_id }) {
  // Estado del formulario — un objeto con todos los campos
  const [form, setForm] = useState({
    name: "",
    unit: "",
    category: "Otros",
    cost_per_unit: "",
    supplier_id: "",
  });

  const [createIngredient, { loading }] = useMutation(CREATE_INGREDIENT, {
    // Después de crear, volvemos a pedir la lista de ingredientes
    // para que la tabla se actualice sin recargar la página
    refetchQueries: [{ query: GET_INGREDIENTS, variables: { location_id } }],
    onCompleted: () => {
      onCreated(); // Cierra el modal
    },
    onError: (error) => {
      alert("Error al crear ingrediente: " + error.message);
    },
  });

  // Maneja cambios en cualquier campo del formulario
  // En lugar de tener una función por campo, usamos el name del input
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    if (!form.unit) {
      alert("La unidad es obligatoria");
      return;
    }
    createIngredient({
      variables: {
        input: {
          ...form,
          name:
            form.name.trim().charAt(0).toUpperCase() +
            form.name.trim().slice(1),
          cost_per_unit: parseFloat(form.cost_per_unit) || 0,
          supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
          location_id: location_id,
        },
      },
    });
  };

  return (
    // Fondo oscuro detrás del modal
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
      {/* Caja del modal — el onClick detiene la propagación para que
          hacer click adentro no cierre el modal */}
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
          Nuevo ingrediente
        </h3>

        {/* Campos del formulario */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Harina de trigo"
              style={inputStyle}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Unidad *</label>
              <select
                name="unit"
                value={form.unit}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="">Seleccione unidad</option>
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Categoría</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                style={inputStyle}
              >
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Costo por unidad</label>
            <input
              name="cost_per_unit"
              type="number"
              value={form.cost_per_unit}
              onChange={handleChange}
              placeholder="0.00"
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Proveedor</label>
            <select
              name="supplier_id"
              value={form.supplier_id}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Sin proveedor asignado</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botones */}
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
            {loading ? "Guardando..." : "Crear ingrediente"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────
function Ingredients() {
  // Estado para el filtro de categoría — "" significa "todas"
  const [categoriaFiltro, setCategoriaFiltro] = useState("");

  // Estado para controlar si el modal está abierto o cerrado
  const [modalAbierto, setModalAbierto] = useState(false);

  const { user, isAdmin } = useAuth();
  const locationId = user?.locationId ? parseInt(user.locationId) : null;

  // Consultas para detectar el país y la moneda
  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: countriesData } = useQuery(GET_COUNTRIES);

  const sedeActual = locationsData?.locations?.find(
    (l) => String(l.id) === String(user?.locationId)
  );
  const paisActual = countriesData?.countries?.find(
    (c) => String(c.id) === String(sedeActual?.countryId)
  );

  // Ingredientes filtrados por sede
  const { data, loading, error } = useQuery(GET_INGREDIENTS, {
    variables: { location_id: locationId },
    skip: !locationId,
  });

  // Proveedores
  const { data: suppliersData } = useQuery(GET_SUPPLIERS, {
    variables: { 
      onlyActive: true,
      country_id: paisActual?.id ? parseInt(paisActual.id) : undefined 
    },
    skip: !paisActual?.id,
  });

  // Mutation para desactivar
  const [deactivateIngredient] = useMutation(DEACTIVATE_INGREDIENT, {
    refetchQueries: [
      { query: GET_INGREDIENTS, variables: { location_id: locationId } },
    ],
    onCompleted: () => alert("Ingrediente desactivado"),
    onError: (e) => alert("Error al desactivar ingrediente: " + e.message),
  });

  const handleDeactivate = (id, name) => {
    const ing = ingredientesFiltrados.find((i) => String(i.id) === String(id));
    const dishesInUse = ing?.dishes || [];

    let message = `¿Desactivar "${name}"?\n\nEl ingrediente quedará sin precio ni proveedor activo.`;

    if (dishesInUse.length > 0) {
      const dishNames = dishesInUse.map((d) => d.name).join(", ");
      message = `⚠️ ADVERTENCIA: "${name}" se usa en los siguientes platos: [ ${dishNames} ].\n\nAl desactivarlo, seguirá apareciendo en esas recetas pero quedará SIN precio ni proveedor activo hasta que lo reactives.\n\n¿Deseas continuar?`;
    }

    if (window.confirm(message)) {
      deactivateIngredient({ variables: { id, location_id: locationId } });
    }
  };

  const [activateIngredient] = useMutation(ACTIVATE_INGREDIENT, {
    refetchQueries: [
      { query: GET_INGREDIENTS, variables: { location_id: locationId } },
    ],
    onCompleted: () => alert("Ingrediente activado"),
    onError: (e) => alert("Error al activar ingrediente: " + e.message),
  });

  const handleActivate = (id) => {
    activateIngredient({ variables: { id, location_id: locationId } });
  };
  const [editandoId, setEditandoId] = useState(null);
  const [nuevoCosto, setNuevoCosto] = useState("");
  const [nuevoProveedor, setNuevoProveedor] = useState("");
  const [nuevoUnidad, setNuevoUnidad] = useState("");
  const [nuevoCategoria, setNuevoCategoria] = useState("");

  const [upsertIngredientCost, { loading: loadingUpsert }] = useMutation(
    UPSERT_INGREDIENT_COST,
    {
      refetchQueries: [
        {
          query: GET_INGREDIENTS,
          variables: { location_id: locationId },
        },
      ],
      awaitRefetchQueries: true,
      onCompleted: () => {
        setEditandoId(null);
        setNuevoCosto("");
        alert(
          "¡Costo y proveedor actualizados!" + 
          (paisActual ? ` para ${paisActual.name}` : "")
        );
      },
      onError: (e) => alert("Error al actualizar costo: " + e.message),
    },
  );

  const [updateIngredient, { loading: loadingUpdate }] = useMutation(
    UPDATE_INGREDIENT,
    {
      refetchQueries: [
        {
          query: GET_INGREDIENTS,
          variables: { location_id: locationId },
        },
      ],
      awaitRefetchQueries: true,
      onCompleted: () => {
        setEditandoId(null);
        alert("¡Datos básicos actualizados!");
      },
      onError: (e) => alert("Error al actualizar: " + e.message),
    },
  );

  // Filtramos los ingredientes según la categoría seleccionada y eliminamos duplicados por nombre
  const ingredientesFiltrados = (data?.ingredients ?? [])
    .filter((ing) =>
      categoriaFiltro ? ing.category === categoriaFiltro : true,
    )
    .sort((a, b) => {
      // Priorizar los que TIENEN location_id (son locales de esta sede)
      if (a.location_id && !b.location_id) return -1;
      if (!a.location_id && b.location_id) return 1;
      return 0;
    })
    .filter(
      (ing, index, self) =>
        index ===
        self.findIndex(
          (t) => t.name.trim().toLowerCase() === ing.name.trim().toLowerCase(),
        ),
    );

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
            Ingredientes
          </h2>
          <p
            style={{
              margin: "0.25rem 0 0 0",
              color: "#6b7280",
              fontSize: "0.875rem",
            }}
          >
            Gestión de ingredientes del sistema
          </p>
        </div>
        <button onClick={() => setModalAbierto(true)} style={btnPrimario}>
          + Nuevo ingrediente
        </button>
      </div>

      {/* Filtro por categoría */}
      <div style={{ marginBottom: "1.5rem" }}>
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          style={{ ...inputStyle, width: "auto", minWidth: "200px" }}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Estado de carga */}
      {loading && (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                height: "3.5rem",
                backgroundColor: "white",
                borderRadius: "0.75rem",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      )}

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
          }}
        >
          ⚠️ Error al cargar ingredientes: {error.message}
        </div>
      )}

      {/* Tabla */}
      {!loading && !error && (
        <div
          style={{
            backgroundColor: "white",
            borderRadius: "1rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          {ingredientesFiltrados.length === 0 ? (
            <div
              style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}
            >
              <p style={{ fontSize: "2rem", margin: "0 0 0.5rem 0" }}>🧂</p>
              <p style={{ margin: 0 }}>No hay ingredientes registrados aún.</p>
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr
                  style={{
                    backgroundColor: "#f9fafb",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {[
                    "Nombre",
                    "Categoría",
                    "Unidad",
                    "Costo/unidad",
                    "Proveedor",
                    "Editar",
                    "Acción",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.875rem 1.25rem",
                        textAlign: "left",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: "#6b7280",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ingredientesFiltrados.map((ing, index) => (
                  <tr
                    key={ing.id}
                    style={{
                      borderBottom:
                        index < ingredientesFiltrados.length - 1
                          ? "1px solid #f3f4f6"
                          : "none",
                      transition: "background-color 0.1s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#fafafa")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td style={tdStyle}>{ing.name}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          backgroundColor: "#f3f4f6",
                          padding: "0.2rem 0.6rem",
                          borderRadius: "9999px",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                          color: "#374151",
                        }}
                      >
                        {ing.category}
                      </span>
                    </td>
                    <td style={tdStyle}>{ing.unit}</td>
                    <td style={tdStyle}>
                      {ing.cost_per_unit != null
                        ? formatCurrency(ing.cost_per_unit, paisActual)
                        : "—"}
                    </td>
                    <td style={tdStyle}>
                      {suppliersData?.suppliers?.find(
                        (s) => String(s.id) === String(ing.supplier_id),
                      )?.name ?? "No asignado"}
                    </td>
                    <td style={tdStyle}>
                      {editandoId === ing.id ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.4rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "0.4rem",
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "2px",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#9ca3af",
                                  fontWeight: "600",
                                }}
                              >
                                PRECIO
                              </span>
                              <input
                                type="number"
                                value={nuevoCosto}
                                onChange={(e) => setNuevoCosto(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  width: "80px",
                                  padding: "0.3rem 0.5rem",
                                  fontSize: "0.8rem",
                                }}
                                autoFocus
                              />
                            </div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.4rem",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "#6b7280",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Proveedor:
                            </span>
                            <select
                              value={nuevoProveedor}
                              onChange={(e) =>
                                setNuevoProveedor(e.target.value)
                              }
                              style={{
                                ...inputStyle,
                                padding: "0.3rem 0.5rem",
                                fontSize: "0.8rem",
                              }}
                            >
                              <option value="">Sin proveedor</option>
                              {suppliersData?.suppliers?.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.4rem",
                              flexWrap: "wrap",
                              marginBottom: "0.4rem",
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#6b7280",
                                }}
                              >
                                Unidad
                              </span>
                              <select
                                value={nuevoUnidad}
                                onChange={(e) => setNuevoUnidad(e.target.value)}
                                style={{
                                  ...inputStyle,
                                  padding: "0.3rem 0.5rem",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {UNIDADES.map((u) => (
                                  <option key={u} value={u}>
                                    {u}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div style={{ flex: 1 }}>
                              <span
                                style={{
                                  fontSize: "0.65rem",
                                  color: "#6b7280",
                                }}
                              >
                                Categoría
                              </span>
                              <select
                                value={nuevoCategoria}
                                onChange={(e) =>
                                  setNuevoCategoria(e.target.value)
                                }
                                style={{
                                  ...inputStyle,
                                  padding: "0.3rem 0.5rem",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {CATEGORIAS.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: "0.4rem" }}>
                            <button
                              onClick={async () => {
                                try {
                                  // Lógica de conversión si es necesario
                                  let costoFinal = parseFloat(nuevoCosto) || 0;

                                  // 1. Guardar costo y proveedor en la tabla de sobrecostos por país
                                  await upsertIngredientCost({
                                    variables: {
                                      input: {
                                        ingredient_id: parseInt(ing.id),
                                        location_id: locationId
                                          ? parseInt(locationId)
                                          : null,
                                        cost_per_unit: costoFinal,
                                        supplier_id: nuevoProveedor
                                          ? parseInt(nuevoProveedor)
                                          : null,
                                      },
                                    },
                                  });

                                  // 2. Si cambiaron unidad o categoría, actualizamos el registro base del ingrediente
                                  if (
                                    nuevoUnidad !== ing.unit ||
                                    nuevoCategoria !== ing.category
                                  ) {
                                    await updateIngredient({
                                      variables: {
                                        id: ing.id,
                                        input: {
                                          unit: nuevoUnidad,
                                          category: nuevoCategoria,
                                          location_id: locationId,
                                        },
                                      },
                                    });
                                  }

                                  setEditandoId(null);
                                } catch (e) {
                                  // El error ya lo manejan las mutaciones
                                }
                              }}
                              disabled={loadingUpdate || loadingUpsert}
                              style={{
                                ...btnPrimario,
                                padding: "0.3rem 0.6rem",
                                fontSize: "0.75rem",
                              }}
                            >
                              {loadingUpdate || loadingUpsert
                                ? "..."
                                : "✓ Guardar"}
                            </button>
                            <button
                              onClick={() => {
                                setEditandoId(null);
                                setNuevoCosto("");
                                setNuevoProveedor("");
                              }}
                              style={{
                                ...btnSecundario,
                                padding: "0.3rem 0.6rem",
                                fontSize: "0.75rem",
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditandoId(ing.id);
                            setNuevoCosto(ing.cost_per_unit ?? "");
                            setNuevoProveedor(ing.supplier_id ?? "");
                            setNuevoUnidad(ing.unit ?? "kg");
                            setNuevoCategoria(ing.category ?? "Otros");
                          }}
                          style={{
                            backgroundColor: "transparent",
                            border: "1px solid #d1d5db",
                            color: "#374151",
                            padding: "0.4rem 0.75rem",
                            borderRadius: "0.5rem",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.4rem",
                          }}
                          title="Haz clic para editar costo y proveedor"
                        >
                          ✏️ Editar
                        </button>
                      )}
                    </td>

                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        {isAdmin &&
                          (ing.is_active ? (
                            <button
                              onClick={() => handleDeactivate(ing.id, ing.name)}
                              style={{
                                backgroundColor: "transparent",
                                border: "1px solid #fecaca",
                                color: "#dc2626",
                                padding: "0.3rem 0.75rem",
                                borderRadius: "0.5rem",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                fontWeight: "500",
                              }}
                            >
                              Desactivar
                            </button>
                          ) : (
                            <button
                              onClick={() => handleActivate(ing.id)}
                              style={{
                                backgroundColor: "transparent",
                                border: "1px solid #86efac",
                                color: "#16a34a",
                                padding: "0.3rem 0.75rem",
                                borderRadius: "0.5rem",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                                fontWeight: "500",
                              }}
                            >
                              Activar
                            </button>
                          ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal */}
      {modalAbierto && (
        <ModalCrearIngrediente
          onClose={() => setModalAbierto(false)}
          onCreated={() => setModalAbierto(false)}
          suppliers={suppliersData?.suppliers ?? []}
          location_id={locationId}
        />
      )}
    </div>
  );
}

// ── Estilos reutilizables ───────────────────────────────────────
// Los definimos fuera del componente para no recrearlos en cada render

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

const formatCurrency = (val, country) => {
  const locale = country?.locale || "es-CO";
  const currency = country?.currencyCode || "COP";
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(val || 0);
  } catch (e) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(val || 0);
  }
};

const tdStyle = {
  padding: "1rem 1.25rem",
  fontSize: "0.875rem",
  color: "#374151",
};

export default Ingredients;
