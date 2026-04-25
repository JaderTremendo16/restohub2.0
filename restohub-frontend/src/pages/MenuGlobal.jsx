import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_DISHES,
  CREATE_DISH,
  UPDATE_DISH,
  ACTIVATE_DISH,
  DEACTIVATE_DISH,
  ADD_DISH_INGREDIENT,
  REMOVE_DISH_INGREDIENT,
  UPDATE_DISH_INGREDIENT,
  CREATE_MENU_PRICE,
  UPDATE_MENU_PRICE,
  GET_DISH_INGREDIENTS,
  GET_MENU_PRICES,
} from "../graphql/menu";
import { GET_INGREDIENTS, CREATE_INGREDIENT } from "../graphql/ingredients";
import { GET_INGREDIENT_COSTS } from "../graphql/menu";
import { useAuth } from "../context/AuthContext";
import { Search, ShoppingBag, Calculator, Info } from "lucide-react";

const CATEGORIAS = ["entrada", "sopa", "principal", "postre", "bebida"];
const UNIDADES = ["kg", "g", "l", "ml", "unidad"];

const calculateIngredientCost = (quantity, unit, costPerBaseUnit) => {
  const q = parseFloat(quantity);
  const cost = parseFloat(costPerBaseUnit);
  if (isNaN(q) || isNaN(cost)) return 0;

  if (unit === "g" || unit === "ml") {
    return (q / 1000) * cost;
  }
  return q * cost;
};

