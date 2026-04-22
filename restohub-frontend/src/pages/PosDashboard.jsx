import { useQuery, useMutation } from "@apollo/client/react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { GET_DISHES } from "../graphql/menu";
import {
  GET_POS_ORDERS,
  CREATE_POS_ORDER,
  ADD_POS_ITEM,
  REMOVE_POS_ITEM,
  BILL_POS_ORDER,
  PAY_POS_ORDER,
  CANCEL_POS_ORDER,
  DELIVER_POS_ORDER,
  CONFIRM_POS_ORDER,
} from "../graphql/pos";
import { GET_LOCATIONS, GET_COUNTRIES } from "../graphql/location";

const STATUS_COLORS = {
  open: "#fff3e0",
  billed: "#e3f2fd",
  ready_to_deliver: "#f3e5f5",
  delivered: "#e8f5e9",
  cancelled: "#ffebee",
};

const STATUS_TEXT = {
  open: "#ef6c00",
  billed: "#1976d2",
  ready_to_deliver: "#7b1fa2",
  delivered: "#2e7d32",
  cancelled: "#c62828",
};

const STATUS_LABELS = {
  open: "Abierto",
  billed: "Facturado",
  ready_to_deliver: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default function PosDashboard() {
  const { user } = useAuth();
  const [restaurantId] = useState(user?.locationId || "rest-001");
  const [cashierName, setCashierName] = useState(
    () => localStorage.getItem("pos_cashier") || "",
  );
  const [loggedIn, setLoggedIn] = useState(
    () => localStorage.getItem("pos_logged_in") === "true",
  );
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modal, setModal] = useState(null);
  const [msg, setMsg] = useState(null);

  // Form states
  const [newOrder, setNewOrder] = useState({ table_ref: "", notes: "" });
  const [newItem, setNewItem] = useState({
    product_name: "",
    quantity: 1,
    unit_price: "",
  });
  const [billForm, setBillForm] = useState({
    customer_name: "",
    customer_document: "",
  });
  const [payForm, setPayForm] = useState({
    payment_method: "cash",
    amount_received: "",
  });
  const [deliverForm, setDeliverForm] = useState({
    customer_name: "",
    customer_document: "",
    payment_method: "cash",
    amount_received: "",
  });
  const [changeResult, setChangeResult] = useState(null);
  const [deliverChange, setDeliverChange] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState("active"); // active, billed, delivered, cancelled, all
  const [timeRange, setTimeRange] = useState("today"); // today, all
  const [searchQuery, setSearchQuery] = useState("");

  const { data, refetch } = useQuery(GET_POS_ORDERS, {
    variables: { restaurant_id: restaurantId },
    skip: !loggedIn,
    pollInterval: 4000,
  });

  const { data: dishesData } = useQuery(GET_DISHES, {
    variables: { location_id: parseInt(restaurantId) },
    skip: !restaurantId || isNaN(parseInt(restaurantId)),
  });

  const [createOrder] = useMutation(CREATE_POS_ORDER);
  const [addItem] = useMutation(ADD_POS_ITEM);
  const [removeItem] = useMutation(REMOVE_POS_ITEM);
  const [billOrder] = useMutation(BILL_POS_ORDER);
  const [payOrder] = useMutation(PAY_POS_ORDER);
  const [cancelOrder] = useMutation(CANCEL_POS_ORDER);
  const [deliverOrder] = useMutation(DELIVER_POS_ORDER);
  const [confirmOrder] = useMutation(CONFIRM_POS_ORDER);

  // --- Lógica de país y moneda ---
  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: countriesData } = useQuery(GET_COUNTRIES);

  const sedeActual = locationsData?.locations?.find(
    (l) => String(l.id) === String(restaurantId)
  );
  const paisActual = countriesData?.countries?.find(
    (c) => String(c.id) === String(sedeActual?.countryId)
  );

  const formatCurrency = (val) => {
    const locale = paisActual?.locale || "es-CO";
    const currency = paisActual?.currencyCode || "COP";
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

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  const filteredOrders = (data?.posOrders || []).filter((o) => {
    // 1. Time filter
    if (timeRange === "today") {
      const today = new Date().toLocaleDateString();
      const orderDate = new Date(o.created_at).toLocaleDateString();
      if (today !== orderDate) return false;
    }

    // 2. Status filter
    if (filterStatus === "active") {
      if (["delivered", "cancelled"].includes(o.status)) return false;
    } else if (filterStatus !== "all") {
      if (o.status !== filterStatus) return false;
    }

    // 3. Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchId = o.id.toLowerCase().includes(q);
      const matchCustomer = o.customer_name?.toLowerCase().includes(q);
      const matchInvoice = o.invoice_number?.toLowerCase().includes(q);
      if (!matchId && !matchCustomer && !matchInvoice) return false;
    }

    return true;
  });

  const getStats = () => {
    const all = data?.posOrders || [];
    const today = new Date().toLocaleDateString();
    const todayOrders = all.filter(
      (o) => new Date(o.created_at).toLocaleDateString() === today,
    );
    const source = timeRange === "today" ? todayOrders : all;

    return {
      active: source.filter(
        (o) => !["delivered", "cancelled"].includes(o.status),
      ).length,
      delivered: source.filter((o) => o.status === "delivered").length,
      cancelled: source.filter((o) => o.status === "cancelled").length,
      total: source.length,
    };
  };

  const stats = getStats();

  const calcChange = () => {
    const total = parseFloat(selectedOrder?.total || 0);
    const received = parseFloat(payForm.amount_received || 0);
    if (!received) return;
    setChangeResult({
      total,
      received,
      change: parseFloat((received - total).toFixed(2)),
      ok: received >= total,
    });
  };

  const handleCreateOrder = async () => {
    try {
      const res = await createOrder({
        variables: {
          restaurant_id: restaurantId,
          cashier_name: cashierName,
          table_ref: newOrder.table_ref || null,
          notes: newOrder.notes || null,
          items: [],
        },
      });
      showMsg("Pedido creado ✅");
      setModal(null);
      setNewOrder({ table_ref: "", notes: "" });
      refetch();
      setSelectedOrder(res.data.createPosOrder);
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const handleAddItem = async () => {
    if (!selectedOrder) return;
    try {
      await addItem({
        variables: {
          pos_order_id: selectedOrder.id,
          item: {
            product_id: newItem.product_id || null,
            product_name: newItem.product_name,
            quantity: parseInt(newItem.quantity),
            unit_price: parseFloat(newItem.unit_price),
            notes: newItem.notes || null,
          },
        },
      });
      showMsg("Ítem agregado ✅");
      setModal(null);
      setNewItem({ product_name: "", product_id: "", quantity: 1, unit_price: "" });
      const res = await refetch();
      const updated = res.data.posOrders.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const handleConfirmOrder = async () => {
    if (!selectedOrder) return;
    try {
      await confirmOrder({
        variables: { id: selectedOrder.id }
      });
      showMsg("Pedido enviado a cocina 🍳🔥");
      const res = await refetch();
      const updated = res.data.posOrders.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const handleRemoveItem = async (item_id) => {
    try {
      await removeItem({ variables: { item_id } });
      const res = await refetch();
      const updated = res.data.posOrders.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const handleBill = async () => {
    try {
      await billOrder({ variables: { id: selectedOrder.id, ...billForm } });
      showMsg("Pedido facturado ✅");
      setModal(null);
      const res = await refetch();
      const updated = res.data.posOrders.find((o) => o.id === selectedOrder.id);
      if (updated) setSelectedOrder(updated);
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const handlePay = async () => {
    try {
      const res = await payOrder({
        variables: {
          id: selectedOrder.id,
          payment_method: payForm.payment_method,
          amount_received: parseFloat(payForm.amount_received),
        },
      });
      const paid = res.data.payPosOrder;
      showMsg(
        `Pago registrado ✅ Vuelto: ${formatCurrency(paid.change_amount)}`,
      );
      setChangeResult({
        total: paid.total,
        received: paid.amount_received,
        change: paid.change_amount,
        ok: true,
      });
      setModal("changeResult");
      refetch();
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const handlePrint = (order) => {
    const itemsHtml = (order.items || [])
      .map(
        (i) =>
          `<tr style="border-bottom: 1px solid #f1f3f5">
            <td style="padding: 12px 8px; font-weight: 600">${i.product_name}</td>
            <td style="padding: 12px 8px; text-align: center; color: #666">${i.quantity}</td>
            <td style="padding: 12px 8px; text-align: right; color: #666">${formatCurrency(i.unit_price)}</td>
            <td style="padding: 12px 8px; text-align: right; font-weight: 700">${formatCurrency(i.subtotal)}</td>
          </tr>`,
      )
      .join("");

    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Factura ${order.invoice_number}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              padding: 40px;
              color: #1a1c2d;
              max-width: 600px;
              margin: auto;
              line-height: 1.5;
            }
            .header { text-align: center; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; }
            .header-icon { fontSize: 30px; margin-bottom: 10px; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .info-item { font-size: 14px; }
            .label { color: #888; font-weight: 500; font-size: 11px; text-transform: uppercase; margin-bottom: 4px; }
            .value { font-weight: 700; color: #1a1c2d; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #1a1c2d; font-size: 12px; color: #888; text-transform: uppercase; }
            
            .totals { margin-top: 30px; border-top: 2px solid #f1f3f5; padding-top: 20px; }
            .total-row { display: flex; justify-content: flex-end; gap: 40px; margin-bottom: 8px; font-size: 14px; }
            .grand-total { font-size: 22px; font-weight: 900; color: #2e7d32; margin-top: 10px; }
            
            .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #eee; pt: 20px; }
            .badge { padding: 6px 12px; border-radius: 4px; border: 1px solid #2e7d32; color: #2e7d32; font-weight: 900; font-size: 11px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-icon">🍽️</div>
            <h1>Factura de Venta</h1>
          </div>

          <div class="info-grid">
            <div class="info-item">
              <div class="label">Factura</div>
              <div class="value">${order.invoice_number}</div>
            </div>
            <div class="info-item" style="text-align: right">
              <div class="label">Fecha</div>
              <div class="value">${new Date(order.created_at).toLocaleDateString()}</div>
            </div>
            <div class="info-item">
              <div class="label">Cajero</div>
              <div class="value">${order.cashier_name}</div>
            </div>
            <div class="info-item" style="text-align: right">
              <div class="label">Mesa</div>
              <div class="value">${order.table_ref || "N/A"}</div>
            </div>
          </div>

          ${order.customer_name
        ? `
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 30px">
              <div class="label">Cliente</div>
              <div class="value" style="font-size: 16px">${order.customer_name}</div>
            </div>
          `
        : ""
      }

          <table>
            <thead>
              <tr>
                <th>Plato</th>
                <th style="bottom: center">Cant</th>
                <th style="bottom: right">Precio</th>
                <th style="bottom: right">Total</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span class="label" style="margin: 0">Subtotal</span>
              <span class="value" style="width: 100px; text-align: right">${formatCurrency(order.subtotal)}</span>
            </div>
            <div class="total-row">
              <span class="label" style="margin: 0">IVA (19%)</span>
              <span class="value" style="width: 100px; text-align: right">${formatCurrency(order.tax)}</span>
            </div>
            <div class="total-row grand-total">
              <span style="color: #1a1c2d">TOTAL</span>
              <span style="width: 120px; text-align: right">${formatCurrency(order.total)}</span>
            </div>
          </div>

          <div class="footer">
            <div class="info-item">
              <div class="label">Medio de Pago</div>
              <div class="value" style="color: #1976d2; text-transform: uppercase">${order.payment_method === "cash" ? "💵 Efectivo" : "💳 PayPal"}</div>
            </div>
            <div class="badge">Pago Completado</div>
          </div>
          
          <p style="text-align: center; color: #aaa; font-size: 10px; margin-top: 40px">
            Gracias por su compra · RestoHub POS
          </p>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const handleDeliverFull = async () => {
    try {
      // Paso 1: Entregar
      await deliverOrder({ variables: { id: selectedOrder.id } });

      // Paso 2: Facturar
      await billOrder({
        variables: {
          id: selectedOrder.id,
          customer_name: deliverForm.customer_name || null,
          customer_document: deliverForm.customer_document || null,
        },
      });

      // Paso 3: Pagar
      const res = await payOrder({
        variables: {
          id: selectedOrder.id,
          payment_method: deliverForm.payment_method,
          amount_received: parseFloat(deliverForm.amount_received),
        },
      });

      const paid = res.data.payPosOrder;
      setDeliverChange({
        total: parseFloat(paid.total),
        received: parseFloat(paid.amount_received),
        change: parseFloat(paid.change_amount || 0),
      });

      setModal("deliverResult");
      refetch();
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const handleDeliverWithPayPal = async (orderID, pos_order_id) => {
    try {
      const res = await fetch("http://localhost:3004/capture-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID, pos_order_id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        showMsg("✅ Pago con PayPal confirmado");
        setModal(null);
        setSelectedOrder(null);
        refetch();
      } else {
        throw new Error("Error al capturar el pago");
      }
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  // Login screen
  if (!loggedIn)
    return (
      <div style={s.loginWrap}>
        <div style={s.loginBox}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🖥️</div>
          <h2 style={s.loginTitle}>Punto de Venta</h2>
          <p
            style={{
              color: "#666",
              marginBottom: "1.5rem",
              fontSize: "0.9rem",
            }}
          >
            RestoHub POS
          </p>
          <input
            style={s.input}
            placeholder="Tu nombre (cajero)"
            value={cashierName}
            onChange={(e) => setCashierName(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && cashierName && setLoggedIn(true)
            }
          />
          <button
            style={{ ...s.btnPrimary, width: "100%" }}
            onClick={() => {
              if (cashierName) {
                setLoggedIn(true);
                localStorage.setItem("pos_logged_in", "true");
                localStorage.setItem("pos_cashier", cashierName);
              }
            }}
            disabled={!cashierName}
          >
            Ingresar al POS
          </button>
        </div>
      </div>
    );

  // orders already defined via data?.posOrders

  return (
    <div style={s.wrap}>
      {msg && (
        <div
          style={{
            ...s.toast,
            background: msg.type === "error" ? "#e74c3c" : "#27ae60",
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.title}>🖥️ POS — Punto de Venta</h1>
          <span style={s.sub}>
            Cajero: {cashierName} · {stats.active} pedidos activos
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button style={s.btnPrimary} onClick={() => setModal("createOrder")}>
            + Nuevo pedido
          </button>
          <button
            style={s.btnSecondary}
            onClick={() => {
              setLoggedIn(false);
              setCashierName("");
              localStorage.removeItem("pos_logged_in");
              localStorage.removeItem("pos_cashier");
            }}
          >
            Salir
          </button>
        </div>
      </div>

      <div style={s.layout}>
        {/* Lista de pedidos */}
        <div style={s.orderList}>
          {/* Barra de tiempo y búsqueda */}
          <div style={{ marginBottom: "1rem" }}>
            <div
              style={{
                display: "flex",
                gap: "4px",
                background: "#f1f3f5",
                padding: "4px",
                borderRadius: "10px",
                marginBottom: "1rem",
              }}
            >
              <button
                style={{
                  ...s.timeBtn,
                  background: timeRange === "today" ? "#fff" : "transparent",
                  boxShadow:
                    timeRange === "today"
                      ? "0 2px 8px rgba(0,0,0,0.05)"
                      : "none",
                }}
                onClick={() => setTimeRange("today")}
              >
                Hoy
              </button>
              <button
                style={{
                  ...s.timeBtn,
                  background: timeRange === "all" ? "#fff" : "transparent",
                  boxShadow:
                    timeRange === "all" ? "0 2px 8px rgba(0,0,0,0.05)" : "none",
                }}
                onClick={() => setTimeRange("all")}
              >
                Historial
              </button>
            </div>

            <div style={s.searchWrap}>
              <span style={{ marginRight: "8px" }}>🔍</span>
              <input
                style={s.searchInput}
                placeholder="Buscar ID, cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filtros de estado */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "1.2rem",
              overflowX: "auto",
              paddingBottom: "4px",
            }}
          >
            <button
              style={{
                ...s.filterBtn,
                background: filterStatus === "active" ? "#f4511e" : "#fff",
                color: filterStatus === "active" ? "#fff" : "#666",
                borderColor: filterStatus === "active" ? "#f4511e" : "#eee",
              }}
              onClick={() => setFilterStatus("active")}
            >
              Activos ({stats.active})
            </button>
            <button
              style={{
                ...s.filterBtn,
                background: filterStatus === "delivered" ? "#2e7d32" : "#fff",
                color: filterStatus === "delivered" ? "#fff" : "#666",
                borderColor: filterStatus === "delivered" ? "#2e7d32" : "#eee",
              }}
              onClick={() => setFilterStatus("delivered")}
            >
              Cerrados ({stats.delivered})
            </button>
            <button
              style={{
                ...s.filterBtn,
                background: filterStatus === "all" ? "#1a1c2d" : "#fff",
                color: filterStatus === "all" ? "#fff" : "#666",
                borderColor: filterStatus === "all" ? "#1a1c2d" : "#eee",
              }}
              onClick={() => setFilterStatus("all")}
            >
              Todos ({stats.total})
            </button>
          </div>

          {filteredOrders.length === 0 && (
            <p style={s.empty}>Sin resultados para mostrar</p>
          )}

          {filteredOrders.map((order) => (
            <div
              key={order.id}
              style={{
                ...s.orderCard,
                boxShadow:
                  selectedOrder?.id === order.id
                    ? "0 8px 20px rgba(244, 81, 30, 0.15)"
                    : "none",
                borderColor:
                  selectedOrder?.id === order.id ? "#f4511e" : "#eee",
                background: selectedOrder?.id === order.id ? "#fff9f7" : "#fff",
                position: "relative",
              }}
              onClick={() => setSelectedOrder(order)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span
                  style={{
                    color: "#f4511e",
                    fontWeight: "900",
                    fontSize: "0.9rem",
                  }}
                >
                  #
                  {order.invoice_number
                    ? order.invoice_number.split("-").pop()
                    : order.id.slice(0, 6)}
                </span>
                <span
                  style={{
                    ...s.badge,
                    background: STATUS_COLORS[order.status],
                    color: STATUS_TEXT[order.status],
                  }}
                >
                  {STATUS_LABELS[order.status]}
                </span>
              </div>

              {order.customer_name && (
                <p
                  style={{
                    ...s.cardInfo,
                    color: "#1a1c2d",
                    fontWeight: "700",
                    fontSize: "0.95rem",
                    marginBottom: "4px",
                  }}
                >
                  👤 {order.customer_name}
                </p>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "4px",
                }}
              >
                {order.table_ref && (
                  <p style={s.cardInfo}>🪑 Mesa {order.table_ref}</p>
                )}
                <p
                  style={{
                    ...s.cardInfo,
                    textAlign: "right",
                    color: "#2e7d32",
                    fontWeight: "700",
                  }}
                >
                  {formatCurrency(order.total)}
                </p>
              </div>

              <p
                style={{
                  ...s.cardInfo,
                  fontSize: "0.75rem",
                  color: "#999",
                  marginTop: "4px",
                  borderTop: "1px solid #f8f9fa",
                  paddingTop: "4px",
                }}
              >
                🕐{" "}
                {new Date(order.created_at).toLocaleDateString() ===
                  new Date().toLocaleDateString()
                  ? new Date(order.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                  : new Date(order.created_at).toLocaleDateString([], {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </p>
            </div>
          ))}
        </div>

        {/* Panel derecho: detalle del pedido */}
        <div style={s.detail}>
          {!selectedOrder ? (
            <div style={s.emptyDetail}>
              <p style={{ fontSize: "3rem" }}>🖥️</p>
              <p>Selecciona o crea un pedido</p>
            </div>
          ) : (
            <>
              <div style={s.detailHeader}>
                <div>
                  <h2 style={{ margin: 0, color: "#e94560" }}>
                    #{selectedOrder.id.slice(0, 8)}
                  </h2>
                  <span
                    style={{
                      ...s.badge,
                      background: STATUS_COLORS[selectedOrder.status],
                    }}
                  >
                    {STATUS_LABELS[selectedOrder.status]}
                  </span>
                  {selectedOrder.table_ref && (
                    <span
                      style={{
                        color: "#aaa",
                        marginLeft: "0.5rem",
                        fontSize: "0.85rem",
                      }}
                    >
                      🪑 Mesa {selectedOrder.table_ref}
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {selectedOrder.status === "delivered" && (
                    <button
                      style={s.btnSm}
                      onClick={() => handlePrint(selectedOrder)}
                    >
                      🖨 Imprimir
                    </button>
                  )}
                  {["open", "billed"].includes(selectedOrder.status) && (
                    <button
                      style={{ ...s.btnSm, background: "#e74c3c" }}
                      onClick={async () => {
                        await cancelOrder({
                          variables: { id: selectedOrder.id },
                        });
                        refetch();
                        setSelectedOrder(null);
                      }}
                    >
                      ✕ Cancelar
                    </button>
                  )}
                  {selectedOrder.status === "ready_to_deliver" && (
                    <button
                      style={{
                        ...s.btnPrimary,
                        width: "100%",
                        marginTop: "1rem",
                        background: "#9b59b6",
                      }}
                      onClick={() => {
                        setDeliverForm({
                          customer_name: "",
                          customer_document: "",
                          payment_method: "cash",
                          amount_received: selectedOrder.total,
                        });
                        setDeliverChange(null);
                        setModal("deliverFull");
                      }}
                    >
                      🛎 Entregar al cliente
                    </button>
                  )}
                </div>
              </div>

              {/* Ítems */}
              <div style={s.itemsBox}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <p style={s.sectionTitle}>Platos del pedido</p>
                  {selectedOrder.status === "open" && (
                    <button style={s.btnSm} onClick={() => setModal("addItem")}>
                      + Agregar plato
                    </button>
                  )}
                </div>

                {(!selectedOrder.items || selectedOrder.items.length === 0) && (
                  <p style={s.empty}>Sin platos aún. Agrega uno.</p>
                )}

                {selectedOrder.items?.map((item) => (
                  <div key={item.id} style={s.itemRow}>
                    <div style={{ flex: 1 }}>
                      <span style={{ color: "#1a1c2d", fontWeight: "600", fontSize: "0.95rem" }}>
                        {item.product_name}
                      </span>
                      {item.notes && (
                        <span style={{ color: "#f39c12", fontSize: "0.75rem" }}>
                          {" "}
                          · {item.notes}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        color: "#aaa",
                        fontSize: "0.85rem",
                        margin: "0 1rem",
                      }}
                    >
                      x{item.quantity}
                    </span>
                    <span
                      style={{
                        color: "#2ecc71",
                        minWidth: "80px",
                        textAlign: "right",
                      }}
                    >
                      ${parseFloat(item.subtotal).toFixed(2)}
                    </span>
                    {selectedOrder.status === "open" && (
                      <button
                        style={s.removeBtn}
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}

                {selectedOrder.status === "open" && selectedOrder.items?.length > 0 && !selectedOrder.sent_to_kitchen && (
                  <button
                    style={{
                      ...s.btnPrimary,
                      width: "100%",
                      marginTop: "1rem",
                      background: "#f39c12",
                      fontSize: "0.9rem",
                      padding: "0.8rem"
                    }}
                    onClick={handleConfirmOrder}
                  >
                    🍳 Confirmar y enviar a Cocina
                  </button>
                )}

                {selectedOrder.status === "open" && selectedOrder.sent_to_kitchen && (
                  <div style={{ marginTop: "1rem", textAlign: "center", color: "#27ae60", fontSize: "0.85rem", fontWeight: "bold" }}>
                    ✅ Pedido enviado a cocina
                  </div>
                )}
              </div>

              {/* Totales */}
              <div style={s.totalsBox}>
                <div style={s.totalRow}>
                  <span>Subtotal</span>
                  <span>${parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                <div style={s.totalRow}>
                  <span>IVA 19%</span>
                  <span>${parseFloat(selectedOrder.tax).toFixed(2)}</span>
                </div>
                <div
                  style={{
                    ...s.totalRow,
                    fontSize: "1.2rem",
                    color: "#2ecc71",
                  }}
                >
                  <strong>TOTAL</strong>
                  <strong>${parseFloat(selectedOrder.total).toFixed(2)}</strong>
                </div>
                {selectedOrder.status === "delivered" &&
                  selectedOrder.amount_received && (
                    <>
                      <div style={{ ...s.totalRow, color: "#aaa" }}>
                        <span>Recibido</span>
                        <span>
                          $
                          {parseFloat(selectedOrder.amount_received).toFixed(2)}
                        </span>
                      </div>
                      {selectedOrder.change_amount > 0 && (
                        <div
                          style={{
                            ...s.totalRow,
                            color: "#f39c12",
                            fontWeight: "bold",
                          }}
                        >
                          <span>VUELTO</span>
                          <span>
                            $
                            {parseFloat(selectedOrder.change_amount).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
              </div>

              {/* Acciones */}
              {selectedOrder.status === "billed" && (
                <div style={{ marginTop: "1rem" }}>
                  <p
                    style={{
                      color: "#aaa",
                      fontSize: "0.85rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Factura:{" "}
                    <strong style={{ color: "white" }}>
                      {selectedOrder.invoice_number}
                    </strong>
                  </p>
                  <button
                    style={{
                      ...s.btnPrimary,
                      width: "100%",
                      background: "#27ae60",
                    }}
                    onClick={() => {
                      setPayForm({
                        payment_method: "cash",
                        amount_received: selectedOrder.total,
                      });
                      setChangeResult(null);
                      setModal("pay");
                    }}
                  >
                    💳 Registrar pago
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal crear pedido */}
      {modal === "createOrder" && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Nuevo pedido POS</h2>
            <input
              style={s.input}
              placeholder="Mesa / referencia (opcional)"
              value={newOrder.table_ref}
              onChange={(e) =>
                setNewOrder({ ...newOrder, table_ref: e.target.value })
              }
            />
            <textarea
              style={{ ...s.input, height: "70px", resize: "none" }}
              placeholder="Notas del pedido"
              value={newOrder.notes}
              onChange={(e) =>
                setNewOrder({ ...newOrder, notes: e.target.value })
              }
            />
            <div style={s.modalBtns}>
              <button style={s.btnSecondary} onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button style={s.btnPrimary} onClick={handleCreateOrder}>
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal agregar ítem */}
      {modal === "addItem" && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>Agregar plato</h2>
            <select
              style={s.input}
              value={newItem.product_id || ""}
              onChange={(e) => {
                const selectedId = e.target.value;
                const dish = dishesData?.dishes?.find(d => String(d.id) === String(selectedId));
                if (dish) {
                  const priceObj = dish.prices?.find(p => String(p.restaurant_id) === String(restaurantId));
                  const priceVal = priceObj ? priceObj.price : 0;
                  setNewItem({
                    ...newItem,
                    product_id: dish.id,
                    product_name: dish.name,
                    unit_price: priceVal
                  });
                } else {
                  setNewItem({ ...newItem, product_id: "", product_name: "", unit_price: "" });
                }
              }}
            >
              <option value="">Seleccione un plato del menú...</option>
              {dishesData?.dishes?.map((d) => {
                const pObj = d.prices?.find(p => String(p.restaurant_id) === String(restaurantId));
                const pVal = pObj ? pObj.price : 0;
                
                // --- Nueva lógica de disponibilidad ---
                const hasInactiveIngredients = d.ingredients?.some(ing => ing.ingredient && ing.ingredient.is_active === false);
                const isUnavailable = d.is_active === false || hasInactiveIngredients;
                
                return (
                  <option key={d.id} value={d.id} disabled={isUnavailable}>
                    {d.name} {isUnavailable ? "— (AGOTADO)" : `— $${parseFloat(pVal).toFixed(2)}`}
                  </option>
                );
              })}
            </select>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                style={{ ...s.input, flex: 1 }}
                type="number"
                min="1"
                placeholder="Cantidad"
                value={newItem.quantity}
                onChange={(e) =>
                  setNewItem({ ...newItem, quantity: e.target.value })
                }
              />
              <input
                style={{ ...s.input, flex: 1, backgroundColor: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }}
                type="text"
                placeholder="Precio unitario"
                readOnly
                value={newItem.unit_price ? `$${parseFloat(newItem.unit_price).toFixed(2)}` : ""}
              />
            </div>
            {newItem.product_name && newItem.unit_price && (
              <p
                style={{
                  color: "#2ecc71",
                  fontSize: "0.85rem",
                  margin: "-0.3rem 0 0.5rem",
                }}
              >
                Subtotal: ${(newItem.quantity * newItem.unit_price).toFixed(2)}
              </p>
            )}
            <input
              style={s.input}
              placeholder="Notas del plato (opcional)"
              value={newItem.notes || ""}
              onChange={(e) =>
                setNewItem({ ...newItem, notes: e.target.value })
              }
            />
            <div style={s.modalBtns}>
              <button style={s.btnSecondary} onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button
                style={s.btnPrimary}
                onClick={handleAddItem}
                disabled={!newItem.product_name || !newItem.unit_price}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal facturar */}
      {modal === "bill" && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>🧾 Generar factura</h2>
            <p
              style={{
                color: "#aaa",
                fontSize: "0.85rem",
                margin: "-0.5rem 0 1rem",
              }}
            >
              Total:{" "}
              <strong style={{ color: "#2ecc71" }}>
                ${parseFloat(selectedOrder?.total || 0).toFixed(2)}
              </strong>
            </p>
            <input
              style={s.input}
              placeholder="Nombre del cliente (opcional)"
              value={billForm.customer_name}
              onChange={(e) =>
                setBillForm({ ...billForm, customer_name: e.target.value })
              }
            />
            <input
              style={s.input}
              placeholder="CC / NIT (opcional)"
              value={billForm.customer_document}
              onChange={(e) =>
                setBillForm({ ...billForm, customer_document: e.target.value })
              }
            />
            <div style={s.modalBtns}>
              <button style={s.btnSecondary} onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button style={s.btnPrimary} onClick={handleBill}>
                Generar factura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pago */}
      {modal === "pay" && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={s.modalTitle}>💳 Registrar pago</h2>
            <div style={s.invoiceBox}>
              <div style={s.totalRow}>
                <span>Total a cobrar</span>
                <strong style={{ color: "#2ecc71" }}>
                  ${parseFloat(selectedOrder?.total || 0).toFixed(2)}
                </strong>
              </div>
            </div>
            <select
              style={s.input}
              value={payForm.payment_method}
              onChange={(e) =>
                setPayForm({ ...payForm, payment_method: e.target.value })
              }
            >
              <option value="cash">💵 Efectivo</option>
              <option value="card">💳 Tarjeta / Datáfono</option>
              <option value="nequi">📱 Nequi</option>
              <option value="daviplata">📱 Daviplata</option>
              <option value="transfer">🏦 Transferencia</option>
            </select>
            <input
              style={s.input}
              type="number"
              placeholder="Monto recibido del cliente"
              value={payForm.amount_received}
              onChange={(e) => {
                setPayForm({ ...payForm, amount_received: e.target.value });
                setChangeResult(null);
              }}
            />

            {/* Calculadora de vuelto */}
            {payForm.payment_method === "cash" && payForm.amount_received && (
              <div>
                <button
                  style={{
                    ...s.btnSecondary,
                    width: "100%",
                    marginBottom: "0.8rem",
                  }}
                  onClick={calcChange}
                >
                  🧮 Calcular vuelto
                </button>
                {changeResult && (
                  <div
                    style={{
                      ...s.invoiceBox,
                      marginBottom: "0.8rem",
                      borderLeft: `3px solid ${changeResult.ok ? "#27ae60" : "#e74c3c"}`,
                    }}
                  >
                    <div style={s.totalRow}>
                      <span>Total</span>
                      <span>${changeResult.total.toFixed(2)}</span>
                    </div>
                    <div style={s.totalRow}>
                      <span>Recibido</span>
                      <span>${changeResult.received.toFixed(2)}</span>
                    </div>
                    {changeResult.ok ? (
                      <div
                        style={{
                          ...s.totalRow,
                          color: "#f39c12",
                          fontWeight: "bold",
                          fontSize: "1.1rem",
                        }}
                      >
                        <span>VUELTO</span>
                        <span>${changeResult.change.toFixed(2)}</span>
                      </div>
                    ) : (
                      <p
                        style={{
                          color: "#e74c3c",
                          margin: "0.3rem 0 0",
                          fontSize: "0.85rem",
                        }}
                      >
                        ⚠ Monto insuficiente — faltan $
                        {Math.abs(changeResult.change).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={s.modalBtns}>
              <button style={s.btnSecondary} onClick={() => setModal(null)}>
                Cancelar
              </button>
              <button
                style={s.btnPrimary}
                onClick={handlePay}
                disabled={!payForm.amount_received}
              >
                Confirmar pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal resultado vuelto post-pago */}
      {modal === "changeResult" && changeResult && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2
              style={{
                marginBottom: "1.2rem",
                color: "#1a1c2d",
                textAlign: "center",
                fontSize: "1.3rem",
                fontWeight: "900",
              }}
            >
              ✅ Pago registrado
            </h2>
            <div
              style={{
                ...s.invoiceBox,
                textAlign: "center",
                marginBottom: "1.5rem",
              }}
            >
              <p
                style={{
                  color: "#888",
                  fontSize: "0.9rem",
                  margin: "0 0 0.5rem",
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}
              >
                Total Cobrado
              </p>
              <p
                style={{
                  fontSize: "1.8rem",
                  color: "#2e7d32",
                  margin: "0 0 1rem",
                  fontWeight: "900",
                  letterSpacing: "-0.5px",
                }}
              >
                ${parseFloat(changeResult.total).toFixed(2)}
              </p>
              {changeResult.change > 0 && (
                <>
                  <p
                    style={{
                      color: "#888",
                      fontSize: "0.85rem",
                      margin: "1rem 0 0.3rem",
                      fontWeight: "600",
                      textTransform: "uppercase",
                    }}
                  >
                    Devolver al cliente
                  </p>
                  <p
                    style={{
                      fontSize: "2.4rem",
                      color: "#ef6c00",
                      fontWeight: "900",
                      margin: 0,
                    }}
                  >
                    ${parseFloat(changeResult.change).toFixed(2)}
                  </p>
                </>
              )}
              {changeResult.change === 0 && (
                <p style={{ color: "#2e7d32", fontWeight: "700" }}>
                  Pago exacto — sin vuelto
                </p>
              )}
            </div>
            <div style={s.modalBtns}>
              <button
                style={s.btnSecondary}
                onClick={() => {
                  setModal(null);
                  handlePrint(selectedOrder);
                }}
              >
                🖨 Imprimir
              </button>
              <button
                style={s.btnPrimary}
                onClick={() => {
                  setModal(null);
                  setSelectedOrder(null);
                }}
              >
                Siguiente pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal entregar + facturar + pagar */}
      {modal === "deliverFull" && (
        <div style={s.overlay} onClick={() => setModal(null)}>
          <div
            style={{ ...s.modal, maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={s.modalTitle}>🛎 Entregar y cobrar</h2>
            <div style={{ ...s.invoiceBox, marginBottom: "1rem" }}>
              <div style={s.totalRow}>
                <span>Total a cobrar</span>
                <strong style={{ color: "#2ecc71" }}>
                  ${parseFloat(selectedOrder?.total || 0).toFixed(2)}
                </strong>
              </div>
            </div>

            <input
              style={s.input}
              placeholder="Nombre del cliente (opcional)"
              value={deliverForm.customer_name}
              onChange={(e) =>
                setDeliverForm({
                  ...deliverForm,
                  customer_name: e.target.value,
                })
              }
            />
            <input
              style={s.input}
              placeholder="CC / NIT (opcional)"
              value={deliverForm.customer_document}
              onChange={(e) =>
                setDeliverForm({
                  ...deliverForm,
                  customer_document: e.target.value,
                })
              }
            />

            <p
              style={{
                color: "#888",
                fontSize: "0.8rem",
                margin: "0 0 0.8rem",
                textTransform: "uppercase",
              }}
            >
              Método de pago
            </p>

            {/* Opción efectivo */}
            <div
              style={{
                background: "#f1f3f5",
                borderRadius: "12px",
                padding: "1.2rem",
                marginBottom: "1rem",
                border: "1px solid #e9ecef",
              }}
            >
              <p
                style={{
                  color: "#1a1c2d",
                  margin: "0 0 0.8rem",
                  fontSize: "0.95rem",
                  fontWeight: "700",
                }}
              >
                💵 Efectivo
              </p>
              <input
                style={s.input}
                type="number"
                placeholder="Monto recibido"
                value={deliverForm.amount_received}
                onChange={(e) =>
                  setDeliverForm({
                    ...deliverForm,
                    amount_received: e.target.value,
                    payment_method: "cash",
                  })
                }
              />
              {deliverForm.amount_received &&
                parseFloat(deliverForm.amount_received) >=
                parseFloat(selectedOrder?.total || 0) && (
                  <p
                    style={{
                      color: "#f39c12",
                      fontWeight: "bold",
                      margin: "0.3rem 0 0",
                    }}
                  >
                    Vuelto: $
                    {(
                      parseFloat(deliverForm.amount_received) -
                      parseFloat(selectedOrder?.total || 0)
                    ).toFixed(2)}
                  </p>
                )}
              {deliverForm.amount_received &&
                parseFloat(deliverForm.amount_received) <
                parseFloat(selectedOrder?.total || 0) && (
                  <p
                    style={{
                      color: "#e74c3c",
                      fontSize: "0.85rem",
                      margin: "0.3rem 0 0",
                    }}
                  >
                    ⚠ Monto insuficiente
                  </p>
                )}
              <button
                style={{
                  ...s.btnPrimary,
                  background: "#9b59b6",
                  width: "100%",
                  marginTop: "0.8rem",
                }}
                onClick={handleDeliverFull}
                disabled={
                  !deliverForm.amount_received ||
                  parseFloat(deliverForm.amount_received) <
                  parseFloat(selectedOrder?.total || 0)
                }
              >
                ✅ Confirmar cobro en efectivo
              </button>
            </div>

            {/* Opción MercadoPago */}
            <div
              style={{
                background: "#e3f2fd",
                borderRadius: "12px",
                padding: "1.2rem",
                border: "1px solid #bbdefb",
              }}
            >
              <p
                style={{
                  color: "#0d47a1",
                  margin: "0 0 1rem",
                  fontSize: "0.95rem",
                  fontWeight: "700",
                }}
              >
                💳 PayPal (USD)
              </p>
              <PayPalButtons
                style={{ layout: "vertical", height: 35 }}
                createOrder={async () => {
                  const res = await fetch(
                    "http://localhost:3004/create-paypal-order",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        order_id: selectedOrder.id,
                        total: selectedOrder.total,
                      }),
                    },
                  );
                  const order = await res.json();
                  return order.id;
                }}
                onApprove={async (data) => {
                  await handleDeliverWithPayPal(data.orderID, selectedOrder.id);
                }}
              />
            </div>

            <button
              style={{ ...s.btnSecondary, width: "100%", marginTop: "0.8rem" }}
              onClick={() => setModal(null)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal resultado entrega */}
      {modal === "deliverResult" && deliverChange && (
        <div style={s.overlay}>
          <div style={s.modal}>
            <h2 style={{ ...s.modalTitle, color: "#27ae60" }}>
              ✅ Entregado y cobrado
            </h2>
            <div
              style={{
                ...s.invoiceBox,
                textAlign: "center",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🍽️</div>
              <h3
                style={{
                  margin: "0 0 1rem",
                  color: "#1a1c2d",
                  fontWeight: "900",
                  textTransform: "uppercase",
                  fontSize: "1.1rem",
                }}
              >
                Factura Generada
              </h3>

              <div
                style={{
                  borderTop: "1px solid #eee",
                  paddingTop: "1rem",
                  marginTop: "0.5rem",
                }}
              >
                <p
                  style={{
                    color: "#888",
                    fontSize: "0.85rem",
                    margin: "0 0 0.3rem",
                    fontWeight: "600",
                    textTransform: "uppercase",
                  }}
                >
                  Total Cobrado
                </p>
                <p
                  style={{
                    fontSize: "1.6rem",
                    color: "#2e7d32",
                    margin: "0 0 1rem",
                    fontWeight: "900",
                  }}
                >
                  ${deliverChange.total.toFixed(2)}
                </p>

                {deliverChange.change > 0 && (
                  <>
                    <p
                      style={{
                        color: "#888",
                        fontSize: "0.8rem",
                        margin: "1rem 0 0.2rem",
                        fontWeight: "600",
                        textTransform: "uppercase",
                      }}
                    >
                      Vuelto al cliente
                    </p>
                    <p
                      style={{
                        fontSize: "2.2rem",
                        color: "#ef6c00",
                        fontWeight: "900",
                        margin: 0,
                      }}
                    >
                      ${deliverChange.change.toFixed(2)}
                    </p>
                  </>
                )}
                {deliverChange.change === 0 && (
                  <p
                    style={{
                      color: "#2e7d32",
                      fontWeight: "800",
                      marginTop: "1rem",
                    }}
                  >
                    ✓ Pago Exacto
                  </p>
                )}
              </div>
            </div>
            <div style={s.modalBtns}>
              <button
                style={s.btnSecondary}
                onClick={async () => {
                  setModal(null);
                  const res = await refetch();
                  const updated = res.data.posOrders.find(
                    (o) => o.id === selectedOrder.id,
                  );
                  if (updated) handlePrint(updated);
                }}
              >
                🖨 Imprimir factura
              </button>
              <button
                style={s.btnPrimary}
                onClick={() => {
                  setModal(null);
                  setSelectedOrder(null);
                }}
              >
                Siguiente pedido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  title: { margin: 0, fontSize: "1.8rem", color: "#1a1c2d", fontWeight: "800" },
  sub: { color: "#888", fontSize: "0.9rem", fontWeight: "500" },
  layout: {
    display: "grid",
    gridTemplateColumns: "320px 1fr",
    gap: "1.5rem",
    height: "calc(100vh - 160px)",
  },
  orderList: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "1.2rem",
    overflowY: "auto",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    border: "1px solid #f0f0f0",
  },
  orderCard: {
    borderRadius: "12px",
    padding: "1rem",
    marginBottom: "0.8rem",
    cursor: "pointer",
    transition: "all 0.3s ease",
    background: "#f8f9fa",
    border: "1px solid #eee",
  },
  cardInfo: { margin: "0.3rem 0", color: "#666", fontSize: "0.85rem" },
  detail: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "2rem",
    overflowY: "auto",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    border: "1px solid #f0f0f0",
  },
  detailHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #f1f3f5",
  },
  itemsBox: {
    background: "#f8f9fa",
    borderRadius: "12px",
    padding: "1.2rem",
    marginBottom: "1.5rem",
    minHeight: "150px",
    border: "1px solid #e9ecef",
  },
  itemRow: {
    display: "flex",
    alignItems: "center",
    padding: "0.8rem 0",
    borderBottom: "1px solid #f1f3f5",
    color: "#333",
  },
  totalsBox: {
    background: "#f8f9fa",
    borderRadius: "12px",
    padding: "1.5rem",
    border: "1px solid #e9ecef",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    margin: "0.5rem 0",
    color: "#444",
    fontSize: "1rem",
  },
  removeBtn: {
    background: "#fff1f0",
    color: "#f5222d",
    border: "1px solid #ffa39e",
    borderRadius: "6px",
    padding: "0.2rem 0.6rem",
    cursor: "pointer",
    marginLeft: "0.5rem",
    fontSize: "0.75rem",
    fontWeight: "700",
  },
  sectionTitle: {
    color: "#999",
    fontSize: "0.75rem",
    margin: "0 0 0.8rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    fontWeight: "700",
  },
  empty: {
    color: "#aaa",
    fontSize: "0.9rem",
    textAlign: "center",
    padding: "2rem 0",
  },
  emptyDetail: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#ccc",
  },
  badge: {
    padding: "0.3rem 0.7rem",
    borderRadius: "20px",
    fontSize: "0.7rem",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  btnPrimary: {
    background: "#f4511e",
    color: "white",
    border: "none",
    padding: "0.7rem 1.4rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "700",
    boxShadow: "0 4px 12px rgba(244, 81, 30, 0.25)",
  },
  btnSecondary: {
    background: "#f1f3f5",
    color: "#495057",
    border: "none",
    padding: "0.7rem 1.4rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },
  btnSm: {
    background: "#f8f9fa",
    color: "#555",
    border: "1px solid #ddd",
    padding: "0.35rem 0.8rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600",
  },
  timeBtn: {
    flex: 1,
    border: "none",
    padding: "0.5rem",
    borderRadius: "8px",
    fontSize: "0.85rem",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.2s ease",
    color: "#1a1c2d",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    background: "#fff",
    border: "1.5px solid #eee",
    borderRadius: "12px",
    padding: "0 0.8rem",
    height: "42px",
    transition: "all 0.3s ease",
  },
  searchInput: {
    border: "none",
    outline: "none",
    width: "100%",
    fontSize: "0.9rem",
    color: "#333",
    background: "transparent",
  },
  filterBtn: {
    padding: "0.4rem 0.8rem",
    borderRadius: "20px",
    border: "1.5px solid #eee",
    fontSize: "0.75rem",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s ease",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(26, 28, 45, 0.6)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "2.5rem",
    width: "480px",
    maxWidth: "92vw",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  modalTitle: {
    margin: "0 0 1.5rem",
    color: "#1a1c2d",
    fontSize: "1.4rem",
    fontWeight: "800",
  },
  modalBtns: {
    display: "flex",
    gap: "1rem",
    marginTop: "2rem",
    justifyContent: "flex-end",
  },
  input: {
    width: "100%",
    background: "#f8f9fa",
    border: "1px solid #e9ecef",
    color: "#333",
    padding: "0.8rem 1rem",
    borderRadius: "10px",
    marginBottom: "1rem",
    fontSize: "0.95rem",
    boxSizing: "border-box",
    outline: "none",
  },
  invoiceBox: {
    background: "#f8f9fa",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
    border: "1px solid #e9ecef",
  },
  toast: {
    position: "fixed",
    bottom: "2rem",
    right: "2rem",
    padding: "1rem 2rem",
    borderRadius: "12px",
    color: "white",
    zIndex: 2000,
    fontWeight: "700",
    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
  },
  loginWrap: {
    minHeight: "100vh",
    background: "#f8f9fa",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loginBox: {
    background: "#ffffff",
    borderRadius: "24px",
    padding: "3.5rem",
    width: "400px",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.06)",
    border: "1px solid #f0f0f0",
  },
  loginTitle: {
    color: "#1a1c2d",
    margin: "0 0 0.5rem",
    fontSize: "1.8rem",
    fontWeight: "900",
  },
};
