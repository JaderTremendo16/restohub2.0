import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_STOCKS,
  GET_SUPPLY_ORDERS,
  CREATE_LOW_STOCK_CONFIG,
  GET_LOW_STOCK_CONFIGS,
  UPDATE_LOW_STOCK_CONFIG,
  UPDATE_SUPPLY_ORDER,
  CREATE_SUPPLY_ORDER,
  RECEIVE_SUPPLY_ORDER,
  ADD_SUPPLY_ORDER_ITEM,
} from "../graphql/inventory";
import { GET_INGREDIENTS, GET_SUPPLIERS } from "../graphql/ingredients";
import { GET_LOCATIONS, GET_COUNTRIES } from "../graphql/location";
import { useAuth } from "../context/AuthContext";

const STATUSES = ["PENDIENTE", "RECIBIDO", "CANCELADO"];
const UNIDADES = ["kg", "g", "l", "ml", "unidad"];


const STATUS_ESTILOS = {
  PENDIENTE: { bg: "#fef3c7", color: "#92400e" },
  RECIBIDO: { bg: "#d1fae5", color: "#065f46" },
  CANCELADO: { bg: "#f3f4f6", color: "#6b7280" },
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
  // Si no hay información de país, usamos Colombia por defecto
  const locale = country?.locale || 'es-CO';
  const currency = country?.currencyCode || 'COP';

  try {
    return new Intl.NumberFormat(locale, { 
      style: 'currency', 
      currency: currency, 
      minimumFractionDigits: 0 
    }).format(val || 0);
  } catch (e) {
    // Si falla el formato (ej: locale inválido), usamos el estándar
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(val || 0);
  }
};

// Nueva función para normalizar unidades (Ej: 5000g -> 5kg)
const formatQuantity = (amount, unit) => {
  if (!amount) return "0 " + unit;
  
  if (unit === "g" && amount >= 1000) {
    return (amount / 1000).toFixed(1).replace(".0", "") + " kg";
  }
  if (unit === "ml" && amount >= 1000) {
    return (amount / 1000).toFixed(1).replace(".0", "") + " l";
  }
  
  return `${amount} ${unit}`;
};

