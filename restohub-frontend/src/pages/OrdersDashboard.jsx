import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { PayPalButtons } from "@paypal/react-paypal-js";
import { useAuth } from "../context/AuthContext";
import { GET_DISHES } from "../graphql/menu";
import {
  GET_ORDERS,
  GET_ORDER_ITEMS,
  GET_INVOICE,
  GET_PAYMENT,
  GET_PAID_INVOICES,
  GET_CUSTOMER,
  CREATE_ORDER,
  ADD_ITEMS,
  UPDATE_STATUS,
  UPDATE_PRIORITY,
  GENERATE_INVOICE,
  CREATE_PAYMENT,
} from "../graphql/orders";
import { GET_LOCATIONS } from "../graphql/location";
import {
  Flame, Salad, Wine, Bike,
  ClipboardList, RefreshCw, Store,
  User, Smartphone, MapPin, FileText,
  CheckCircle, CheckCircle2, XCircle,
  Package, ChefHat, Truck,
  ReceiptText, CreditCard, ListOrdered
} from "lucide-react";

// ───────────────── CONFIG ─────────────────
const STATUS_COLORS = {
  pending: "#fff3e0",
  validated: "#e3f2fd",
  in_preparation: "#f3e5f5",
  packing: "#e0f2f1",
  ready: "#e8f5e9",
  delivered: "#2e7d32",
  cancelled: "#ffebee",
};

const STATUS_TEXT_COLORS = {
  pending: "#ef6c00",
  validated: "#1976d2",
  in_preparation: "#7b1fa2",
  packing: "#00796b",
  ready: "#2e7d32",
  delivered: "#ffffff",
  cancelled: "#c62828",
};

const STATUS_LABELS = {
  pending: "Pendiente",
  in_preparation: "Preparando",
  packing: "Empacando",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const PRIORITY_COLORS = { low: "#f5f5f5", normal: "#e3f2fd", high: "#fff3e0" };
const PRIORITY_TEXT = { low: "#757575", normal: "#1976d2", high: "#ef6c00" };
const PRIORITY_LABELS = { low: "↓ Baja", normal: "→ Normal", high: "↑ Alta" };

const AREA_LABELS = {
  hot_kitchen: "Cocina Caliente",
  cold_kitchen: "Cocina Fría",
  bar: "Bar / Bebidas",
  delivery: "Domicilios",
};

const AREA_ICONS = {
  hot_kitchen: <Flame size={13} />,
  cold_kitchen: <Salad size={13} />,
  bar: <Wine size={13} />,
  delivery: <Bike size={13} />,
};

const ORDER_ALLOWED_TRANSITIONS = {
  pending: ["validated", "cancelled"],
  validated: ["cancelled"],
  in_preparation: [],
  packing: [],
  ready: [],
  delivered: [],
  cancelled: [],
};

// ───────────────── HELPERS ─────────────────
const money = (v) => `$${parseFloat(v || 0).toFixed(2)}`;
const shortId = (id) => id?.slice(0, 8) || "—";

const getElapsed = (from, to = null) => {
  if (!from) return 0;
  const start = new Date(from);
  const end = to ? new Date(to) : new Date();
  return Math.max(0, Math.round((end - start) / 60000));
};

const getCurrentPhaseMinutes = (order) => {
  switch (order.status) {
    case "pending":
      return getElapsed(order.created_at);
    case "validated":
      return getElapsed(order.validated_at);
    case "in_preparation":
      return getElapsed(order.preparation_started_at);
    case "packing":
      return getElapsed(order.packing_at);
    case "ready":
      return getElapsed(order.packing_at, order.ready_at);
    case "delivered":
      return getElapsed(order.created_at, order.delivered_at);
    default:
      return 0;
  }
};

// ───────────────── TIMER ─────────────────
function LiveTimer({ order }) {
  const [mins, setMins] = useState(getCurrentPhaseMinutes(order));

  useEffect(() => {
    if (["delivered", "cancelled", "ready"].includes(order.status)) return;
    const interval = setInterval(
      () => setMins(getCurrentPhaseMinutes(order)),
      30000,
    );
    return () => clearInterval(interval);
  }, [order]);

  const isOverdue =
    mins > (order.estimated_preparation_time || 20) &&
    !["delivered", "cancelled", "ready"].includes(order.status);

  return (
    <span
      style={{
        ...s.timerBadge,
        background: isOverdue ? "#fff1f0" : "#f8f9fa",
        color: isOverdue ? "#f5222d" : "#ef6c00",
        border: `1px solid ${isOverdue ? "#ffa39e" : "#ffe2c2"}`,
      }}
    >
      ⏱ {mins} min {isOverdue ? "· DEMORADO" : ""}
    </span>
  );
}

// ───────────────── CUSTOMER NAME ─────────────────
function CustomerName({ customerId }) {
  const { data } = useQuery(GET_CUSTOMER, {
    variables: { id: customerId },
    skip: !customerId,
    fetchPolicy: "cache-first",
  });
  const c = data?.customer;
  if (!c) return <span style={{ opacity: 0.6 }}>{customerId?.slice(0, 8) || "—"}</span>;
  return <span style={{ fontWeight: 700 }}>{c.name}</span>;
}

// ───────────────── LOCATION NAME ─────────────────
function LocationName({ locationId, locations }) {
  const loc = locations?.find((l) => String(l.id) === String(locationId));
  if (!loc) return <span style={{ opacity: 0.6 }}>{locationId}</span>;
  return <span style={{ fontWeight: 700 }}>{loc.name}</span>;
}

// ───────────────── ITEMS MODAL ─────────────────
function ItemsModal({ order, onClose }) {
  const { data, loading } = useQuery(GET_ORDER_ITEMS, {
    variables: { order_id: order.id },
  });

  const items = data?.orderItems || [];
  const total = items.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);

  return (
    <Modal title={`Ítems del pedido #${shortId(order.id)}`} onClose={onClose}>
      {loading ? (
        <p style={s.muted}>Cargando...</p>
      ) : items.length === 0 ? (
        <p style={s.muted}>Este pedido no tiene ítems.</p>
      ) : (
        <>
          {items.map((item) => (
            <div key={item.id} style={s.invoiceRow}>
              <span>
                {item.product_name} x{item.quantity}
              </span>
              <strong>{money(item.subtotal)}</strong>
            </div>
          ))}
          <hr style={s.hr} />
          <div style={{ ...s.invoiceRow, color: "#2ecc71" }}>
            <strong>Total</strong>
            <strong>{money(total)}</strong>
          </div>
        </>
      )}
    </Modal>
  );
}

