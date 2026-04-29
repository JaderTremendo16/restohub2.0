import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_DISHES,
  GET_DISH_INGREDIENTS,
  GET_INGREDIENT_COSTS,
  CREATE_DISH,
  UPDATE_DISH,
  ACTIVATE_DISH,
  DEACTIVATE_DISH,
  GET_MENU_PRICES,
  UPSERT_INGREDIENT_COST,
  CREATE_MENU_PRICE,
  UPDATE_MENU_PRICE,
} from "../graphql/menu";
import { GET_INGREDIENTS } from "../graphql/ingredients";
import { GET_LOCATIONS, GET_COUNTRIES } from "../graphql/location";

const CATEGORIAS = ["entrada", "sopa", "principal", "postre", "bebida"];

// Cada categoría tiene un color distinto para el badge
const CATEGORIA_COLORES = {
  entrada: { bg: "#fef3c7", color: "#92400e" },
  sopa: { bg: "#fef3c7", color: "#4e8b32ff" },
  principal: { bg: "#dbeafe", color: "#1e40af" },
  postre: { bg: "#fce7f3", color: "#9d174d" },
  bebida: { bg: "#d1fae5", color: "#065f46" },
};

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
  const locale = country?.locale || 'es-CO';
  const currency = country?.currencyCode || 'COP';
  try {
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: currency,
      minimumFractionDigits: 0 
    }).format(val || 0);
  } catch (e) {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0 
    }).format(val || 0);
  }
};

// --- Utilidad de conversión ---
const calculateIngredientCost = (quantity, recipeUnit, baseUnit, costPerUnit) => {
  let q = parseFloat(quantity);
  const cost = parseFloat(costPerUnit || 0);
  
  if (!recipeUnit || !baseUnit) return q * cost;

  const rUnit = String(recipeUnit).toLowerCase();
  const bUnit = String(baseUnit).toLowerCase();

  // Si la receta pide gramos pero el ingrediente se compra en kg
  if (rUnit === "g" && bUnit === "kg") {
    q = q / 1000;
  } 
  // Si la receta pide kg pero el ingrediente se compra en gramos
  else if (rUnit === "kg" && bUnit === "g") {
    q = q * 1000;
  } 
  // Si la receta pide ml pero el ingrediente se compra en litros
  else if (rUnit === "ml" && (bUnit === "l" || bUnit === "litros")) {
    q = q / 1000;
  } 
  // Si la receta pide litros pero el ingrediente se compra en ml
  else if ((rUnit === "l" || rUnit === "litros") && bUnit === "ml") {
    q = q * 1000;
  }

  return q * cost;
};