// ── Modal nuevo pedido ──────────────────────────────────────────
// CAMBIO: ya no recibe "locations" como prop porque la sede es fija
// CAMBIO: recibe "locationId" directamente del usuario logueado
function ModalNuevoPedido({
  onClose,
  onCreated,
  suppliers,
  ingredients,
  locationId,
  country,
}) {
  const [form, setForm] = useState({
    supplier_id: "",
    // CAMBIO: location_id se inicializa con la sede del admin, no vacío
    location_id: locationId ?? "",
    notes: "",
  });

  const [items, setItems] = useState([]);
  const [itemForm, setItemForm] = useState({
    ingredient_id: "",
    quantity: "",
    unit: "", // Cambiado a vacío
    unit_cost: "",
  });

  const [createSupplyOrder, { loading: loadingOrder }] = useMutation(
    CREATE_SUPPLY_ORDER,
    {
      refetchQueries: [
        {
          query: GET_SUPPLY_ORDERS,
          variables: { location_id: locationId },
        },
      ],
      onError: (e) => alert("Error al crear pedido: " + e.message),
    },
  );

  const [addSupplyOrderItem, { loading: loadingItem }] = useMutation(
    ADD_SUPPLY_ORDER_ITEM,
    {
      onError: (e) => alert("Error al agregar item: " + e.message),
    },
  );

  const loading = loadingOrder || loadingItem;

  const ingredientesFiltrados =
    ingredients?.filter(
      (i) => String(i.supplier_id) === String(form.supplier_id) && i.is_active,
    ) ?? [];

  const handleChange = (e) => {
    const { name, value } = e.target;
    // CAMBIO: nunca tocamos location_id desde el formulario, viene fijo
    setForm({ ...form, [name]: value });
    if (name === "supplier_id") {
      setItems([]);
      setItemForm({
        ingredient_id: "",
        quantity: "",
        unit: "",
        unit_cost: "",
      });
    }
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    if (name === "ingredient_id") {
      const ing = ingredientesFiltrados.find(
        (i) => String(i.id) === String(value),
      );
      setItemForm({
        ...itemForm,
        ingredient_id: value,
        unit: ing?.unit ?? "kg",
        unit_cost: ing?.cost_per_unit ?? "",
      });
    } else {
      setItemForm({ ...itemForm, [name]: value });
    }
  };

  const handleAgregarItem = () => {
    if (!itemForm.ingredient_id || !itemForm.quantity || !itemForm.unit_cost) {
      alert("Completa ingrediente, cantidad y costo unitario");
      return;
    }
    if (
      parseFloat(itemForm.quantity) <= 0 ||
      parseFloat(itemForm.unit_cost) <= 0
    ) {
      alert("La cantidad y el costo deben ser mayores a 0");
      return;
    }
    if (
      items.find(
        (i) => String(i.ingredient_id) === String(itemForm.ingredient_id),
      )
    ) {
      alert("Ese ingrediente ya está en el pedido");
      return;
    }
    const ingrediente = ingredientesFiltrados.find(
      (i) => String(i.id) === String(itemForm.ingredient_id),
    );
    setItems([
      ...items,
      {
        ingredient_id: parseInt(itemForm.ingredient_id),
        name: ingrediente?.name ?? "Desconocido",
        quantity: parseFloat(itemForm.quantity),
        unit: itemForm.unit,
        unit_cost: parseFloat(itemForm.unit_cost),
      },
    ]);
    setItemForm({ ingredient_id: "", quantity: "", unit: "", unit_cost: "" });
  };

  const handleQuitarItem = (ingredient_id) => {
    setItems(items.filter((i) => i.ingredient_id !== ingredient_id));
  };

  const handleSubmit = async () => {
    if (!form.supplier_id || !form.location_id) {
      alert("Proveedor es obligatorio");
      return;
    }
    if (parseFloat(form.cost_per_unit) < 0) {
      alert("El costo no puede ser negativo");
      return;
    }
    if (items.length === 0) {
      alert("Agrega al menos un ingrediente al pedido");
      return;
    }

    const totalCost = items.reduce(
      (acc, i) => acc + i.quantity * i.unit_cost,
      0,
    );

    const { data } = await createSupplyOrder({
      variables: {
        input: {
          supplier_id: parseInt(form.supplier_id),
          // CAMBIO: location_id siempre viene del usuario logueado
          location_id: parseInt(form.location_id),
          total_cost: totalCost,
          notes: form.notes || null,
        },
      },
    });

    const orderId = data?.createSupplyOrder?.id;
    if (!orderId) return;

    for (const item of items) {
      await addSupplyOrderItem({
        variables: {
          input: {
            supply_order_id: parseInt(orderId),
            ingredient_id: item.ingredient_id,
            quantity: item.quantity,
            unit: item.unit,
            unit_cost: item.unit_cost,
            received_quantity: 0,
          },
        },
      });
    }

    onCreated();
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
          maxWidth: "580px",
          maxHeight: "90vh",
          overflowY: "auto",
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
          Nuevo pedido de suministro
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Proveedor *</label>
            <select
              name="supplier_id"
              value={form.supplier_id}
              onChange={handleChange}
              style={inputStyle}
            >
              <option value="">Seleccionar proveedor</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* CAMBIO: en lugar de un select de sede, mostramos que es automática */}
          <div>
            <label style={labelStyle}>Sede</label>
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
              🏪 Sede asignada automáticamente a tu cuenta
            </div>
          </div>

          <div>
            <label style={labelStyle}>Notas</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Instrucciones especiales..."
              rows={2}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          {form.supplier_id && (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                padding: "1rem",
              }}
            >
              <p
                style={{
                  margin: "0 0 1rem 0",
                  fontWeight: "600",
                  fontSize: "0.875rem",
                  color: "#1a1a2e",
                }}
              >
                Ingredientes del pedido
              </p>

              {ingredientesFiltrados.length === 0 ? (
                <p style={{ fontSize: "0.8rem", color: "#9ca3af", margin: 0 }}>
                  Este proveedor no tiene ingredientes asignados.
                </p>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.5rem",
                      marginBottom: "0.75rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <select
                      name="ingredient_id"
                      value={itemForm.ingredient_id}
                      onChange={handleItemChange}
                      style={{ ...inputStyle, flex: 2, minWidth: "140px" }}
                    >
                      <option value="">Ingrediente</option>
                      {ingredientesFiltrados.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))}
                    </select>

                    <input
                      name="quantity"
                      type="number"
                      value={itemForm.quantity}
                      onChange={handleItemChange}
                      placeholder="Cantidad"
                      style={{ ...inputStyle, flex: 1, minWidth: "80px" }}
                    />

                    <select
                      name="unit"
                      value={itemForm.unit}
                      onChange={handleItemChange}
                      disabled={!!itemForm.ingredient_id}
                      style={{
                        ...inputStyle,
                        flex: 1,
                        minWidth: "70px",
                        backgroundColor: itemForm.ingredient_id
                          ? "#f9fafb"
                          : "white",
                      }}
                    >
                      <option value="">U</option>
                      {UNIDADES.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>

                    <input
                      name="unit_cost"
                      type="number"
                      value={itemForm.unit_cost}
                      onChange={handleItemChange}
                      placeholder="Costo/u"
                      readOnly={!!itemForm.ingredient_id}
                      style={{
                        ...inputStyle,
                        flex: 1,
                        minWidth: "80px",
                        backgroundColor: itemForm.ingredient_id
                          ? "#f9fafb"
                          : "white",
                      }}
                    />

                    <button
                      onClick={handleAgregarItem}
                      style={{
                        ...btnPrimario,
                        padding: "0.625rem 1rem",
                        flexShrink: 0,
                      }}
                    >
                      + Agregar
                    </button>
                  </div>

                  {items.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                      }}
                    >
                      {items.map((item) => (
                        <div
                          key={item.ingredient_id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: "#f9fafb",
                            borderRadius: "0.5rem",
                            padding: "0.5rem 0.75rem",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontSize: "0.875rem",
                                fontWeight: "500",
                                color: "#1a1a2e",
                              }}
                            >
                              {item.name}
                            </span>
                            <span
                              style={{
                                fontSize: "0.8rem",
                                color: "#6b7280",
                                marginLeft: "0.5rem",
                              }}
                            >
                              {item.quantity} {item.unit} · {formatCurrency(item.unit_cost, country)}/u
                            </span>
                          </div>
                          <button
                            onClick={() => handleQuitarItem(item.ingredient_id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#dc2626",
                              cursor: "pointer",
                              fontSize: "1rem",
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}

                      <div
                        style={{
                          textAlign: "right",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                          color: "#1a1a2e",
                          marginTop: "0.25rem",
                        }}
                      >
                        Total estimado: {formatCurrency(items.reduce((acc, i) => acc + i.quantity * i.unit_cost, 0), country)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
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
            {loading
              ? "Creando pedido..."
              : `Confirmar pedido (${items.length} items)`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sección de Stocks ───────────────────────────────────────────
// Sin cambios — ya filtra por location_id desde la query
function SeccionStocks({
  stocks,
  lowStockConfigs,
  ingredients,
  locations,
  loading,
}) {
  // Obtenemos el objeto país de la sede actual para el formato dinámico
  const sedeId = stocks?.[0]?.location_id;
  const sedeActual = locations?.find(l => String(l.id) === String(sedeId));
  const { data: countriesData } = useQuery(GET_COUNTRIES); // Podríamos pasarlo por props también
  const country = countriesData?.countries?.find(c => String(c.id) === String(sedeActual?.countryId));

  const nombreSede = (id) => {
    return (
      locations?.find((l) => String(l.id) === String(id))?.name ?? `Sede #${id}`
    );
  };

  const esCritico = (stock) => {
    const config = lowStockConfigs?.find(
      (c) =>
        String(c.ingredient_id) === String(stock.ingredient_id) &&
        String(c.location_id) === String(stock.location_id),
    );
    if (!config) return false;
    return stock.total_quantity < config.min_threshold;
  };

  const nombreIngrediente = (id) => {
    return (
      ingredients?.find((i) => String(i.id) === String(id))?.name ??
      "Desconocido"
    );
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "1rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        overflow: "hidden",
        marginBottom: "2rem",
      }}
    >
      <div
        style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #f3f4f6" }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: "700",
            color: "#1a1a2e",
          }}
        >
          Stock actual
        </h3>
        <p
          style={{
            margin: "0.2rem 0 0 0",
            fontSize: "0.8rem",
            color: "#6b7280",
          }}
        >
          Semáforo: 🔴 bajo mínimo · 🟢 nivel correcto
        </p>
      </div>

      {loading ? (
        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "2.5rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "0.5rem",
              }}
            />
          ))}
        </div>
      ) : !stocks || stocks.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "0.875rem",
          }}
        >
          📦 No hay registros de stock aún.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb" }}>
              {["Estado", "Ingrediente", "Cantidad", "Unidad", "Sede"].map(
                (h) => (
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
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, index) => {
              const critico = esCritico(stock);
              return (
                <tr
                  key={stock.id}
                  style={{
                    borderBottom:
                      index < stocks.length - 1 ? "1px solid #f3f4f6" : "none",
                    backgroundColor: critico ? "#fff5f5" : "transparent",
                  }}
                >
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <span style={{ fontSize: "1rem" }}>
                      {critico ? "🔴" : "🟢"}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "1rem 1.25rem",
                      fontSize: "0.875rem",
                      color: "#1a1a2e",
                      fontWeight: "500",
                    }}
                  >
                    {nombreIngrediente(stock.ingredient_id)}
                  </td>
                  <td
                    style={{
                      padding: "1rem 1.25rem",
                      fontSize: "0.875rem",
                      color: critico ? "#dc2626" : "#374151",
                      fontWeight: critico ? "700" : "400",
                    }}
                  >
                    {formatQuantity(stock.total_quantity, stock.unit)}
                  </td>
                  <td
                    style={{
                      padding: "1rem 1.25rem",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                    }}
                  >
                    {stock.unit}
                  </td>
                  <td
                    style={{
                      padding: "1rem 1.25rem",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                    }}
                  >
                    {nombreSede(stock.location_id)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ── Sección de Pedidos ──────────────────────────────────────────
// CAMBIO: recibe locationId para filtrar pedidos de esta sede únicamente
function SeccionPedidos({
  statusFiltro,
  setStatusFiltro,
  suppliers,
  locations,
  locationId,
  onNuevoPedido,
  country,
}) {
  const { data, loading } = useQuery(GET_SUPPLY_ORDERS, {
    variables: {
      ...(statusFiltro ? { status: statusFiltro } : {}),
      location_id: locationId,
    },
  });

  // CAMBIO: filtramos en el frontend los pedidos que pertenecen a esta sede
  // El backend no tiene filtro por location_id en supplyOrders, por eso lo hacemos aquí
  const pedidos = data?.supplyOrders ?? [];

  const nombreSede = (id) => {
    return (
      locations?.find((l) => String(l.id) === String(id))?.name ?? `Sede #${id}`
    );
  };

  const [receiveOrder] = useMutation(RECEIVE_SUPPLY_ORDER, {
    refetchQueries: [
      {
        query: GET_SUPPLY_ORDERS,
        variables: { location_id: parseInt(locationId) },
      },
      { query: GET_STOCKS, variables: { location_id: parseInt(locationId) } },
    ],
    onError: (e) => alert("Error: " + e.message),
  });

  const [cancelOrder] = useMutation(UPDATE_SUPPLY_ORDER, {
    refetchQueries: [
      { query: GET_SUPPLY_ORDERS, variables: { location_id: locationId } },
    ],
    onError: (e) => alert("Error: " + e.message),
  });

  const handleCancel = (id) => {
    if (window.confirm("¿Cancelar este pedido?")) {
      cancelOrder({
        variables: {
          id,
          input: { status: "CANCELADO" },
        },
      });
    }
  };

  const handleReceive = (id) => {
    if (window.confirm("¿Marcar este pedido como recibido?")) {
      receiveOrder({
        variables: {
          id,
          received_date: new Date().toISOString().split("T")[0],
        },
      });
    }
  };

  const nombreProveedor = (id) => {
    return (
      suppliers?.find((s) => String(s.id) === String(id))?.name ??
      `Proveedor #${id}`
    );
  };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "1rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "1rem",
            fontWeight: "700",
            color: "#1a1a2e",
          }}
        >
          Pedidos de suministro
        </h3>

        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setStatusFiltro("")}
            style={{
              padding: "0.35rem 0.875rem",
              borderRadius: "9999px",
              border: "none",
              fontSize: "0.75rem",
              fontWeight: "600",
              cursor: "pointer",
              backgroundColor: statusFiltro === "" ? "#ea580c" : "#e5e7eb",
              color: statusFiltro === "" ? "white" : "#374151",
            }}
          >
            Todos
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFiltro(s)}
              style={{
                padding: "0.35rem 0.875rem",
                borderRadius: "9999px",
                border: "none",
                fontSize: "0.75rem",
                fontWeight: "600",
                cursor: "pointer",
                backgroundColor: statusFiltro === s ? "#ea580c" : "#e5e7eb",
                color: statusFiltro === s ? "white" : "#374151",
              }}
            >
              {s}
            </button>
          ))}
          <button
            onClick={onNuevoPedido}
            style={{
              ...btnPrimario,
              padding: "0.35rem 0.875rem",
              fontSize: "0.75rem",
            }}
          >
            + Nuevo pedido
          </button>
        </div>
      </div>

      {loading ? (
        <div
          style={{
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "3rem",
                backgroundColor: "#f3f4f6",
                borderRadius: "0.5rem",
              }}
            />
          ))}
        </div>
      ) : pedidos.length === 0 ? (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: "0.875rem",
          }}
        >
          🕐 No hay pedidos {statusFiltro ? `con status ${statusFiltro}` : ""}{" "}
          aún.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb" }}>
              {["Proveedor", "Sede", "Fecha", "Estado", "Total", "Acción"].map(
                (h) => (
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
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido, index) => {
              const estilos =
                STATUS_ESTILOS[pedido.status] ?? STATUS_ESTILOS.CANCELADO;
              return (
                <tr
                  key={pedido.id}
                  style={{
                    borderBottom:
                      index < pedidos.length - 1 ? "1px solid #f3f4f6" : "none",
                  }}
                >
                  <td
                    style={{
                      padding: "1rem 1.25rem",
                      fontSize: "0.875rem",
                      color: "#1a1a2e",
                      fontWeight: "500",
                    }}
                  >
                    {nombreProveedor(pedido.supplier_id)}
                  </td>
                  {/* CAMBIO: mostramos nombre de sede en lugar del ID */}
                  <td
                    style={{
                      padding: "1rem 1.25rem",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                    }}
                  >
                    {nombreSede(pedido.location_id)}
                  </td>
                  <td
                    style={{
                      padding: "1rem 1.25rem",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                    }}
                  >
                    {pedido.order_date
                      ? new Date(
                          pedido.order_date.includes("T")
                            ? pedido.order_date
                            : pedido.order_date + "T12:00:00",
                        ).toLocaleDateString("es-CO")
                      : "—"}
                  </td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <span
                      style={{
                        backgroundColor: estilos.bg,
                        color: estilos.color,
                        padding: "0.2rem 0.7rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                      }}
                    >
                      {pedido.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "1rem 1.25rem",
                      fontSize: "0.875rem",
                      color: "#374151",
                    }}
                  >
                    {pedido.total_cost != null
                      ? formatCurrency(pedido.total_cost, country)
                      : "—"}
                  </td>
                  <td style={{ padding: "1rem 1.25rem" }}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {pedido.status === "PENDIENTE" && (
                        <>
                          <button
                            onClick={() => handleReceive(pedido.id)}
                            style={{
                              backgroundColor: "#d1fae5",
                              border: "1px solid #6ee7b7",
                              color: "#065f46",
                              padding: "0.3rem 0.75rem",
                              borderRadius: "0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            ✓ Recibido
                          </button>
                          <button
                            onClick={() => handleCancel(pedido.id)}
                            style={{
                              backgroundColor: "#f3f4f6",
                              border: "1px solid #d1d5db",
                              color: "#6b7280",
                              padding: "0.3rem 0.75rem",
                              borderRadius: "0.5rem",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function SeccionUmbralMinimo({ locationId, ingredients }) {
  const [form, setForm] = useState({
    ingredient_id: "",
    min_threshold: "",
    unit: "kg",
  });
  const [editando, setEditando] = useState(null); // config que se está editando

  const { data: configsData } = useQuery(GET_LOW_STOCK_CONFIGS, {
    variables: { location_id: locationId },
  });

  const [createConfig, { loading: loadingCreate }] = useMutation(
    CREATE_LOW_STOCK_CONFIG,
    {
      refetchQueries: [
        {
          query: GET_LOW_STOCK_CONFIGS,
          variables: { location_id: locationId },
        },
      ],
      onError: (e) => alert("Error: " + e.message),
      onCompleted: () =>
        setForm({ ingredient_id: "", min_threshold: "", unit: "kg" }),
    },
  );

  // Necesitas agregar UPDATE_LOW_STOCK_CONFIG al import de inventory
  const [updateConfig, { loading: loadingUpdate }] = useMutation(
    UPDATE_LOW_STOCK_CONFIG,
    {
      refetchQueries: [
        {
          query: GET_LOW_STOCK_CONFIGS,
          variables: { location_id: locationId },
        },
      ],
      onError: (e) => alert("Error: " + e.message),
      onCompleted: () => setEditando(null),
    },
  );

  const UNIDADES = ["kg", "g", "l", "ml", "unidad"];
  const loading = loadingCreate || loadingUpdate;

  const handleSubmit = () => {
    if (!form.ingredient_id || !form.min_threshold) {
      alert("Ingrediente y umbral son obligatorios");
      return;
    }
    if (parseFloat(form.min_threshold) < 0) {
      alert("El umbral no puede ser negativo");
      return;
    }
    createConfig({
      variables: {
        input: {
          ingredient_id: parseInt(form.ingredient_id),
          location_id: parseInt(locationId),
          min_threshold: parseFloat(form.min_threshold),
          unit: form.unit,
        },
      },
    });
  };

  const handleGuardarEdicion = () => {
    if (!editando.min_threshold || parseFloat(editando.min_threshold) < 0) {
      alert("El umbral debe ser mayor a 0");
      return;
    }
    updateConfig({
      variables: {
        id: editando.id,
        input: {
          min_threshold: parseFloat(editando.min_threshold),
          unit: editando.unit,
        },
      },
    });
  };

  const nombreIngrediente = (id) =>
    ingredients?.find((i) => String(i.id) === String(id))?.name ?? `#${id}`;

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "1rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        padding: "1.5rem",
        marginBottom: "2rem",
      }}
    >
      <h3
        style={{
          margin: "0 0 1rem 0",
          fontSize: "1rem",
          fontWeight: "700",
          color: "#1a1a2e",
        }}
      >
        ⚠️ Umbrales mínimos de stock
      </h3>

      {/* Formulario nuevo umbral */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}
      >
        <select
          value={form.ingredient_id}
          onChange={(e) => {
            const selectedId = e.target.value;
            const selectedIng = ingredients?.find(
              (i) => String(i.id) === String(selectedId),
            );
            setForm({
              ...form,
              ingredient_id: selectedId,
              unit: selectedIng?.unit ?? "kg",
            });
          }}
          style={{ ...inputStyle, flex: 2, minWidth: "150px" }}
        >
          <option value="">Seleccionar ingrediente</option>
          {ingredients?.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="0"
          value={form.min_threshold}
          onChange={(e) => setForm({ ...form, min_threshold: e.target.value })}
          placeholder="Cantidad mínima"
          style={{ ...inputStyle, flex: 1, minWidth: "130px" }}
        />
        <select
          value={form.unit}
          onChange={(e) => setForm({ ...form, unit: e.target.value })}
          disabled={true}
          style={{
            ...inputStyle,
            flex: 1,
            minWidth: "80px",
            backgroundColor: "#f9fafb",
          }}
        >
          {UNIDADES.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <button onClick={handleSubmit} disabled={loading} style={btnPrimario}>
          {loading ? "Guardando..." : "+ Agregar umbral"}
        </button>
      </div>

      {/* Lista de umbrales */}
      {(configsData?.lowStockConfigs?.length ?? 0) === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: "0.875rem", margin: 0 }}>
          No hay umbrales configurados aún.
        </p>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {configsData?.lowStockConfigs?.map((config) => (
            <div
              key={config.id}
              style={{
                backgroundColor: "#f9fafb",
                borderRadius: "0.5rem",
                padding: "0.5rem 0.875rem",
                fontSize: "0.875rem",
              }}
            >
              {editando?.id === config.id ? (
                // Modo edición
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "500",
                      color: "#1a1a2e",
                      flex: 2,
                      minWidth: "120px",
                    }}
                  >
                    {nombreIngrediente(config.ingredient_id)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={editando.min_threshold}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        min_threshold: e.target.value,
                      })
                    }
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minWidth: "100px",
                      padding: "0.3rem 0.5rem",
                    }}
                  />
                  <select
                    value={editando.unit}
                    onChange={(e) =>
                      setEditando({ ...editando, unit: e.target.value })
                    }
                    disabled={true}
                    style={{
                      ...inputStyle,
                      flex: 1,
                      minWidth: "70px",
                      padding: "0.3rem 0.5rem",
                      backgroundColor: "#f9fafb",
                    }}
                  >
                    {UNIDADES.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleGuardarEdicion}
                    disabled={loadingUpdate}
                    style={{
                      ...btnPrimario,
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditando(null)}
                    style={{
                      ...btnSecundario,
                      padding: "0.3rem 0.75rem",
                      fontSize: "0.75rem",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                // Modo vista
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: "500", color: "#1a1a2e" }}>
                    {nombreIngrediente(config.ingredient_id)}
                  </span>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <span style={{ color: "#6b7280" }}>
                      Mínimo: {config.min_threshold} {config.unit}
                    </span>
                    <button
                      onClick={() =>
                        setEditando({
                          id: config.id,
                          min_threshold: config.min_threshold,
                          unit: config.unit,
                        })
                      }
                      style={{
                        background: "none",
                        border: "1px solid #e5e7eb",
                        borderRadius: "0.375rem",
                        padding: "0.2rem 0.5rem",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                        color: "#6b7280",
                      }}
                    >
                      ✏️ Editar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página principal ────────────────────────────────────────────
function Inventory() {
  const [statusFiltro, setStatusFiltro] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  const { user } = useAuth();

  // CAMBIO: locationId del usuario logueado — es el filtro central de toda la página
  // parseInt porque el token guarda el ID como string y las queries esperan número
  const locationId = user?.locationId ? parseInt(user.locationId) : null;

  // CAMBIO: stocks filtrados por la sede del usuario
  const {
    data: stocksData,
    loading: stocksLoading,
    refetch,
  } = useQuery(GET_STOCKS, {
    variables: { location_id: locationId },
  });

  // CAMBIO: lowStockConfigs filtrados por la sede del usuario
  const { data: lowStockData } = useQuery(GET_LOW_STOCK_CONFIGS, {
    variables: { location_id: locationId },
  });

  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: countriesData } = useQuery(GET_COUNTRIES);

  const sedeActual = locationsData?.locations?.find(
    (l) => String(l.id) === String(locationId),
  );
  const paisActual = countriesData?.countries?.find(
    (c) => String(c.id) === String(sedeActual?.countryId),
  );

  // Ingredientes y proveedores son globales — todos los admins los ven
  const { data: ingredientsData } = useQuery(GET_INGREDIENTS, {
    variables: { 
      location_id: locationId,
      country_id: paisActual?.id ? parseInt(paisActual.id) : undefined 
    },
    skip: !locationId,
  });

  const { data: suppliersData } = useQuery(GET_SUPPLIERS, {
    variables: { 
      onlyActive: true,
      country_id: paisActual?.id ? parseInt(paisActual.id) : undefined
    },
  });

  // Lógica para detectar ingredientes en nivel crítico (Comparación estricta de tipos)
  const inventarioCritico = stocksData?.stocks?.filter(s => {
    const config = lowStockData?.lowStockConfigs?.find(c => String(c.ingredient_id) === String(s.ingredient_id));
    return config && Number(s.total_quantity) <= Number(config.min_threshold);
  }) || [];

  // Obtener nombres de ingredientes críticos
  const nombresCriticos = inventarioCritico
    .map(s => ingredientsData?.ingredients?.find(i => String(i.id) === String(s.ingredient_id))?.name)
    .filter(Boolean); // Eliminar nulos

  return (
    <div>
      <style>
        {`
          @keyframes pulse-red {
            0% { opacity: 0.6; }
            50% { opacity: 1; transform: scale(1.02); }
            100% { opacity: 0.6; }
          }
          .critical-item {
            animation: pulse-red 2s infinite ease-in-out;
            color: #ef4444 !important;
            font-weight: 700 !important;
          }
        `}
      </style>
      
      {/* Banner de Pánico / Alerta Crítica */}
      {inventarioCritico.length > 0 && (
        <div style={{
          backgroundColor: "#fef2f2",
          borderLeft: "4px solid #ef4444",
          borderRadius: "0.75rem",
          padding: "1rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}>
          <span style={{ fontSize: "1.5rem" }}>⚠️</span>
          <div>
            <h4 style={{ margin: 0, color: "#991b1b", fontSize: "0.9rem", fontWeight: "700" }}>
              NIVELES CRÍTICOS DETECTADOS
            </h4>
            <p style={{ margin: "0.1rem 0 0 0", color: "#b91c1c", fontSize: "0.8rem" }}>
              Los siguientes insumos necesitan reposición inmediata: 
              <span style={{ fontWeight: "700", marginLeft: "0.5rem" }}>
                {nombresCriticos.join(", ")}
              </span>
            </p>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "2rem" }}>
        <h2
          style={{
            margin: 0,
            fontSize: "1.5rem",
            fontWeight: "700",
            color: "#1a1a2e",
          }}
        >
          Inventario
        </h2>
        <div style={{ display: "flex", alignItems: "center", justifyItems: "center", gap: "1rem" }}>
          <p
            style={{
              margin: "0.25rem 0 0 0",
              color: "#6b7280",
              fontSize: "0.875rem",
            }}
          >
            Control de stock y pedidos de suministro
          </p>
          <button 
            onClick={() => refetch()}
            style={{ 
              ...btnSecundario, 
              padding: "0.3rem 0.8rem", 
              fontSize: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            🔄 Sincronizar Stock
          </button>
        </div>
      </div>

      <SeccionStocks
        stocks={stocksData?.stocks}
        lowStockConfigs={lowStockData?.lowStockConfigs}
        ingredients={ingredientsData?.ingredients}
        locations={locationsData?.locations}
        loading={stocksLoading}
      />
      <SeccionUmbralMinimo
        locationId={locationId}
        ingredients={ingredientsData?.ingredients ?? []}
      />

      {/* CAMBIO: pasamos locationId para que SeccionPedidos filtre correctamente */}
      <SeccionPedidos
        statusFiltro={statusFiltro}
        setStatusFiltro={setStatusFiltro}
        suppliers={suppliersData?.suppliers}
        locations={locationsData?.locations}
        locationId={locationId}
        onNuevoPedido={() => setModalAbierto(true)}
        country={paisActual}
      />
      {modalAbierto && (
        // CAMBIO: ya no pasamos locations al modal — la sede viene fija del usuario
        <ModalNuevoPedido
          onClose={() => setModalAbierto(false)}
          onCreated={() => setModalAbierto(false)}
          suppliers={suppliersData?.suppliers ?? []}
          ingredients={ingredientsData?.ingredients ?? []}
          locationId={locationId}
          country={paisActual}
        />
      )}
    </div>
  );
}

export default Inventory;