// ───────────────── HISTORIAL MODAL ─────────────────
function HistoryModal({ invoices, onClose, onShowInvoice }) {
  const [filter, setFilter] = useState("all");

  const filtered = filter === "all" 
    ? invoices 
    : invoices.filter(inv => inv.status === filter);

  return (
    <Modal title="Historial de Facturas" onClose={onClose} width="800px">
      <div style={{ ...s.filters, marginBottom: "1.5rem" }}>
        <button 
          style={{ ...s.filterBtn, background: filter === "all" ? "#f4511e" : "#eee", color: filter === "all" ? "#fff" : "#333", padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
          onClick={() => setFilter("all")}
        >
          Todas
        </button>
        <button 
          style={{ ...s.filterBtn, background: filter === "paid" ? "#2ecc71" : "#eee", color: filter === "paid" ? "#fff" : "#333", padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
          onClick={() => setFilter("paid")}
        >
          Pagadas
        </button>
        <button 
          style={{ ...s.filterBtn, background: filter === "pending" ? "#f39c12" : "#eee", color: filter === "pending" ? "#fff" : "#333", padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
          onClick={() => setFilter("pending")}
        >
          Pendientes
        </button>
        <button 
          style={{ ...s.filterBtn, background: filter === "cancelled" ? "#e74c3c" : "#eee", color: filter === "cancelled" ? "#fff" : "#333", padding: "0.4rem 0.8rem", fontSize: "0.75rem" }}
          onClick={() => setFilter("cancelled")}
        >
          Anuladas
        </button>
      </div>

      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {filtered.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999", padding: "2rem" }}>No hay facturas en esta categoría.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #eee", fontSize: "0.8rem", color: "#888" }}>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Factura</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Cliente</th>
                <th style={{ textAlign: "left", padding: "0.5rem" }}>Fecha / Hora</th>
                <th style={{ textAlign: "right", padding: "0.5rem" }}>Total</th>
                <th style={{ textAlign: "center", padding: "0.5rem" }}>Estado</th>
                <th style={{ textAlign: "center", padding: "0.5rem" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(inv => (
                <tr key={inv.id} style={{ borderBottom: "1px solid #f9f9f9", fontSize: "0.85rem" }}>
                  <td style={{ padding: "0.7rem 0.5rem", fontWeight: 700 }}>{inv.invoice_number?.replace("FAC-","")}</td>
                  <td style={{ padding: "0.7rem 0.5rem" }}>{inv.customer_name}</td>
                  <td style={{ padding: "0.7rem 0.5rem", fontSize: "0.75rem", color: "#666" }}>
                    {new Date(inv.created_at).toLocaleString('es-CO', { 
                      day: '2-digit', month: '2-digit', year: '2-digit',
                      hour: '2-digit', minute: '2-digit' 
                    })}
                  </td>
                  <td style={{ padding: "0.7rem 0.5rem", textAlign: "right", fontWeight: 700 }}>{money(inv.total)}</td>
                  <td style={{ padding: "0.7rem 0.5rem", textAlign: "center" }}>
                    <span style={{ 
                      padding: "2px 6px", 
                      borderRadius: "4px", 
                      fontSize: "0.7rem", 
                      background: inv.status === "paid" ? "#e8f5e9" : 
                                 inv.status === "cancelled" ? "#ffebee" : "#fff3e0",
                      color: inv.status === "paid" ? "#2e7d32" : 
                             inv.status === "cancelled" ? "#c62828" : "#ef6c00"
                    }}>
                      {inv.status === "paid" ? "PAGADA" : 
                       inv.status === "cancelled" ? "ANULADA" : "PENDIENTE"}
                    </span>
                  </td>
                  <td style={{ padding: "0.7rem 0.5rem", textAlign: "center" }}>
                    <button 
                      style={{ ...s.btnSm, padding: "2px 8px" }}
                      onClick={() => onShowInvoice(inv)}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ ...s.modalBtns, marginTop: "1rem" }}>
        <button style={s.btnPrimary} onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}

// ───────────────── FACTURA MODAL ─────────────────
function InvoiceModal({ order, onClose, showMsg }) {
  // ── Cargar datos del cliente automáticamente ──
  const { data: customerData } = useQuery(GET_CUSTOMER, {
    variables: { id: order.customer_id },
    skip: !order.customer_id,
    fetchPolicy: "cache-first",
  });

  const customer = customerData?.customer;

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_document: "",
  });
  const [step, setStep] = useState("form");
  const [invoiceData, setInvoiceData] = useState(null);

  // Pre-rellenar form cuando llega la info del cliente
  useEffect(() => {
    if (customer && !form.customer_name) {
      setForm((prev) => ({
        ...prev,
        customer_name: customer.name || "",
        customer_email: customer.email || "",
      }));
    }
  }, [customer]); // eslint-disable-line

  const { data: existingInvoice } = useQuery(GET_INVOICE, {
    variables: { order_id: order.id },
    fetchPolicy: "network-only",
  });

  const { data: itemsData } = useQuery(GET_ORDER_ITEMS, {
    variables: { order_id: order.id },
    fetchPolicy: "network-only",
  });

  const [generateInvoice, { loading }] = useMutation(GENERATE_INVOICE);

  useEffect(() => {
    if (existingInvoice?.orderInvoice && !invoiceData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInvoiceData(existingInvoice.orderInvoice);
      setStep("preview");
    }
  }, [existingInvoice, invoiceData]);

  const items = itemsData?.orderItems || [];

  const handleGenerate = async () => {
    try {
      const res = await generateInvoice({
        variables: { order_id: order.id, ...form },
      });
      setInvoiceData(res.data.generateInvoice);
      setStep("preview");
      showMsg("Factura generada");
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("invoice-print-area");
    if (!printContent) return;

    const win = window.open("", "", "width=900,height=700");
    win.document.write(`
      <html>
        <head>
          <title>Factura ${invoiceData?.invoice_number || ""}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              padding: 40px;
              color: #1a1c2d;
              max-width: 800px;
              margin: auto;
              line-height: 1.5;
            }
            .header-title {
              text-align: center;
              font-size: 24px;
              font-weight: 900;
              margin-bottom: 30px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .info-block {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-col div {
              margin-bottom: 5px;
              font-size: 14px;
            }
            .label { color: #888; font-weight: 500; }
            .value { font-weight: 700; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 30px 0;
            }
            th {
              text-align: left;
              padding: 12px 8px;
              border-bottom: 2px solid #1a1c2d;
              font-size: 13px;
              text-transform: uppercase;
              color: #888;
            }
            td {
              padding: 12px 8px;
              border-bottom: 1px solid #f1f3f5;
              font-size: 14px;
            }
            .totals-table {
              width: 250px;
              margin-left: auto;
              margin-top: 20px;
            }
            .totals-table td { border: none; padding: 5px 8px; }
            .grand-total {
              font-size: 20px;
              font-weight: 900;
              color: #2e7d32;
              border-top: 2px solid #f1f3f5 !important;
              padding-top: 15px !important;
            }
            .badge {
              text-align: center;
              margin-top: 40px;
              padding: 8px 16px;
              border-radius: 6px;
              border: 1px solid #2e7d32;
              color: #2e7d32;
              display: inline-block;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Modal title="Factura" onClose={onClose}>
      {step === "form" ? (
        <>
          <input
            style={s.input}
            placeholder="Nombre del cliente *"
            value={form.customer_name}
            onChange={(e) =>
              setForm({ ...form, customer_name: e.target.value })
            }
          />
          <input
            style={s.input}
            placeholder="Documento"
            value={form.customer_document}
            onChange={(e) =>
              setForm({ ...form, customer_document: e.target.value })
            }
          />
          <input
            style={s.input}
            placeholder="Email"
            value={form.customer_email}
            onChange={(e) =>
              setForm({ ...form, customer_email: e.target.value })
            }
          />

          <div style={s.modalBtns}>
            <button style={s.btnSecondary} onClick={onClose}>
              Cancelar
            </button>
            <button
              style={s.btnPrimary}
              onClick={handleGenerate}
              disabled={!form.customer_name || loading}
            >
              {loading ? "Generando..." : "Generar factura"}
            </button>
          </div>
        </>
      ) : (
        invoiceData && (
          <>
            <div id="invoice-print-area" style={{ padding: "1rem" }}>
              <div
                className="header-title"
                style={{ textAlign: "center", marginBottom: "2rem" }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                  🍽️
                </div>
                <h2
                  style={{
                    margin: 0,
                    color: "#1a1c2d",
                    fontWeight: "900",
                    textTransform: "uppercase",
                  }}
                >
                  Factura de Venta
                </h2>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "2rem",
                }}
              >
                <div>
                  <div style={s.muted}>FACTURA</div>
                  <div style={{ fontWeight: "700" }}>
                    {invoiceData.invoice_number}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={s.muted}>FECHA</div>
                  <div style={{ fontWeight: "700" }}>
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: "#f8f9fa",
                  padding: "1.2rem",
                  borderRadius: "12px",
                  marginBottom: "2rem",
                }}
              >
                <div style={s.muted}>CLIENTE</div>
                <div
                  style={{
                    fontWeight: "800",
                    fontSize: "1.1rem",
                    color: "#1a1c2d",
                  }}
                >
                  {invoiceData.customer_name}
                </div>
                {invoiceData.customer_document && (
                  <div style={{ fontSize: "0.9rem", color: "#666" }}>
                    CC/NIT: {invoiceData.customer_document}
                  </div>
                )}
                {invoiceData.customer_email && (
                  <div style={{ fontSize: "0.9rem", color: "#666" }}>
                    {invoiceData.customer_email}
                  </div>
                )}
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #1a1c2d" }}>
                    <th
                      style={{
                        textAlign: "left",
                        padding: "10px 0",
                        color: "#888",
                        fontSize: "0.8rem",
                      }}
                    >
                      PRODUCTO
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        padding: "10px 0",
                        color: "#888",
                        fontSize: "0.8rem",
                      }}
                    >
                      CANT
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "10px 0",
                        color: "#888",
                        fontSize: "0.8rem",
                      }}
                    >
                      TOTAL
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: "1px solid #f1f3f5" }}
                    >
                      <td style={{ padding: "12px 0", fontWeight: "600" }}>
                        {item.product_name}
                      </td>
                      <td style={{ textAlign: "center", color: "#666" }}>
                        {item.quantity}
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "700" }}>
                        {money(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ width: "100%", marginTop: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "2rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span style={s.muted}>SUBTOTAL</span>
                  <span
                    style={{
                      fontWeight: "700",
                      minWidth: "80px",
                      textAlign: "right",
                    }}
                  >
                    {money(invoiceData.subtotal)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "2rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span style={s.muted}>IVA (19%)</span>
                  <span
                    style={{
                      fontWeight: "700",
                      minWidth: "80px",
                      textAlign: "right",
                    }}
                  >
                    {money(invoiceData.tax)}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "2rem",
                    marginTop: "1rem",
                    paddingTop: "1rem",
                    borderTop: "2px solid #f1f3f5",
                  }}
                >
                  <span style={{ fontWeight: "900", color: "#1a1c2d" }}>
                    TOTAL
                  </span>
                  <span
                    style={{
                      fontWeight: "900",
                      fontSize: "1.4rem",
                      color: "#2e7d32",
                      minWidth: "100px",
                      textAlign: "right",
                    }}
                  >
                    {money(invoiceData.total)}
                  </span>
                </div>
              </div>

              <div
                style={{
                  marginTop: "2.5rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span style={s.muted}>MEDIO DE PAGO: </span>
                  <span style={{ fontWeight: "700", color: "#1976d2" }}>
                    {invoiceData.payment_method === "reward"
                      ? "🎁 Canje de Puntos"
                      : invoiceData.payment_method === "paypal" || order.channel === "web"
                      ? "💳 PayPal"
                      : "💵 Efectivo"}
                  </span>
                </div>
                <div
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "6px",
                    border: "1px solid #2e7d32",
                    color: "#2e7d32",
                    fontSize: "0.75rem",
                    fontWeight: "900",
                    textTransform: "uppercase",
                  }}
                >
                  {invoiceData.status === "paid" || invoiceData.total === 0 && invoiceData.status === "paid"
                    ? "✓ Completado"
                    : "⏳ Pendiente"}
                </div>
              </div>
            </div>

            <div style={s.modalBtns}>
              <button style={s.btnSecondary} onClick={handlePrint}>
                🖨 Imprimir
              </button>
              <button style={s.btnPrimary} onClick={onClose}>
                Cerrar
              </button>
            </div>
          </>
        )
      )}
    </Modal>
  );
}

// ───────────────── PAGO MODAL ─────────────────
function PaymentModal({ order, onClose, showMsg, refetch }) {
  const [createPayment] = useMutation(CREATE_PAYMENT);
  const { data: invoiceData, refetch: refetchInvoice } = useQuery(GET_INVOICE, {
    variables: { order_id: order.id },
    fetchPolicy: "network-only",
  });

  const { data: paymentData, refetch: refetchPayment } = useQuery(GET_PAYMENT, {
    variables: { order_id: order.id },
    fetchPolicy: "network-only",
  });

  const invoice = invoiceData?.orderInvoice;
  const payment = paymentData?.orderPayment;

  const handlePayWithPayPal = async (orderID, order_id) => {
    try {
      const res = await fetch("http://localhost:3001/capture-paypal-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderID, order_id }),
      });
      const data = await res.json();
      if (data.status === "success") {
        await refetchInvoice();
        await refetchPayment();
        await refetch();
        showMsg("✅ Pago con PayPal confirmado");
        onClose();
      } else {
        throw new Error("Error al capturar el pago");
      }
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  return (
    <Modal title="Registrar Pago" onClose={onClose}>
      {!invoice ? (
        <p style={{ color: "#e74c3c" }}>
          Primero debes generar la factura del pedido.
        </p>
      ) : payment || invoice.status === "paid" ? (
        <div style={s.invoiceBox}>
          <div style={s.invoiceRow}>
            <span>Estado factura</span>
            <strong style={{ color: "#2ecc71" }}>Pago completado</strong>
          </div>
          <div style={s.invoiceRow}>
            <span>Método</span>
            <strong>{invoice.payment_method || payment?.method || "—"}</strong>
          </div>
          <div style={s.invoiceRow}>
            <span>Total</span>
            <strong>{money(invoice.total)}</strong>
          </div>
        </div>
      ) : (
        <>
          <div style={{ ...s.invoiceBox, marginBottom: "1rem" }}>
            <div style={s.invoiceRow}>
              <span>Factura</span>
              <strong>{invoice.invoice_number}</strong>
            </div>
            <div style={s.invoiceRow}>
              <span>Estado</span>
              <strong style={{ color: "#f39c12" }}>Pago pendiente</strong>
            </div>
            <div style={{ ...s.invoiceRow, color: "#2ecc71" }}>
              <span>Total a pagar</span>
              <strong>{money(invoice.total)}</strong>
            </div>
          </div>

          <div style={s.modalBtns}>
            <button style={s.btnSecondary} onClick={onClose}>
              Cancelar
            </button>
            <div style={{ flex: 1 }}>
              {invoice.total > 0 ? (
                <PayPalButtons
                  style={{ layout: "vertical", height: 35 }}
                  createOrder={async () => {
                    const res = await fetch(
                      "http://localhost:3001/create-paypal-order",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          order_id: order.id,
                          total: invoice.total, // Usamos el total real, si es 0 PayPal fallará (así que lo controlamos arriba)
                        }),
                      },
                    );
                    const paypalOrder = await res.json();
                    if (paypalOrder.error) throw new Error(paypalOrder.error);
                    return paypalOrder.id;
                  }}
                  onApprove={async (data) => {
                    await handlePayWithPayPal(data.orderID, order.id);
                  }}
                />
              ) : (
                <button
                  style={{ ...s.btnPrimary, background: "#2ecc71", width: "100%", boxShadow: "0 4px 12px rgba(46, 204, 113, 0.2)" }}
                  onClick={async () => {
                    try {
                      const { data } = await createPayment({
                        variables: {
                          order_id: order.id,
                          method: "canje_puntos",
                          amount: 0,
                        },
                      });
                      if (data) {
                        showMsg("✅ Premio marcado como canjeado con éxito");
                        await refetch();
                        onClose();
                      }
                    } catch (e) {
                      showMsg(e.message, "error");
                    }
                  }}
                >
                  🎁 Confirmar Canje de Premio ($0)
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

// ───────────────── MODAL GENÉRICO ─────────────────
function Modal({ title, children, onClose, width }) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div 
        style={{ ...s.modal, width: width || s.modal.width }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>{title}</h2>
          <button style={s.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ───────────────── TARJETA ─────────────────
function OrderCard({
  order,
  selected,
  onSelect,
  onStatusChange,
  onPriorityChange,
  onOpenModal,
  locations,
}) {
  const nextSteps = ORDER_ALLOWED_TRANSITIONS[order.status] || [];
  const canInvoice = ["ready", "delivered"].includes(order.status);
  const canPay = order.status === "ready";

  return (
    <div
      style={{
        ...s.card,
        borderLeft: `4px solid ${STATUS_COLORS[order.status]}`,
        background: selected ? "#fff9f7" : "#ffffff",
        boxShadow: selected
          ? "0 4px 15px rgba(244, 81, 30, 0.15)"
          : "0 4px 10px rgba(0,0,0,0.03)",
        borderColor: selected ? "#f4511e" : "#f0f0f0",
      }}
      onClick={() => onSelect(order.id)}
    >
      <div style={s.cardHeader}>
        <span style={s.orderId}>#{shortId(order.id)}</span>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <span
            style={{
              ...s.badge,
              background: PRIORITY_COLORS[order.priority],
              color: PRIORITY_TEXT[order.priority],
            }}
          >
            {PRIORITY_LABELS[order.priority]}
          </span>
          <span
            style={{
              ...s.badge,
              background: STATUS_COLORS[order.status],
              color: STATUS_TEXT_COLORS[order.status],
            }}
          >
            {STATUS_LABELS[order.status]}
          </span>
        </div>
      </div>

      <p style={s.info}>
        <span style={{ opacity: 0.7, display: "inline-flex", alignItems: "center" }}><Store size={13} /></span> <LocationName locationId={order.restaurant_id} locations={locations} /> ·{" "}
        <span style={{ opacity: 0.7, display: "inline-flex", alignItems: "center" }}><User size={13} /></span> <CustomerName customerId={order.customer_id} />
      </p>
      <p style={s.info}>
        <span style={{ opacity: 0.7, display: "inline-flex", alignItems: "center" }}><Smartphone size={13} /></span> {order.channel} ·{" "}
        <span style={{ opacity: 0.7, display: "inline-flex", alignItems: "center" }}><MapPin size={13} /></span> {AREA_LABELS[order.area] ? <>{AREA_ICONS[order.area]} {AREA_LABELS[order.area]}</> : order.area || "—"}
      </p>
      {order.notes && <p style={s.info}>📝 {order.notes}</p>}
      <LiveTimer order={order} />

      {selected && (
        <div style={s.expanded} onClick={(e) => e.stopPropagation()}>
          <div style={s.actionRow}>
            {order.status === "pending" && (
              <button
                style={{ ...s.btnSm, background: "#e8f5e9", color: "#2e7d32", border: "1px solid #a5d6a7", fontWeight: 700 }}
                onClick={() => onStatusChange(order.id, "validated")}
              >
                ✅ Confirmar pedido
              </button>
            )}

            {canInvoice && (
              <button
                style={s.btnSm}
                onClick={() => onOpenModal("invoice", order)}
              >
                <ReceiptText size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> Factura
              </button>
            )}

            {canPay && (
              <button
                style={s.btnSm}
                onClick={() => onOpenModal("payment", order)}
              >
                <CreditCard size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> Pago
              </button>
            )}

            <button style={s.btnSm} onClick={() => onOpenModal("items", order)}>
              <ListOrdered size={13} style={{ verticalAlign: 'middle', marginRight: '3px' }} /> Ver ítems
            </button>
          </div>

          {nextSteps.length > 0 && (
            <>
              <p style={s.sectionLabel}>Acciones disponibles:</p>
              <div style={s.btnGroup}>
                {nextSteps.map((st) => (
                  <button
                    key={st}
                    style={{ ...s.btnXS, background: STATUS_COLORS[st] }}
                    onClick={() => onStatusChange(order.id, st)}
                  >
                    {STATUS_LABELS[st]}
                  </button>
                ))}
              </div>
            </>
          )}

          {!["delivered", "cancelled"].includes(order.status) && (
            <>
              <p style={s.sectionLabel}>Prioridad:</p>
              <div style={s.btnGroup}>
                {["low", "normal", "high"].map((p) => (
                  <button
                    key={p}
                    style={{
                      ...s.btnXS,
                      background:
                        order.priority === p ? PRIORITY_COLORS[p] : "#f1f3f5",
                      color: order.priority === p ? "#fff" : "#555",
                      border: `1px solid ${order.priority === p ? PRIORITY_COLORS[p] : "#ddd"}`,
                    }}
                    onClick={() => onPriorityChange(order.id, p)}
                  >
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </>
          )}

          {["in_preparation", "packing", "ready"].includes(order.status) && (
            <p style={{ ...s.sectionLabel, color: "#f39c12" }}>
              Este estado lo gestiona Cocina.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ───────────────── PRINCIPAL ─────────────────
export default function OrdersDashboard() {
  const { user } = useAuth();
  const locationId = user?.locationId;

  const { data, loading, error, refetch, networkStatus } = useQuery(GET_ORDERS, {
    notifyOnNetworkStatusChange: true, 
  });

  const { data: invoicesData } = useQuery(GET_PAID_INVOICES, {
    fetchPolicy: "network-only",
  });

  const { data: locationsData } = useQuery(GET_LOCATIONS);

  // El "loading" de Apollo solo es true en la primera carga.
  // Con networkStatus podemos saber si está refrescando sin mostrar el spinner molesto.
  const isInitialLoading = loading && networkStatus === 1;

  const { data: dishesData } = useQuery(GET_DISHES, {
    variables: { location_id: parseInt(locationId) },
    skip: !locationId,
  });

  const rawOrdersAll = data?.orders || [];
  const rawInvoices = invoicesData?.paidInvoices || [];
  const paidInvoices = rawInvoices.filter(inv => {
    if (!locationId) return true;
    const relatedOrder = rawOrdersAll.find(o => String(o.id) === String(inv.order_id));
    return relatedOrder && String(relatedOrder.restaurant_id) === String(locationId);
  });
  
  const myLocationName = locationsData?.locations?.find(loc => String(loc.id) === String(locationId))?.name || (locationId ? "Sede ID " + locationId : "Todas las Sedes");

  const [createOrder] = useMutation(CREATE_ORDER);
  const [addItems] = useMutation(ADD_ITEMS);
  const [updateStatus] = useMutation(UPDATE_STATUS);
  const [updatePriority] = useMutation(UPDATE_PRIORITY);

  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [message, setMessage] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const [newOrder, setNewOrder] = useState({
    customer_id: "",
    channel: "web",
    notes: "",
    priority: "normal",
  });

  const [newItem, setNewItem] = useState({
    product_id: "",
    product_name: "",
    quantity: 1,
    unit_price: "",
  });

  const showMsg = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  const handleCreateOrder = async () => {
    if (!locationId) {
      return showMsg("Falta el ID del restaurante (Sede)", "error");
    }

    try {
      await createOrder({
        variables: {
          ...newOrder,
          restaurant_id: locationId,
        },
      });
      showMsg("Pedido creado");
      setModal(null);
      setNewOrder({
        customer_id: "",
        channel: "web",
        notes: "",
        priority: "normal",
      });
      refetch();
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const handleAddItem = async () => {
    try {
      await addItems({
        variables: {
          order_id: modal.order.id,
          items: [
            {
              product_id: newItem.product_id || `prod-${Date.now()}`,
              product_name: newItem.product_name,
              quantity: parseInt(newItem.quantity),
              unit_price: parseFloat(newItem.unit_price) || 30000,
            },
          ],
        },
      });

      showMsg("Ítem agregado");
      setModal(null);
      setNewItem({
        product_id: "",
        product_name: "",
        quantity: 1,
        unit_price: "",
      });
      refetch();
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateStatus({ variables: { id, status } });
      showMsg(`Pedido actualizado a ${STATUS_LABELS[status]}`);
      refetch();
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const handlePriorityChange = async (id, priority) => {
    try {
      await updatePriority({ variables: { id, priority } });
      showMsg("Prioridad actualizada");
      refetch();
    } catch (e) {
      showMsg(e.message, "error");
    }
  };

  const rawOrders = data?.orders || [];
  
  const orders = rawOrders.filter(o => {
    if (!locationId) return true;
    return String(o.restaurant_id) === String(locationId);
  });
  const otherBranchesCount = rawOrders.length - orders.length;

  const filtered =
    filterStatus === "all"
      ? orders
      : orders.filter((o) => o.status === filterStatus);

  const counts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  if (isInitialLoading) return <div style={s.center}>Cargando pedidos...</div>;
  if (error)
    return (
      <div style={{ ...s.center, color: "#e74c3c" }}>
        Error: {error.message}
      </div>
    );

  return (
    <div style={s.container}>
      {message && (
        <div
          style={{
            ...s.toast,
            background: message.type === "error" ? "#e74c3c" : "#27ae60",
          }}
        >
          {message.text}
        </div>
      )}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>Dashboard de Órdenes</h1>
          <span style={s.subtitle}>
            Viendo {filtered.length} pedidos de {orders.length} totales en {myLocationName}
          </span>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <button
            style={{ ...s.btnSecondary, background: "#f8f9fa", border: "1px solid #ddd", display: "flex", alignItems: "center", gap: "0.4rem" }}
            onClick={() => setModal({ type: "history" })}
          >
            <ClipboardList size={15} /> Historial Facturas
          </button>
          <button
            style={{ ...s.btnSecondary, background: "#e3f2fd", color: "#1976d2", border: "1px solid #bbdefb", display: "flex", alignItems: "center", gap: "0.4rem" }}
            onClick={() => {
              refetch();
              showMsg("Sincronizado");
            }}
          >
            <RefreshCw size={15} /> Sincronizar
          </button>
        </div>
      </div>

      <div style={s.filters}>
        <button
          style={{
            ...s.filterBtn,
            background: filterStatus === "all" ? "#f4511e" : "#fff",
            color: filterStatus === "all" ? "#fff" : "#555",
            borderColor: filterStatus === "all" ? "#f4511e" : "#eee",
          }}
          onClick={() => setFilterStatus("all")}
        >
          Todos ({orders.length})
        </button>

        {Object.entries(STATUS_LABELS).map(([st, label]) => (
          <button
            key={st}
            style={{
              ...s.filterBtn,
              background: filterStatus === st ? STATUS_COLORS[st] : "#fff",
              color: filterStatus === st ? STATUS_TEXT_COLORS[st] : "#555",
              borderColor:
                filterStatus === st ? STATUS_TEXT_COLORS[st] : "#eee",
              borderWidth: "1.5px",
            }}
            onClick={() => setFilterStatus(st)}
          >
            {label} {counts[st] ? `(${counts[st]})` : ""}
          </button>
        ))}
      </div>

      <div style={s.grid}>
        {filtered.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            selected={selectedId === order.id}
            onSelect={(id) => setSelectedId(selectedId === id ? null : id)}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
            onOpenModal={(type, ord) => setModal({ type, order: ord })}
            locations={locationsData?.locations}
          />
        ))}
      </div>

      {/* Modal crear pedido */}
      {modal?.type === "createOrder" && (
        <Modal title="Nuevo Pedido" onClose={() => setModal(null)}>
          <input
            style={s.input}
            placeholder="Nombre del Cliente (Opcional)"
            value={newOrder.customer_id}
            onChange={(e) =>
              setNewOrder({ ...newOrder, customer_id: e.target.value })
            }
          />
          <select
            style={s.input}
            value={newOrder.channel}
            onChange={(e) =>
              setNewOrder({ ...newOrder, channel: e.target.value })
            }
          >
            <option value="app">App</option>
            <option value="rappi">Rappi</option>
            <option value="web">Web</option>
          </select>
          <select
            style={s.input}
            value={newOrder.priority}
            onChange={(e) =>
              setNewOrder({ ...newOrder, priority: e.target.value })
            }
          >
            <option value="low">Baja</option>
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
          </select>
          <textarea
            style={{ ...s.input, height: "70px", resize: "none" }}
            placeholder="Notas"
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
        </Modal>
      )}

      {/* Modal agregar item */}
      {modal?.type === "addItem" && (
        <Modal
          title={`Agregar Plato #${shortId(modal.order.id)}`}
          onClose={() => setModal(null)}
        >
          <select
            style={s.input}
            value={newItem.product_id || ""}
            onChange={(e) => {
              const selectedId = e.target.value;
              const dish = dishesData?.dishes?.find(
                (d) => String(d.id) === String(selectedId),
              );
              if (dish) {
                const priceObj =
                  dish.prices?.find(
                    (p) => String(p.restaurant_id) === String(locationId),
                  ) || dish.prices?.[0];
                const priceVal = priceObj ? priceObj.price : 0;
                setNewItem({
                  ...newItem,
                  product_id: dish.id,
                  product_name: dish.name,
                  unit_price: priceVal,
                });
              } else {
                setNewItem({
                  ...newItem,
                  product_id: "",
                  product_name: "",
                  unit_price: "",
                });
              }
            }}
          >
            <option value="">Seleccione un plato del menú...</option>
            {dishesData?.dishes?.map((d) => {
              const pObj =
                d.prices?.find(
                  (p) => String(p.restaurant_id) === String(locationId),
                ) || d.prices?.[0];
              const pVal = pObj ? pObj.price : 0;
              return (
                <option key={d.id} value={d.id}>
                  {d.name} — ${parseFloat(pVal).toFixed(2)}
                </option>
              );
            })}
          </select>
          <input
            style={s.input}
            type="number"
            placeholder="Cantidad"
            min="1"
            value={newItem.quantity}
            onChange={(e) =>
              setNewItem({ ...newItem, quantity: e.target.value })
            }
          />
          <input
            style={{
              ...s.input,
              backgroundColor: "#f3f4f6",
              color: "#6b7280",
              cursor: "not-allowed",
            }}
            type="text"
            placeholder="Precio unitario"
            readOnly
            value={
              newItem.unit_price
                ? `$${parseFloat(newItem.unit_price).toFixed(2)}`
                : ""
            }
          />

          <div style={s.modalBtns}>
            <button style={s.btnSecondary} onClick={() => setModal(null)}>
              Cancelar
            </button>
            <button
              style={s.btnPrimary}
              onClick={handleAddItem}
              disabled={!newItem.product_id}
            >
              Agregar Plato
            </button>
          </div>
        </Modal>
      )}

      {modal?.type === "history" && (
        <HistoryModal 
          invoices={paidInvoices} 
          onClose={() => setModal(null)} 
          onShowInvoice={(inv) => setModal({ 
            type: "invoice", 
            order: { id: inv.order_id, customer_id: null } 
          })}
        />
      )}

      {modal?.type === "items" && (
        <ItemsModal order={modal.order} onClose={() => setModal(null)} />
      )}

      {modal?.type === "invoice" && (
        <InvoiceModal
          order={modal.order}
          onClose={() => setModal(null)}
          showMsg={showMsg}
        />
      )}

      {modal?.type === "payment" && (
        <PaymentModal
          order={modal.order}
          onClose={() => setModal(null)}
          showMsg={showMsg}
          refetch={refetch}
        />
      )}


    </div>
  );
}

// ───────────────── STYLES ─────────────────
const s = {
  container: {
    padding: "0",
    background: "#f8f9fa",
    minHeight: "calc(100vh - 80px)",
    color: "#333",
  },

  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid #f1f3f5",
  },

  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#999",
    fontSize: "1.2rem",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "color 0.2s",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
  },
  title: { margin: 0, fontSize: "1.8rem", color: "#1a1c2d", fontWeight: "800" },
  subtitle: { color: "#888", fontSize: "0.9rem", fontWeight: "500" },
  filters: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.6rem",
    marginBottom: "2rem",
  },
  filterBtn: {
    border: "1px solid #eee",
    color: "#555",
    padding: "0.5rem 1.4rem",
    borderRadius: "25px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: "600",
    background: "#fff",
    boxShadow: "0 2px 5px rgba(0,0,0,0.02)",
    transition: "all 0.2s ease",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    background: "#ffffff",
    borderRadius: "16px",
    padding: "1.2rem",
    cursor: "pointer",
    transition: "all 0.3s ease",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    border: "1px solid #f0f0f0",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.8rem",
  },
  orderId: { fontWeight: "800", color: "#f4511e", fontSize: "1rem" },
  badge: {
    padding: "0.3rem 0.7rem",
    borderRadius: "20px",
    fontSize: "0.7rem",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  info: {
    margin: "0.4rem 0",
    color: "#666",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  timerBadge: {
    display: "inline-block",
    marginTop: "0.8rem",
    padding: "0.4rem 0.8rem",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: "700",
  },
  expanded: {
    marginTop: "1rem",
    borderTop: "1px solid #f0f0f0",
    paddingTop: "1rem",
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  sectionLabel: {
    color: "#999",
    fontSize: "0.75rem",
    fontWeight: "700",
    textTransform: "uppercase",
    margin: "0.8rem 0 0.5rem",
  },
  btnGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.4rem",
    marginBottom: "0.5rem",
  },
  btnSm: {
    background: "#f8f9fa",
    color: "#444",
    border: "1px solid #e0e0e0",
    padding: "0.4rem 0.8rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "600",
  },
  btnXS: {
    padding: "0.35rem 0.7rem",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.75rem",
    fontWeight: "700",
    color: "white",
    background: "#f4511e",
  },
  btnPrimary: {
    background: "#f4511e",
    color: "white",
    border: "none",
    padding: "0.8rem 1.5rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "700",
    fontSize: "0.95rem",
    boxShadow: "0 4px 12px rgba(244, 81, 30, 0.2)",
  },
  btnSecondary: {
    background: "#f1f3f5",
    color: "#495057",
    border: "none",
    padding: "0.8rem 1.5rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "0.95rem",
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
    maxHeight: "90vh",
    overflowY: "auto",
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
    transition: "border-color 0.2s",
  },
  invoiceBox: {
    background: "#f8f9fa",
    borderRadius: "12px",
    padding: "1.5rem",
    border: "1px solid #e9ecef",
  },
  invoiceRow: {
    display: "flex",
    justifyContent: "space-between",
    margin: "0.6rem 0",
    color: "#444",
    fontSize: "0.95rem",
  },
  hr: { border: "none", borderTop: "1px solid #e9ecef", margin: "1.2rem 0" },
  muted: { color: "#999", fontSize: "0.9rem" },
  toast: {
    position: "fixed",
    bottom: "2rem",
    right: "2rem",
    padding: "1rem 2rem",
    borderRadius: "12px",
    color: "white",
    zIndex: 2000,
    fontWeight: "700",
    fontSize: "1rem",
    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
  },
  center: {
    padding: "5rem",
    color: "#888",
    textAlign: "center",
    fontSize: "1.1rem",
  },
  th: {
    padding: "1rem 1.2rem",
    fontWeight: "800",
    fontSize: "0.85rem",
    textTransform: "uppercase",
    background: "#f1f3f5",
    color: "#1a1c2d",
    borderBottom: "2px solid #eee",
    textAlign: "left",
  },
  td: {
    padding: "1rem 1.2rem",
    color: "#444",
    fontSize: "0.85rem",
    borderBottom: "1px solid #f1f3f5",
  },
};