const CATEGORIA_COLORES = {
  entrada: { bg: "#fef3c7", color: "#92400e" },
  sopa: { bg: "#dcfce7", color: "#166534" },
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
  boxSizing: "border-box",
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

const formatCurrency = (val) => {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(val || 0);
};

// ── Modal crear plato ───────────────────────────────────────────
function ModalNuevoPlato({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "principal",
    image_url: "",
  });

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      alert(
        "Faltan credenciales de Cloudinary en el archivo .env (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET)",
      );
      return;
    }

    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", uploadPreset);

    setUploadingImage(true);
    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: data,
        },
      );
      const result = await res.json();
      if (result.secure_url) {
        setForm({ ...form, image_url: result.secure_url });
      } else {
        alert(
          "Error al subir la imagen: " +
            (result.error?.message || "Desconocido"),
        );
      }
    } catch (error) {
      alert("Error al subir la imagen: " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const [createDish, { loading }] = useMutation(CREATE_DISH, {
    refetchQueries: [{ query: GET_DISHES }],
    onCompleted: (data) => onCreated(data.createDish),
    onError: (e) => alert("Error al crear plato: " + e.message),
  });

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    createDish({ variables: { input: { ...form } } });
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
          Nuevo plato
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Nombre *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej: Bandeja Paisa"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Descripción</label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Descripción del plato..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
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
                    style={{
                      width: "64px",
                      height: "64px",
                      objectFit: "cover",
                      borderRadius: "0.5rem",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, image_url: "" })}
                    style={{
                      position: "absolute",
                      top: -8,
                      right: -8,
                      background: "#ef4444",
                      color: "white",
                      borderRadius: "50%",
                      width: 24,
                      height: 24,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.8rem",
                      padding: 0,
                    }}
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
            {uploadingImage && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#ea580c",
                  marginTop: "0.4rem",
                  margin: 0,
                }}
              >
                Subiendo imagen a la nube...
              </p>
            )}
          </div>
          <div>
            <label style={labelStyle}>Categoría</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
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
            {loading ? "Creando..." : "Crear plato"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Panel lateral de detalle ────────────────────────────────────
function PanelDetalle({
  dish,
  ingredients,
  onClose,
  onUpdated,
  refetchIngredients,
  isGerenteGeneral,
}) {
  const { user } = useAuth();
  const CATEGORIAS_ING = [
    "Frutas",
    "Verduras",
    "Proteinas",
    "Lacteos",
    "Cereales",
    "Bebidas",
    "Otros",
  ];
  const [editando, setEditando] = useState(false);
  const [editForm, setEditForm] = useState({
    name: dish.name,
    description: dish.description ?? "",
    category: dish.category,
  });

  const [ingForm, setIngForm] = useState({
    nombre: "",
    category: "Otros",
    quantity: "",
    unit: "kg",
  });

  const [precioForm, setPrecioForm] = useState({
    price: "",
    valid_from: new Date().toISOString().split("T")[0],
  });

  const [removeIngredient] = useMutation(REMOVE_DISH_INGREDIENT, {
    refetchQueries: [
      { query: GET_DISH_INGREDIENTS, variables: { dish_id: dish.id } },
    ],
    awaitRefetchQueries: true,
  });

  const [updateIngredient] = useMutation(UPDATE_DISH_INGREDIENT, {
    refetchQueries: [
      { query: GET_DISH_INGREDIENTS, variables: { dish_id: dish.id } },
    ],
    awaitRefetchQueries: true,
  });

  const [editIngId, setEditIngId] = useState(null);
  const [editIngVal, setEditIngVal] = useState("");

  // Traemos ingredientes y precios del plato
  const { data: ingData, refetch: refetchIngs } = useQuery(
    GET_DISH_INGREDIENTS,
    {
      variables: { dish_id: dish.id },
    },
  );

  const { data: costsData } = useQuery(GET_INGREDIENT_COSTS, {
    variables: { location_id: parseInt(user?.locationId) },
    skip: !user?.locationId,
  });

  const { data: preciosData, refetch: refetchPrecios } = useQuery(
    GET_MENU_PRICES,
    {
      variables: { dish_id: dish.id },
    },
  );

  const [updateDish, { loading: loadingUpdate }] = useMutation(UPDATE_DISH, {
    refetchQueries: [{ query: GET_DISHES }],
    onCompleted: () => {
      setEditando(false);
      onUpdated();
    },
    onError: (e) => alert("Error: " + e.message),
  });

  const [deactivateDish] = useMutation(DEACTIVATE_DISH, {
    refetchQueries: [{ query: GET_DISHES }],
    onCompleted: () => onClose(),
    onError: (e) => alert("Error: " + e.message),
  });

  const [activateDish] = useMutation(ACTIVATE_DISH, {
    refetchQueries: [{ query: GET_DISHES }],
    onCompleted: () => onUpdated(),
    onError: (e) => alert("Error: " + e.message),
  });

  const [createIngredient, { loading: loadingCrearIng }] = useMutation(
    CREATE_INGREDIENT,
    {
      onError: (e) => alert("Error al crear ingrediente: " + e.message),
    },
  );

  const [addIngredient, { loading: loadingIng }] = useMutation(
    ADD_DISH_INGREDIENT,
    {
      refetchQueries: [
        { query: GET_DISH_INGREDIENTS, variables: { dish_id: dish.id } },
      ],
      awaitRefetchQueries: true,
      onCompleted: () => refetchIngs(),
      onError: (e) => alert("Error al asignar ingrediente: " + e.message),
    },
  );

  const [createPrice, { loading: loadingPrecio }] = useMutation(
    CREATE_MENU_PRICE,
    {
      onCompleted: () => {
        refetchPrecios();
        setPrecioForm({
          price: "",
          valid_from: new Date().toISOString().split("T")[0],
        });
      },
      onError: (e) => alert("Error: " + e.message),
    },
  );

  const [updatePrice, { loading: loadingUpdatePrecio }] = useMutation(
    UPDATE_MENU_PRICE,
    {
      onCompleted: () => refetchPrecios(),
      onError: (e) => alert("Error: " + e.message),
    },
  );

  const handleGuardarEdicion = () => {
    if (!editForm.name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    updateDish({ variables: { id: dish.id, input: { ...editForm } } });
  };

  const handleAgregarIngrediente = async () => {
    if (!ingForm.nombre.trim() || !ingForm.quantity) {
      alert("El nombre y la cantidad son obligatorios");
      return;
    }

    try {
      let ingredienteId;

      // Busca si ya existe un ingrediente con ese nombre
      const existente = ingredients?.find(
        (i) =>
          i.name.toLowerCase().trim() === ingForm.nombre.toLowerCase().trim(),
      );

      if (existente) {
        // Reutiliza el existente
        ingredienteId = existente.id;
      } else {
        // Crea uno nuevo
        const { data } = await createIngredient({
          variables: {
            input: {
              name:
                ingForm.nombre.trim().charAt(0).toUpperCase() +
                ingForm.nombre.trim().slice(1),
              unit: ingForm.unit,
              category: ingForm.category,
              cost_per_unit: 0,
            },
          },
        });
        ingredienteId = data.createIngredient.id;
        await refetchIngredients();
      }

      // Asigna al plato
      await addIngredient({
        variables: {
          input: {
            dish_id: parseInt(dish.id),
            ingredient_id: parseInt(ingredienteId),
            quantity: parseFloat(ingForm.quantity),
            unit: ingForm.unit,
          },
        },
      });

      setIngForm({ nombre: "", category: "Otros", quantity: "", unit: "kg" });
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const handleGuardarPrecio = () => {
    if (!precioForm.price) {
      alert("El precio es obligatorio");
      return;
    }

    // Buscamos el precio específico de ESTA sede
    const precioLocal = preciosData?.menuPrices?.find(
      (p) => String(p.restaurant_id) === String(user?.locationId),
    );

    if (precioLocal) {
      updatePrice({
        variables: {
          id: precioLocal.id,
          input: { price: parseFloat(precioForm.price) },
        },
      });
    } else {
      createPrice({
        variables: {
          input: {
            dish_id: parseInt(dish.id),
            restaurant_id: parseInt(user?.locationId),
            price: parseFloat(precioForm.price),
            valid_from: precioForm.valid_from,
            valid_until: null,
            profit_margin: 0, // Se calcularía dinámicamente si se desea
          },
        },
      });
    }
  };

  const precioActual = preciosData?.menuPrices?.find(
    (p) => String(p.restaurant_id) === String(user?.locationId),
  );

  const nombreIngrediente = (id) => {
    return (
      ingredients?.find((i) => String(i.id) === String(id))?.name ?? `#${id}`
    );
  };

  const colores = CATEGORIA_COLORES[dish.category] ?? {
    bg: "#f3f4f6",
    color: "#374151",
  };

  return (
    <>
      {/* Fondo */}
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
        {/* Header del panel */}
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

        {/* --- Costeo Automático --- */}
        <div
          style={{
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "1rem",
            borderRadius: "1rem",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <Calculator size={18} color="#1e40af" />
            <p
              style={{
                margin: 0,
                fontWeight: "800",
                fontSize: "0.85rem",
                color: "#1e40af",
                textTransform: "uppercase",
              }}
            >
              Costeo Automático
            </p>
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            {ingData?.DishIngredients?.map((ing) => {
              const localIngredient = ingredients?.find(
                (i) => String(i.id) === String(ing.ingredient_id),
              );
              const costItem = costsData?.ingredientCosts?.find(
                (c) => String(c.ingredient_id) === String(ing.ingredient_id),
              );
              const cost = costItem
                ? calculateIngredientCost(
                    ing.quantity,
                    ing.unit,
                    costItem.cost_per_unit,
                  )
                : 0;

              return (
                <div
                  key={ing.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.75rem",
                    color: "#1e3a8a",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: "600" }}>
                      {localIngredient?.name || "..."}
                    </span>
                    <span style={{ fontSize: "0.65rem", color: "#60a5fa" }}>
                      {ing.unit === "g" || ing.unit === "ml"
                        ? `(${ing.quantity} / 1000) x $${(costItem?.cost_per_unit || 0).toFixed(2)}`
                        : `${ing.quantity} x $${(costItem?.cost_per_unit || 0).toFixed(2)}`}
                    </span>
                  </div>
                  <span style={{ fontWeight: "700" }}>
                    {formatCurrency(cost)}
                  </span>
                </div>
              );
            })}
            {(() => {
              const total =
                ingData?.DishIngredients?.reduce((sum, ing) => {
                  const costItem = costsData?.ingredientCosts?.find(
                    (c) =>
                      String(c.ingredient_id) === String(ing.ingredient_id),
                  );
                  return (
                    sum +
                    (costItem
                      ? calculateIngredientCost(
                          ing.quantity,
                          ing.unit,
                          costItem.cost_per_unit,
                        )
                      : 0)
                  );
                }, 0) || 0;

              return (
                <div
                  style={{
                    marginTop: "0.5rem",
                    paddingTop: "0.5rem",
                    borderTop: "1px dashed #bfdbfe",
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: "800",
                    color: "#1e3a8a",
                  }}
                >
                  <span>Costo de Producción</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              );
            })()}
          </div>
          <p
            style={{
              margin: "0.5rem 0 0 0",
              fontSize: "0.65rem",
              color: "#60a5fa",
            }}
          >
            Calculado automáticamente usando los gramajes del Gerente y tus
            precios de inventario.
          </p>
        </div>

        {/* ── Editar datos básicos ── */}
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
            {!dish.location_id && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  background: "#fef3c7",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "0.5rem",
                }}
              >
                <Info size={12} color="#92400e" />
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: "700",
                    color: "#92400e",
                  }}
                >
                  RECETA
                </span>
              </div>
            )}
            {isGerenteGeneral && (
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
            )}
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
                <label style={labelStyle}>Descripción</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  rows={2}
                  style={{ ...inputStyle, resize: "vertical" }}
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
                onClick={handleGuardarEdicion}
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

        {/* ── Ingredientes ── */}
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
            Ingredientes
          </p>

          {/* Lista actual */}
          {ingData?.DishIngredients?.length > 0 ? (
            <div
              style={{
                marginBottom: "0.875rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
              }}
            >
              {ingData.DishIngredients.map((ing) => (
                <div
                  key={ing.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "white",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.5rem",
                    border: "1px solid #e5e7eb",
                    fontSize: "0.8rem",
                    color: "#374151",
                  }}
                >
                  <span>{nombreIngrediente(String(ing.ingredient_id))}</span>
                  {isGerenteGeneral && editIngId === ing.id ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <input
                        type="number"
                        step="any"
                        value={editIngVal}
                        onChange={(e) => setEditIngVal(e.target.value)}
                        style={{
                          ...inputStyle,
                          width: "70px",
                          padding: "0.2rem 0.4rem",
                        }}
                        autoFocus
                      />
                      <span style={{ fontSize: "0.7rem", color: "#6b7280" }}>
                        {ing.unit}
                      </span>
                      <button
                        onClick={() => {
                          updateIngredient({
                            variables: {
                              id: ing.id,
                              quantity: parseFloat(editIngVal),
                              unit: ing.unit,
                            },
                          });
                          setEditIngId(null);
                        }}
                        style={{
                          ...btnPrimario,
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.7rem",
                          minWidth: "30px",
                        }}
                      >
                        💾
                      </button>
                      <button
                        onClick={() => setEditIngId(null)}
                        style={{
                          ...btnSecundario,
                          padding: "0.2rem 0.5rem",
                          fontSize: "0.7rem",
                          minWidth: "30px",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <span style={{ color: "#6b7280" }}>
                        {ing.quantity} {ing.unit}
                      </span>
                      {isGerenteGeneral && (
                        <div style={{ display: "flex", gap: "0.4rem" }}>
                          <button
                            onClick={() => {
                              setEditIngId(ing.id);
                              setEditIngVal(String(ing.quantity));
                            }}
                            style={{
                              border: "none",
                              background: "none",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              opacity: 0.6,
                            }}
                            title="Editar gramaje"
                            onMouseEnter={(e) => (e.target.style.opacity = 1)}
                            onMouseLeave={(e) => (e.target.style.opacity = 0.6)}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() =>
                              removeIngredient({ variables: { id: ing.id } })
                            }
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc2626",
                              cursor: "pointer",
                              fontSize: "0.85rem",
                              padding: 0,
                              opacity: 0.6,
                            }}
                            onMouseEnter={(e) => (e.target.style.opacity = 1)}
                            onMouseLeave={(e) => (e.target.style.opacity = 0.6)}
                            title="Quitar ingrediente"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p
              style={{
                fontSize: "0.8rem",
                color: "#9ca3af",
                margin: "0 0 0.875rem 0",
              }}
            >
              Sin ingredientes asignados aún.
            </p>
          )}

          {/* Agregar ingrediente - Solo Gerente */}
          {isGerenteGeneral && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  value={ingForm.nombre}
                  onChange={(e) =>
                    setIngForm({ ...ingForm, nombre: e.target.value })
                  }
                  placeholder="Nombre del ingrediente"
                  style={{ ...inputStyle, flex: 2 }}
                />
                <select
                  value={ingForm.category}
                  onChange={(e) =>
                    setIngForm({ ...ingForm, category: e.target.value })
                  }
                  style={{ ...inputStyle, flex: 1 }}
                >
                  {CATEGORIAS_ING.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="number"
                  value={ingForm.quantity}
                  onChange={(e) =>
                    setIngForm({ ...ingForm, quantity: e.target.value })
                  }
                  placeholder="Cantidad"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <select
                  value={ingForm.unit}
                  onChange={(e) =>
                    setIngForm({ ...ingForm, unit: e.target.value })
                  }
                  style={{ ...inputStyle, flex: 1 }}
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAgregarIngrediente}
                  disabled={loadingIng || loadingCrearIng}
                  style={{
                    ...btnPrimario,
                    padding: "0.625rem 0.875rem",
                    flexShrink: 0,
                  }}
                >
                  {loadingIng || loadingCrearIng ? "..." : "+"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {dish.is_active ? (
            <button
              onClick={() => {
                if (window.confirm(`¿Desactivar "${dish.name}"?`)) {
                  deactivateDish({ variables: { id: dish.id } });
                }
              }}
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
              Desactivar plato
            </button>
          ) : (
            <button
              onClick={() => activateDish({ variables: { id: dish.id } })}
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
              Activar plato
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Componente del Marketplace ─────────────────────────────────────
function ModalMarketplace({ globalDishes, onClose, onAdopted }) {
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSel, setCategoriaSel] = useState("Todos");

  const categoriasDisponibles = [
    "Todos",
    ...new Set(globalDishes.map((d) => d.category)),
  ];

  const platosFiltrados = globalDishes.filter((d) => {
    const cumpleBusqueda =
      d.name.toLowerCase().includes(busqueda.toLowerCase()) ||
      d.description?.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleCat = categoriaSel === "Todos" || d.category === categoriaSel;
    return cumpleBusqueda && cumpleCat;
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(10, 15, 30, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "1.5rem",
          width: "100%",
          maxWidth: "1100px",
          height: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden",
        }}
      >
        {/* Cabecera del Banco */}
        <div
          style={{
            padding: "1.5rem 2rem",
            backgroundColor: "white",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "2rem",
          }}
        >
          <div style={{ flexShrink: 0 }}>
            <h3
              style={{
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: "800",
                color: "#1a1a2e",
              }}
            >
              <span style={{ color: "#ea580c" }}>Master</span> Menu Bank
            </h3>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "#64748b" }}>
              Recetas listas para adopción
            </p>
          </div>

          <div style={{ flex: 1, maxWidth: "400px", position: "relative" }}>
            <input
              type="text"
              placeholder="Buscar receta..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 1rem 0.6rem 2.5rem",
                borderRadius: "0.75rem",
                border: "1px solid #e2e8f0",
                fontSize: "0.875rem",
                outline: "none",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: "0.8rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#94a3b8",
              }}
            >
              🔍
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#f8fafc",
              padding: "0.5rem",
              borderRadius: "0.5rem",
              cursor: "pointer",
              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Sidebar de Categorías */}
          <div
            style={{
              width: "220px",
              backgroundColor: "#f8fafc",
              padding: "1.5rem 1rem",
              borderRight: "1px solid #f1f5f9",
              overflowY: "auto",
            }}
          >
            <h4
              style={{
                fontSize: "0.7rem",
                fontWeight: "800",
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "1rem",
                paddingLeft: "0.5rem",
              }}
            >
              Categorías
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              {categoriasDisponibles.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaSel(cat)}
                  style={{
                    textAlign: "left",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "0.5rem",
                    border: "none",
                    fontSize: "0.85rem",
                    fontWeight: categoriaSel === cat ? "700" : "500",
                    backgroundColor:
                      categoriaSel === cat ? "#ea580c10" : "transparent",
                    color: categoriaSel === cat ? "#ea580c" : "#475569",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Contenido */}
          <div
            style={{
              flex: 1,
              padding: "1.5rem 2rem",
              overflowY: "auto",
              backgroundColor: "#ffffff",
            }}
          >
            {platosFiltrados.length === 0 ? (
              <div style={{ textAlign: "center", padding: "5rem 0" }}>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
                  No se encontraron platos que coincidan con tu búsqueda.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: "1.5rem",
                }}
              >
                {platosFiltrados.map((dish) => (
                  <div
                    key={dish.id}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "1rem",
                      padding: "1.25rem",
                      border: "1px solid #f1f5f9",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 10px 15px -3px rgba(0,0,0,0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 6px -1px rgba(0,0,0,0.05)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: "800",
                          textTransform: "uppercase",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "0.3rem",
                          background: "#f1f5f9",
                          color: "#64748b",
                        }}
                      >
                        {dish.category}
                      </span>
                      {dish.is_active && (
                        <span style={{ color: "#16a34a", fontSize: "0.7rem" }}>
                          ● Activo
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        height: "140px",
                        borderRadius: "0.75rem",
                        backgroundColor: "#f9fafb",
                        backgroundImage: dish.image_url
                          ? `url(${dish.image_url})`
                          : "none",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid #e5e7eb",
                        marginTop: "-0.25rem",
                        marginBottom: "-0.25rem",
                      }}
                    >
                      {!dish.image_url && (
                        <span
                          style={{
                            color: "#9ca3af",
                            fontSize: "0.875rem",
                            fontWeight: "500",
                          }}
                        >
                          Sin imagen
                        </span>
                      )}
                    </div>

                    <h4
                      style={{
                        margin: 0,
                        fontSize: "1rem",
                        fontWeight: "700",
                        color: "#1a1a2e",
                      }}
                    >
                      {dish.name}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.75rem",
                        color: "#64748b",
                        lineHeight: "1.4",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {dish.description || "Sin descripción disponible."}
                    </p>

                    <div
                      style={{
                        marginTop: "auto",
                        paddingTop: "0.75rem",
                        borderTop: "1px dashed #f1f5f9",
                      }}
                    >
                      <button
                        onClick={() => {
                          onAdopted();
                          window.dispatchEvent(
                            new CustomEvent("openDetail", { detail: dish }),
                          );
                        }}
                        style={{
                          ...btnPrimario,
                          width: "100%",
                          padding: "0.6rem",
                          fontSize: "0.8rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "0.5rem",
                        }}
                      >
                        Adoptar Receta
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────
function MenuGlobal() {
  const { user, isGerenteGeneral } = useAuth();
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modalMarketplaceAbierto, setModalMarketplaceAbierto] = useState(false);
  const [platoSeleccionado, setPlatoSeleccionado] = useState(null);

  const { data: dishesData, loading } = useQuery(GET_DISHES, {
    fetchPolicy: "network-only",
  });
  const { data: globalDishesData } = useQuery(GET_DISHES, {
    variables: { onlyGlobal: true },
    fetchPolicy: "network-only",
  });
  const { data: ingredientsData, refetch: refetchIngredients } =
    useQuery(GET_INGREDIENTS);

  const ingredientes = ingredientsData?.ingredients ?? [];

  useEffect(() => {
    const handleOpenDetail = (e) => {
      setPlatoSeleccionado(e.detail);
    };
    window.addEventListener("openDetail", handleOpenDetail);
    return () => window.removeEventListener("openDetail", handleOpenDetail);
  }, []);

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
            Menú Global
          </h2>
          <p
            style={{
              margin: "0.25rem 0 0 0",
              color: "#6b7280",
              fontSize: "0.875rem",
            }}
          >
            Catálogo de platos de la cadena · click en un plato para editarlo
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            onClick={() => setModalMarketplaceAbierto(true)}
            style={{
              ...btnSecundario,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <ShoppingBag size={18} /> Explorar Banco
          </button>
          <button onClick={() => setModalAbierto(true)} style={btnPrimario}>
            + Nuevo plato local
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                height: "10rem",
                backgroundColor: "white",
                borderRadius: "1rem",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      ) : (dishesData?.dishes?.length ?? 0) === 0 ? (
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
          <p style={{ margin: 0 }}>No hay platos en el catálogo aún.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: "1rem",
          }}
        >
          {dishesData?.dishes?.map((dish) => {
            const colores = CATEGORIA_COLORES[dish.category] ?? {
              bg: "#f3f4f6",
              color: "#374151",
            };
            return (
              <div
                key={dish.id}
                onClick={() => setPlatoSeleccionado(dish)}
                style={{
                  backgroundColor: "white",
                  borderRadius: "1.25rem",
                  padding: "1.50rem",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
                  opacity: dish.is_active ? 1 : 0.7,
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  border:
                    platoSeleccionado?.id === dish.id
                      ? "2px solid #ea580c"
                      : "2px solid #f1f5f9",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-6px)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)";
                  if (platoSeleccionado?.id !== dish.id) {
                    e.currentTarget.style.borderColor = "#ea580c30";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 6px -1px rgba(0,0,0,0.05)";
                  if (platoSeleccionado?.id !== dish.id) {
                    e.currentTarget.style.borderColor = "#f1f5f9";
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
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
                    {dish.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <h3
                  style={{
                    margin: "0 0 0.5rem 0",
                    fontSize: "1rem",
                    fontWeight: "700",
                    color: "#1a1a2e",
                  }}
                >
                  {dish.name}
                </h3>
                {dish.description && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: "0.8rem",
                      color: "#6b7280",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {dish.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal nuevo plato */}
      {modalAbierto && (
        <ModalNuevoPlato
          onClose={() => setModalAbierto(false)}
          onCreated={(dish) => {
            setModalAbierto(false);
            setPlatoSeleccionado(dish);
          }}
        />
      )}

      {/* Modal Marketplace */}
      {modalMarketplaceAbierto && (
        <ModalMarketplace
          globalDishes={globalDishesData?.dishes ?? []}
          onClose={() => setModalMarketplaceAbierto(false)}
          onAdopted={() => {
            setModalMarketplaceAbierto(false);
            // Refetch or update is handled by the detail panel usually,
            // but we'll trigger a full refetch here for safety
          }}
        />
      )}

      {/* Panel lateral */}
      {platoSeleccionado && (
        <PanelDetalle
          dish={platoSeleccionado}
          ingredients={ingredientes}
          onClose={() => setPlatoSeleccionado(null)}
          onUpdated={() => {}}
          refetchIngredients={refetchIngredients}
          isGerenteGeneral={isGerenteGeneral}
        />
      )}
    </div>
  );
}

export default MenuGlobal;