// ── Modal crear/editar plato ────────────────────────────────────
// Recibe "dish" cuando es edición, o null cuando es creación
function ModalPlato({
  dish,
  onClose,
  onSaved,
  locationId,
  canEditDescription = false,
}) {
  const [form, setForm] = useState({
    name: dish?.name ?? "",
    description: dish?.description ?? "",
    category: dish?.category ?? "principal",
    location_id: dish?.location_id ?? locationId,
    image_url: dish?.image_url ?? "",
  });
  
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert("Faltan credenciales de Cloudinary en el archivo .env (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET)");
      return;
    }

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", uploadPreset);

    setUploadingImage(true);
    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: data,
      });
      const result = await res.json();
      if (result.secure_url) {
        setForm({ ...form, image_url: result.secure_url });
      } else {
        alert("Error al subir la imagen: " + (result.error?.message || "Desconocido"));
      }
    } catch (error) {
      alert("Error al subir la imagen: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const isEdit = !!dish?.id;
  const [createDish, { loading: creating }] = useMutation(CREATE_DISH, {
    refetchQueries: [
      { query: GET_DISHES, variables: { location_id: locationId } },
    ],
    onCompleted: () => onSaved(),
    onError: (e) => alert("Error al crear plato: " + e.message),
  });

  const [updateDish, { loading: updating }] = useMutation(UPDATE_DISH, {
    refetchQueries: [
      { query: GET_DISHES, variables: { location_id: locationId } },
    ],
    onCompleted: () => onSaved(),
    onError: (e) => alert("Error al editar plato: " + e.message),
  });

  const loading = creating || updating;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }

    const input = { ...form };

    if (isEdit) {
      updateDish({
        variables: { id: dish.id, input, location_id: locationId },
      });
    } else {
      createDish({
        variables: { input, location_id: locationId },
      });
    }
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
          {isEdit ? "Editar plato" : "Nuevo plato"}
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Ej: Bandeja Paisa"
              style={inputStyle}
            />
          </div>

          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.4rem",
              }}
            >
              <label style={labelStyle}>Descripción</label>
              {!canEditDescription && (
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: "700",
                    color: "#9a3412",
                    backgroundColor: "#ffedd5",
                    padding: "0.15rem 0.5rem",
                    borderRadius: "9999px",
                    letterSpacing: "0.02em",
                  }}
                >
                  🔒 Solo el Gerente puede editar
                </span>
              )}
            </div>
            <textarea
              name="description"
              value={form.description}
              onChange={canEditDescription ? handleChange : undefined}
              readOnly={!canEditDescription}
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                ...(canEditDescription
                  ? {}
                  : {
                      backgroundColor: "#f9fafb",
                      cursor: "not-allowed",
                      color: "#6b7280",
                    }),
              }}
            />
          </div>

          <div>
            <label style={labelStyle}>Imagen del plato (Opcional)</label>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              {form.image_url ? (
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <img 
                    src={form.image_url} 
                    alt="Preview" 
                    style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "0.5rem", border: "1px solid #e5e7eb" }} 
                  />
                  <button 
                    type="button"
                    onClick={() => setForm({ ...form, image_url: "" })}
                    style={{ position: "absolute", top: -8, right: -8, background: "#ef4444", color: "white", borderRadius: "50%", width: 24, height: 24, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", padding: 0 }}
                  >
                    ✕
                  </button>
                </div>
              ) : null}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
                disabled={uploadingImage}
                style={{
                  ...inputStyle,
                  flex: 1,
                  padding: "0.4rem",
                }}
              />
            </div>
            {uploadingImage && <p style={{ fontSize: "0.75rem", color: "#ea580c", marginTop: "0.4rem", margin: 0 }}>Subiendo imagen a la nube...</p>}
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
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
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
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
            {loading ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card de plato ───────────────────────────────────────────────
function DishCard({
  dish,
  onEdit,
  onDeactivate,
  onActivate,
  onCostos,
  locationId,
  canToggleStatus = false,
  country,
}) {
  const colores = CATEGORIA_COLORES[dish.category] ?? {
    bg: "#f3f4f6",
    color: "#374151",
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "1.25rem",
        padding: "1.5rem",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        opacity: dish.is_active ? 1 : 0.7,
        border: "1px solid #f1f5f9",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "default",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-6px)";
        e.currentTarget.style.boxShadow = "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)";
        e.currentTarget.style.borderColor = "#ea580c30";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0,0,0,0.05)";
        e.currentTarget.style.borderColor = "#f1f5f9";
      }}
    >
      {/* Fila superior: categoría + disponibilidad */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Badge de categoría */}
        <span
          style={{
            backgroundColor: colores.bg,
            color: colores.color,
            padding: "0.2rem 0.7rem",
            borderRadius: "9999px",
            fontSize: "0.72rem",
            fontWeight: "600",
            textTransform: "capitalize",
          }}
        >
          {dish.category}
        </span>

        {/* Badge de disponibilidad */}
        <span
          style={{
            backgroundColor: dish.is_active ? "#dcfce7" : "#f3f4f6",
            color: dish.is_active ? "#16a34a" : "#9ca3af",
            padding: "0.2rem 0.7rem",
            borderRadius: "9999px",
            fontSize: "0.72rem",
            fontWeight: "600",
          }}
        >
          {dish.is_active ? "Disponible" : "No disponible"}
        </span>
      </div>

      {/* Imagen del plato */}
      <div style={{
        height: "160px",
        borderRadius: "0.75rem",
        backgroundColor: "#f9fafb",
        backgroundImage: dish.image_url ? `url(${dish.image_url})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid #e5e7eb",
        marginTop: "-0.5rem" // Para acercarlo un poco a los badges
      }}>
        {!dish.image_url && <span style={{ color: "#9ca3af", fontSize: "0.875rem", fontWeight: "500" }}>Sin imagen</span>}
      </div>

      {/* Nombre del plato */}
      <h3
        style={{
          margin: 0,
          fontSize: "1rem",
          fontWeight: "700",
          color: "#1a1a2e",
        }}
      >
        {dish.name}
      </h3>

      {/* Descripción */}
      {dish.description && (
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "#6b7280",
            lineHeight: 1.5,
            // Limitar a 2 líneas si es muy largo
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {dish.description}
        </p>
      )}
      {/* Precio específico de la sede */}
      {(() => {
        // Buscamos el precio que coincida con la sede actual del administrador
        const precio = dish.prices?.find(
          (p) =>
            parseInt(p.restaurant_id) === locationId &&
            (!p.valid_until || new Date(p.valid_until) >= new Date()),
        );
        return precio ? (
          <div
            style={{
              padding: "0.75rem",
              backgroundColor: "#fff7ed",
              borderRadius: "0.75rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              border: "1px solid #ffedd5",
              marginTop: "0.5rem"
            }}
          >
            <span
              style={{ fontSize: "0.7rem", fontWeight: "800", color: "#9a3412", textTransform: "uppercase" }}
            >
              Precio Venta
            </span>
            <span
              style={{ fontSize: "1.125rem", fontWeight: "800", color: "#ea580c" }}
            >
              {formatCurrency(precio.price, country)}
            </span>
          </div>
        ) : (
          <div
            style={{
              fontSize: "0.75rem",
              color: "#94a3b8",
              fontStyle: "italic",
              textAlign: "center",
              padding: "0.75rem",
              backgroundColor: "#f8fafc",
              borderRadius: "0.75rem",
              border: "1px dashed #e2e8f0",
              marginTop: "0.5rem"
            }}
          >
            Sin precio asignado
          </div>
        );
      })()}
      {/* Botones de acción */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          marginTop: "0.5rem",
        }}
      >
        {/* Fila 1: Editar + Costos */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => onEdit(dish)}
            style={{
              flex: 1,
              padding: "0.5rem",
              backgroundColor: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: "500",
              cursor: "pointer",
              color: "#374151",
            }}
          >
            ✏️ Editar
          </button>
          <button
            onClick={() => onCostos(dish)}
            style={{
              flex: 1,
              padding: "0.5rem",
              backgroundColor: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              fontWeight: "500",
              cursor: "pointer",
              color: "#92400e",
            }}
          >
            💰 Costos
          </button>
        </div>

        {/* Fila 2: Desactivar / Activar — ancho completo */}
        {canToggleStatus &&
          (dish.is_active ? (
            <button
              onClick={() => onDeactivate(dish)}
              style={{
                width: "100%",
                padding: "0.5rem",
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "0.5rem",
                fontSize: "0.8rem",
                fontWeight: "500",
                cursor: "pointer",
                color: "#dc2626",
              }}
            >
              Desactivar
            </button>
          ) : (
            <button
              onClick={() => onActivate(dish)}
              style={{
                width: "100%",
                padding: "0.5rem",
                backgroundColor: "#f0fdf4",
                border: "1px solid #86efac",
                borderRadius: "0.5rem",
                fontSize: "0.8rem",
                fontWeight: "500",
                cursor: "pointer",
                color: "#16a34a",
              }}
            >
              Activar
            </button>
          ))}
      </div>
    </div>
  );
}

function PanelCostos({ dish, locationId, country, onClose }) {
  const [margen, setMargen] = useState(30);
  const [costos, setCostos] = useState({});
  const [editando, setEditando] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [editForm, setEditForm] = useState({
    name: dish.name,
    category: dish.category,
  });

  const { data: dataIngredientes, loading: l1 } = useQuery(
    GET_DISH_INGREDIENTS,
    {
      variables: { dish_id: dish.id },
    },
  );

  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: countriesData } = useQuery(GET_COUNTRIES);

  const sedeActual = locationsData?.locations?.find(
    (l) => String(l.id) === String(locationId),
  );
  const paisActual = countriesData?.countries?.find(
    (c) => String(c.id) === String(sedeActual?.countryId),
  );

  const { data: dataTodosIngredientes, loading: l3 } = useQuery(GET_INGREDIENTS, {
    variables: { 
      location_id: locationId,
      country_id: paisActual?.id ? parseInt(paisActual.id) : undefined
    },
    skip: !locationId,
  });

  const { data: dataCostosSede, loading: l4 } = useQuery(GET_INGREDIENT_COSTS, {
    variables: { 
        location_id: parseInt(locationId),
        country_id: paisActual?.id ? parseInt(paisActual.id) : undefined
    },
    skip: !locationId,
  });

  const ingredientesCatalogo = dataTodosIngredientes?.ingredients || [];

  useEffect(() => {
    if (!initialized && !l1 && !l3 && !l4) {
      const inicial = {};
      const catalog = dataTodosIngredientes?.ingredients || [];
      const dishIngs = dataIngredientes?.DishIngredients || [];
      const sedeCosts = dataCostosSede?.ingredientCosts || [];

      console.log("=== INICIALIZANDO INFO (CATÁLOGO + COSTOS SEDE) ===");

      dishIngs.forEach((ing) => {
        // Encontramos el ingrediente en el catálogo general
        const catIng = catalog.find(
          (c) => String(c.id) === String(ing.ingredient_id),
        );

        // Prioridad 1: Costo específico de esta sede si existe en la tabla de sobrecostos
        const localCost = sedeCosts.find(c => String(c.ingredient_id) === String(ing.ingredient_id));
        
        if (localCost) {
            inicial[ing.ingredient_id] = localCost.cost_per_unit;
        } else {
            // Prioridad 2: Costo base en la tabla de ingredientes
            inicial[ing.ingredient_id] = catIng ? catIng.cost_per_unit : 0;
        }
      });

      console.log("Valores iniciales calculados:", inicial);
      setCostos(inicial);
      setInitialized(true);
    }
  }, [initialized, l1, l3, l4, dataIngredientes, dataTodosIngredientes, dataCostosSede]);

  const { data: dataPrecio, refetch: refetchPrecio } = useQuery(
    GET_MENU_PRICES,
    {
      variables: { dish_id: dish.id },
    },
  );

  const [upsertCosto, { loading: guardando }] = useMutation(
    UPSERT_INGREDIENT_COST,
    {
      refetchQueries: [
        { query: GET_INGREDIENT_COSTS, variables: { location_id: locationId } },
      ],
    },
  );
  const [updateMenuPrice] = useMutation(UPDATE_MENU_PRICE, {
    // Esto obliga a Apollo a pedir la lista de platos de nuevo al servidor
    refetchQueries: [
      { query: GET_DISHES, variables: { location_id: locationId } },
    ],
    awaitRefetchQueries: true, // Espera a que termine el refetch antes de dar por cerrada la mutación
  });

  const [createMenuPrice] = useMutation(CREATE_MENU_PRICE, {
    refetchQueries: [
      { query: GET_DISHES, variables: { location_id: locationId } },
    ],
    awaitRefetchQueries: true,
  });

  const [updateDish, { loading: loadingUpdate }] = useMutation(UPDATE_DISH, {
    refetchQueries: [
      { query: GET_DISHES, variables: { location_id: locationId } },
    ],
    onCompleted: () => setEditando(false),
    onError: (e) => alert("Error: " + e.message),
  });

  const ingredientes = dataIngredientes?.DishIngredients ?? [];

  const costoTotal = ingredientes.reduce((acc, ing) => {
    const catIng = ingredientesCatalogo.find(c => String(c.id) === String(ing.ingredient_id));
    if (catIng && !catIng.is_active) return acc; // No sumar costo si está desactivado

    const costPerUnit = parseFloat(costos[ing.ingredient_id] ?? 0);
    return acc + calculateIngredientCost(ing.quantity, ing.unit, catIng?.unit, costPerUnit);
  }, 0);

  const precioSugerido = costoTotal * (1 + margen / 100);

  const handleGuardar = async () => {
    try {
      // CALCULO "ON THE FLY" (No depende del estado 'precio' que puede estar desfasado)
      const costoTotalActual = ingredientes.reduce((acc, ing) => {
        const catIng = ingredientesCatalogo.find(c => String(c.id) === String(ing.ingredient_id));
        if (catIng && !catIng.is_active) return acc; // No sumar costo si está desactivado

        const costPerUnit = parseFloat(costos[ing.ingredient_id] || 0);
        return acc + calculateIngredientCost(ing.quantity, ing.unit, catIng?.unit, costPerUnit);
      }, 0);

      const nuevoPrecio = parseFloat(
        (costoTotalActual * (1 + margen / 100)).toFixed(2),
      );

      console.log(`Guardando para sede ID: ${locationId}, Plato: ${dish.id}`);

      // Se deshabilitó el guardado específico de sobrecostos por sede para
      // reflejar estrictamente los valores dinámicos del catálogo general.

      // 1. Resolver o Crear registro de precio (en menu-service)
      const { data } = await refetchPrecio();
      const registroExistente = data?.menuPrices?.find(
        (p) => parseInt(p.restaurant_id) === parseInt(locationId),
      );

      const inputPrecio = {
        price: nuevoPrecio,
        profit_margin: parseFloat(margen),
        valid_from: new Date().toISOString().split("T")[0],
      };

      if (registroExistente) {
        await updateMenuPrice({
          variables: { id: registroExistente.id, input: inputPrecio },
          refetchQueries: [
            { query: GET_DISHES, variables: { location_id: locationId } },
          ],
        });
      } else {
        await createMenuPrice({
          variables: {
            input: {
              ...inputPrecio,
              dish_id: parseInt(dish.id),
              restaurant_id: parseInt(locationId),
            },
          },
          refetchQueries: [
            { query: GET_DISHES, variables: { location_id: locationId } },
          ],
        });
      }

      alert(`¡Guardado! El precio para esta sede es ahora ${nuevoPrecio}`);
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Hubo un error al guardar: " + error.message);
    }
  };

  const colores = CATEGORIA_COLORES[dish.category] ?? {
    bg: "#f3f4f6",
    color: "#374151",
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.3)",
          zIndex: 40,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "420px",
          backgroundColor: "white",
          boxShadow: "-4px 0 20px rgba(0,0,0,0.1)",
          zIndex: 41,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          padding: "2rem",
        }}
      >
        {/* Alerta de disponibilidad */}
        {(dish.is_active === false || dataIngredientes?.DishIngredients?.some(ing => {
          const catalogIng = ingredientesCatalogo.find(c => String(c.id) === String(ing.ingredient_id));
          return catalogIng && catalogIng.is_active === false;
        })) && (
          <div style={{ 
            backgroundColor: "#fff7ed", 
            border: "1px solid #ffedd5", 
            borderRadius: "0.75rem", 
            padding: "1rem", 
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
            <span style={{ fontSize: "1.2rem" }}>⚠️</span>
            <div>
              <p style={{ margin: 0, fontWeight: "700", color: "#9a3412", fontSize: "0.85rem" }}>
                PLATO NO DISPONIBLE
              </p>
              <p style={{ margin: 0, color: "#c2410c", fontSize: "0.78rem", lineHeight: "1.3" }}>
                {dish.is_active === false 
                  ? "El plato está desactivado." 
                  : "Tiene uno o más ingredientes INACTIVOS."}
              </p>
            </div>
          </div>
        )}
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <span
              style={{
                backgroundColor: colores.bg,
                color: colores.color,
                padding: "0.2rem 0.7rem",
                borderRadius: "9999px",
                fontSize: "0.72rem",
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {dish.category}
            </span>
            <h2
              style={{
                margin: "0.5rem 0 0 0",
                fontSize: "1.25rem",
                fontWeight: "700",
                color: "#1a1a2e",
              }}
            >
              {dish.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.25rem",
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            ✕
          </button>
        </div>

        {/* Bloque: Información básica */}
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "0.75rem",
            padding: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: editando ? "1rem" : 0,
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: "600",
                fontSize: "0.875rem",
                color: "#1a1a2e",
              }}
            >
              Información básica
            </p>
            <button
              onClick={() => setEditando(!editando)}
              style={{
                ...btnSecundario,
                padding: "0.3rem 0.75rem",
                fontSize: "0.75rem",
              }}
            >
              {editando ? "Cancelar" : "✏️ Editar"}
            </button>
          </div>

          {editando ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div>
                <label style={labelStyle}>Nombre</label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Categoría</label>
                <select
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value })
                  }
                  style={inputStyle}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() =>
                  updateDish({ variables: { id: dish.id, input: editForm } })
                }
                disabled={loadingUpdate}
                style={btnPrimario}
              >
                {loadingUpdate ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          ) : (
            <p
              style={{
                margin: "0.5rem 0 0 0",
                fontSize: "0.8rem",
                color: "#6b7280",
              }}
            >
              {dish.description || "Sin descripción"}
            </p>
          )}
        </div>

        {/* Bloque: Costos */}
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "0.75rem",
            padding: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.75rem 0",
              fontWeight: "600",
              fontSize: "0.875rem",
              color: "#1a1a2e",
            }}
          >
            Costos por ingrediente
          </p>

          {ingredientes.length === 0 ? (
            <p style={{ fontSize: "0.8rem", color: "#9ca3af" }}>
              Este plato no tiene ingredientes registrados.
            </p>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {ingredientes.map((ing) => {
                const pricePerBase = parseFloat(costos[ing.ingredient_id] || 0);
                const catIng = dataTodosIngredientes?.ingredients?.find(i => String(i.id) === String(ing.ingredient_id));
                const subtotal = (catIng && !catIng.is_active) ? 0 : calculateIngredientCost(ing.quantity, ing.unit, catIng?.unit, pricePerBase);
                
                return (
                  <div
                    key={ing.id}
                    style={{
                      padding: "1rem",
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.75rem",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {dataTodosIngredientes?.ingredients?.find(
                            (i) => String(i.id) === String(ing.ingredient_id),
                          )?.name || "Ingrediente"}
                          {(() => {
                            const catIng = dataTodosIngredientes?.ingredients?.find(
                              (i) => String(i.id) === String(ing.ingredient_id)
                            );
                          
                            if (catIng && !catIng.is_active) {
                              return (
                                <span style={{
                                  fontSize: "0.6rem",
                                  backgroundColor: "#fee2e2",
                                  color: "#dc2626",
                                  padding: "0.1rem 0.4rem",
                                  borderRadius: "0.4rem",
                                  fontWeight: "700"
                                }}>
                                  INACTIVO
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span
                            style={{
                              fontSize: "0.875rem",
                              color: "#6b7280",
                            }}
                          >
                            {ing.quantity} {ing.unit}
                          </span>
                        </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Costo / {catIng?.unit || ing.unit} ({paisActual?.currencySymbol || "$"})
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={pricePerBase.toFixed(2)}
                        readOnly
                        style={{
                          ...inputStyle,
                          padding: "0.3rem 0.5rem",
                          fontSize: "0.8rem",
                          backgroundColor: "#f9fafb",
                          color: "#6b7280",
                          cursor: "not-allowed",
                        }}
                      />
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: subtotal > 0 ? "#1e40af" : "#6b7280",
                        textAlign: "right",
                        marginTop: "0.4rem"
                      }}
                    >
                      Subtotal: <strong>{formatCurrency(subtotal, paisActual)}</strong>
                    </p>
                  </div>
                );
              })}
            </div>
            
          )}
        </div>

        {/* Bloque: Resumen y precio */}
        <div
          style={{
            backgroundColor: "#f9fafb",
            borderRadius: "0.75rem",
            padding: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <p
            style={{
              margin: "0 0 0.75rem 0",
              fontWeight: "600",
              fontSize: "0.875rem",
              color: "#1a1a2e",
            }}
          >
            Precio
          </p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.875rem",
                color: "#374151",
              }}
            >
              <span>Costo total</span>
              <strong>{formatCurrency(costoTotal, paisActual)}</strong>
            </div>
            <div
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "#6b7280",
                  whiteSpace: "nowrap",
                }}
              >
                Margen de ganancia
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={margen}
                onChange={(e) => setMargen(parseFloat(e.target.value) || 0)}
                style={{
                  ...inputStyle,
                  width: "64px",
                  padding: "0.3rem 0.5rem",
                  fontSize: "0.8rem",
                }}
              />
              <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>%</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.875rem",
              }}
            >
              <span style={{ color: "#6b7280" }}>Precio sugerido</span>
              <strong style={{ color: "#16a34a" }}>
                {formatCurrency(precioSugerido, paisActual)}
              </strong>
            </div>
          </div>
        </div>

        {/* Botón guardar */}
        <button
          onClick={handleGuardar}
          disabled={guardando}
          style={{ ...btnPrimario, width: "100%", padding: "0.75rem" }}
        >
          {guardando ? "Guardando..." : "Guardar costos y precio"}
        </button>
      </div>
    </>
  );
}

// ── Página principal ────────────────────────────────────────────
function Menu() {
  const { user, isGerenteGeneral, isAdmin } = useAuth();
  const locationId = user?.locationId ? parseInt(user.locationId) : null;
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);
  const [dishCostos, setDishCostos] = useState(null);

  // dishEditando es null cuando creamos, o el objeto del plato cuando editamos
  const [dishEditando, setDishEditando] = useState(null);

  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: countriesData } = useQuery(GET_COUNTRIES);

  const sedeActual = locationsData?.locations?.find(
    (l) => String(l.id) === String(locationId),
  );
  const paisActual = countriesData?.countries?.find(
    (c) => String(c.id) === String(sedeActual?.countryId),
  );

  const { data, loading, error } = useQuery(GET_DISHES, {
    variables: { location_id: locationId },
    fetchPolicy: "network-only",
  });

  const [activateDish] = useMutation(ACTIVATE_DISH, {
    refetchQueries: [
      { query: GET_DISHES, variables: { location_id: locationId } },
    ],
    onCompleted: () => alert("Plato activado con éxito"),
    onError: (e) => alert("Error al activar: " + e.message),
  });

  const handleActivate = (dish) => {
    activateDish({ variables: { id: dish.id, location_id: locationId } });
  };
  const [deactivateDish] = useMutation(DEACTIVATE_DISH, {
    refetchQueries: [
      { query: GET_DISHES, variables: { location_id: locationId } },
    ],
    onCompleted: () => alert("Plato desactivado con éxito"),
    onError: (e) => alert("Error al desactivar: " + e.message),
  });

  const handleDeactivate = (dish) => {
    if (window.confirm(`¿Desactivar "${dish.name}"?`)) {
      deactivateDish({ variables: { id: dish.id, location_id: locationId } });
    }
  };

  const handleEdit = (dish) => {
    setDishEditando(dish);
    setModalAbierto(true);
  };

  const dishesFiltrados =
    data?.dishes?.filter((d) =>
      categoriaFiltro ? d.category === categoriaFiltro : true,
    ) ?? [];

  return (
    <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start" }}>
      {/* Columna principal */}
      <div style={{ flex: 1, minWidth: 0 }}>
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
              Menú
            </h2>
            <p
              style={{
                margin: "0.25rem 0 0 0",
                color: "#6b7280",
                fontSize: "0.875rem",
              }}
            >
              {dishesFiltrados.length} plato
              {dishesFiltrados.length !== 1 ? "s" : ""} encontrado
              {dishesFiltrados.length !== 1 ? "s" : ""}
            </p>
          </div>

          {isGerenteGeneral && (
            <button
              onClick={() => {
                setDishEditando(null);
                setModalAbierto(true);
              }}
              style={{
                ...btnPrimario,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: "0 4px 12px rgba(234, 88, 12, 0.2)",
              }}
            >
              <span>+</span> Nuevo plato
            </button>
          )}
        </div>

        {/* Filtro por categoría */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setCategoriaFiltro("")}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: "9999px",
              border: "none",
              fontSize: "0.8rem",
              fontWeight: "600",
              cursor: "pointer",
              backgroundColor: categoriaFiltro === "" ? "#ea580c" : "#e5e7eb",
              color: categoriaFiltro === "" ? "white" : "#374151",
            }}
          >
            Todos
          </button>
          {CATEGORIAS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaFiltro(cat)}
              style={{
                padding: "0.4rem 1rem",
                borderRadius: "9999px",
                border: "none",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                textTransform: "capitalize",
                backgroundColor:
                  categoriaFiltro === cat ? "#ea580c" : "#e5e7eb",
                color: categoriaFiltro === cat ? "white" : "#374151",
              }}
            >
              {cat}
            </button>
          ))}
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
            ⚠️ Error al cargar platos: {error.message}
          </div>
        )}

        {/* Skeletons */}
        {loading && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  height: "12rem",
                  backgroundColor: "white",
                  borderRadius: "1rem",
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
          </div>
        )}

        {/* Grid de platos */}
        {!loading &&
          !error &&
          (dishesFiltrados.length === 0 ? (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "1rem",
                padding: "3rem",
                textAlign: "center",
                color: "#9ca3af",
              }}
            >
              <p style={{ fontSize: "2rem", margin: "0 0 0.5rem 0" }}>🍽️</p>
              <p style={{ margin: 0 }}>No hay platos registrados aún.</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1rem",
              }}
            >
              {dishesFiltrados.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  onEdit={handleEdit}
                  onDeactivate={handleDeactivate}
                  onActivate={handleActivate}
                  onCostos={(d) => setDishCostos(d)}
                  locationId={locationId}
                  canToggleStatus={isAdmin}
                  country={paisActual}
                />
              ))}
            </div>
          ))}

        {/* Modal */}
        {modalAbierto && locationId && (
          <ModalPlato
            dish={dishEditando}
            onClose={() => setModalAbierto(false)}
            onSaved={() => setModalAbierto(false)}
            locationId={locationId}
            canEditDescription={isGerenteGeneral}
          />
        )}
      </div>

      {/* Panel lateral */}
      {dishCostos && locationId && (
        <PanelCostos
          dish={dishCostos}
          locationId={locationId}
          country={paisActual}
          onClose={() => setDishCostos(null)}
        />
      )}
    </div>
  );
}

export default Menu;
