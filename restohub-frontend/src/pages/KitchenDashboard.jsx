import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  LOGIN_COOK,
  REGISTER_COOK,
  GET_KITCHEN_ORDERS,
  UPDATE_KITCHEN_STATUS,
} from "../graphql/kitchen";
import { GET_LOCATIONS } from "../graphql/location";
import { useAuth } from "../context/AuthContext";
import {
  ChefHat, Package, CheckCircle2, XCircle,
  Clock, AlertTriangle, BarChart2, LogOut,
  MapPin, Smartphone, Monitor, ClipboardList,
  UtensilsCrossed, Trophy
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusColors = {
  received: "#fff3e0",
  in_preparation: "#f3e5f5",
  packing: "#e0f2f1",
  ready: "#e8f5e9",
  cancelled: "#ffebee",
};

const statusText = {
  received: "#ef6c00",
  in_preparation: "#7b1fa2",
  packing: "#00796b",
  ready: "#2e7d32",
  cancelled: "#c62828",
};

const statusLabels = {
  pending: "Pendiente",
  in_preparation: "Preparando",
  packing: "Empacando",
  ready: "Completado",
  cancelled: "Cancelado",
};

const StatusIcon = ({ status, size = 14 }) => {
  const icons = {
    pending: <ClipboardList size={size} />,
    in_preparation: <ChefHat size={size} />,
    packing: <Package size={size} />,
    ready: <CheckCircle2 size={size} />,
    cancelled: <XCircle size={size} />,
  };
  return icons[status] || null;
};

const priorityColors = {
  low: "#f5f5f5",
  normal: "#e3f2fd",
  high: "#fff3e0",
};

const priorityText = {
  low: "#757575",
  normal: "#1976d2",
  high: "#ef6c00",
};

export default function KitchenDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [message, setMessage] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const { data: locationsData } = useQuery(GET_LOCATIONS);

  const { data, loading, error, refetch, networkStatus } = useQuery(
    GET_KITCHEN_ORDERS,
    {
      variables: { restaurant_id: String(user?.locationId || "") },
      pollInterval: 3000,
      notifyOnNetworkStatusChange: true,
      skip: !user?.locationId,
    },
  );

  useEffect(() => {
    console.log("KITCHEN: restaurant_id being sent:", String(user?.locationId || ""));
  }, [user]);

  const isInitialLoading = loading && networkStatus === 1;
  const [updateStatus] = useMutation(UPDATE_KITCHEN_STATUS);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateStatus({ variables: { id, status } });
      showMessage("Estado actualizado");
      refetch();
    } catch (e) {
      showMessage(e.message, "error");
    }
  };

  const getElapsedMinutes = (receivedAt, readyAt, status) => {
    if (!receivedAt) return 0;
    const start = new Date(
      isNaN(Number(receivedAt)) ? receivedAt : Number(receivedAt),
    );
    if (isNaN(start.getTime())) return 0;
    const end =
      status === "ready" && readyAt
        ? new Date(isNaN(Number(readyAt)) ? readyAt : Number(readyAt))
        : new Date();
    return Math.round((end - start) / 60000);
  };

  function LocationName({ locationId, locations }) {
    const loc = locations?.find((l) => String(l.id) === String(locationId));
    if (!loc) return <>{locationId}</>;
    return <>{loc.name}</>;
  }

  if (isInitialLoading) {
    return (
      <div style={s.loaderContainer}>
        <div style={s.loader}></div>
        <p>Cargando pedidos de cocina...</p>
      </div>
    );
  }

  if (loading && !data) return <div style={s.center}>Cargando órdenes...</div>;
  if (error)
    return (
      <div style={{ ...s.center, color: "#e74c3c" }}>
        Error: {error.message}
      </div>
    );

  const allOrders = data?.kitchenOrders || [];

  // Buscar el nombre de la sede (ya que el cliente envía el nombre como restaurant_id)
  const myLocation = locationsData?.locations?.find(
    (loc) => String(loc.id) === String(user?.locationId),
  );
  const myLocationName = myLocation ? myLocation.name : null;

  // Filtrar solo las órdenes que corresponden a la sede actual
  const ordersForMySede = allOrders.filter(
    (o) =>
      String(o.restaurant_id) === String(user?.locationId) ||
      o.restaurant_id === myLocationName,
  );

  const readyAll = ordersForMySede.filter((o) => o.status === "ready");

  const groupedOrders = {
    pending: ordersForMySede.filter((o) => o.status === "pending"),
    in_preparation: ordersForMySede.filter(
      (o) => o.status === "in_preparation",
    ),
    packing: ordersForMySede.filter((o) => o.status === "packing"),
    ready: readyAll.slice(-5), // Solo los últimos 5
  };

  const pendingCount = groupedOrders.pending.length;
  const inProcessCount =
    groupedOrders.in_preparation.length + groupedOrders.packing.length;
  const readyCount = readyAll.length; // Count total para la estadística

  // Calcular el plato más preparado
  const itemCounts = {};
  ordersForMySede.forEach((o) => {
    o.items?.forEach((i) => {
      itemCounts[i.product_name] =
        (itemCounts[i.product_name] || 0) + i.quantity;
    });
  });
  const sortedDishes = Object.entries(itemCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div style={s.container}>
      {message && (
        <div
          style={{
            ...s.toast,
            background: message.type === "error" ? "#e74c3c" : "#2ecc71",
          }}
        >
          {message.text}
        </div>
      )}

      <div style={s.header}>
        <div>
          <h1 style={s.title}>
            <ChefHat size={24} style={{ display: "inline", marginRight: 8, verticalAlign: "middle", color: "#f4511e" }} />
            Dashboard de Cocina
          </h1>
          <span style={s.subtitle}>
            {pendingCount} pendientes · {inProcessCount} en proceso ·{" "}
            {readyCount} completadas · Sede:{" "}
            {myLocation?.name || user?.locationId}
          </span>
        </div>
        <div style={s.cookInfo}>
          <button
            style={{ ...s.logoutBtn, background: "#e3f2fd", color: "#1976d2", fontWeight: "bold" }}
            onClick={() => setShowHistoryModal(true)}
          >
            <BarChart2 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
            Historial de Platos
          </button>
          <span style={s.cookName}>
            <ChefHat size={16} style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }} />
            Cocinero: {user?.firstName || user?.name || user?.first_name || "Personal"}
          </span>
        </div>
      </div>

      <div style={s.columns}>
        {Object.entries(groupedOrders).map(([status, orders]) => {
          const colIcons = {
            pending: <ClipboardList size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />,
            in_preparation: <ChefHat size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />,
            packing: <Package size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />,
            ready: <CheckCircle2 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />,
          };
          return (
            <div key={status} style={s.column}>
              <div
                style={{
                  ...s.columnHeader,
                  background: statusColors[status],
                  color: statusText[status],
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>{colIcons[status]}{statusLabels[status]}</span>
                <span style={s.columnCount}>{orders.length}</span>
              </div>

              <div style={s.columnBody}>
                {orders.length === 0 && <div style={s.empty}>Sin órdenes</div>}

                {orders.map((order) => {
                  const elapsed = getElapsedMinutes(
                    order.received_at,
                    order.ready_at,
                    order.status,
                  );
                  const isUrgent =
                    elapsed > 20 &&
                    !["ready", "cancelled"].includes(order.status);
                  return (
                    <div
                      key={order.id}
                      style={{
                        ...s.card,
                        borderTop: `3px solid ${statusText[order.status]}`,
                        background:
                          selectedOrder === order.id ? "#fff9f7" : "#ffffff",
                        boxShadow: isUrgent
                          ? "0 4px 15px rgba(231,76,60,0.2)"
                          : "0 4px 10px rgba(0,0,0,0.03)",
                        borderColor:
                          selectedOrder === order.id ? "#f4511e" : "#f0f0f0",
                      }}
                      onClick={() =>
                        setSelectedOrder(
                          selectedOrder === order.id ? null : order.id,
                        )
                      }
                    >
                      <div style={s.cardHeader}>
                        <span style={s.orderId}>
                          #{order.order_id.slice(0, 8)}
                        </span>
                        <span
                          style={{
                            ...s.priorityBadge,
                            background: priorityColors[order.priority],
                            color: priorityText[order.priority],
                          }}
                        >
                          {order.priority}
                        </span>
                      </div>

                      <p style={s.info}><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: '4px', flexShrink: 0 }} /><LocationName locationId={order.restaurant_id} locations={locationsData?.locations} /></p>
                      <p style={s.info}>
                        <Smartphone size={13} style={{ verticalAlign: 'middle', marginRight: '4px', flexShrink: 0 }} /> {order.channel} ·{" "}
                        <span
                          style={{
                            background:
                              order.origin === "pos" ? "#e67e22" : "#8e44ad",
                            color: "white",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "6px",
                            fontSize: "0.7rem",
                            fontWeight: "bold",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                          }}
                        >
                          {order.origin === "pos" ? <><Monitor size={10} /> POS</> : <><Smartphone size={10} /> Virtual</>}
                        </span>
                      </p>
                      {order.notes && <p style={s.notes}><NotebookText size={12} style={{verticalAlign:'middle', marginRight:'3px'}} /> {order.notes}</p>}

                      {order.items && order.items.length > 0 && (
                        <div
                          style={{
                            marginTop: "0.4rem",
                            borderTop: "1px solid #f0f0f0",
                            paddingTop: "0.4rem",
                          }}
                        >
                          {order.items.map((item) => (
                            <p
                              key={item.id}
                              style={{
                                ...s.info,
                                color: "#1a1c2d",
                                margin: "0.15rem 0",
                                fontWeight: "600",
                              }}
                            >
                              <UtensilsCrossed size={12} style={{marginRight: '4px'}} /> {item.product_name}{" "}
                              <span
                                style={{ color: "#ef6c00", fontWeight: "700" }}
                              >
                                x{item.quantity}
                              </span>
                              {item.notes && (
                                <span
                                  style={{
                                    color: "#888",
                                    fontSize: "0.72rem",
                                    fontWeight: "normal",
                                  }}
                                >
                                  {" "}
                                  · {item.notes}
                                </span>
                              )}
                            </p>
                          ))}
                        </div>
                      )}

                      {order.status !== "ready" ? (
                        <div style={s.timeRow}>
                          <span
                            style={{
                              ...s.elapsed,
                              color: isUrgent ? "#e74c3c" : "#f39c12",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Clock size={13} /> {elapsed} min
                          </span>
                          {isUrgent && (
                            <span style={{ ...s.urgentBadge, display: "flex", alignItems: "center", gap: "3px" }}>
                              <AlertTriangle size={11} /> Urgente
                            </span>
                          )}
                        </div>
                      ) : (
                        <div style={s.timeRow}>
                          <span style={{ ...s.elapsed, color: "#2ecc71", display: "flex", alignItems: "center", gap: "4px" }}>
                            <CheckCircle2 size={13} /> Listo en {elapsed} min
                          </span>
                        </div>
                      )}

                      {selectedOrder === order.id && (
                        <div
                          style={s.actions}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {order.status !== "ready" &&
                            order.status !== "cancelled" && (
                              <button
                                style={{
                                  ...s.actionBtn,
                                  background: "#2ecc71",
                                  color: "white",
                                  width: "100%",
                                  padding: "0.5rem",
                                  fontSize: "0.85rem",
                                  fontWeight: "bold",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "0.4rem",
                                }}
                                onClick={() => {
                                  const next = {
                                    pending: "in_preparation",
                                    in_preparation: "packing",
                                    packing: "ready",
                                  };
                                  handleStatusChange(
                                    order.id,
                                    next[order.status],
                                  );
                                }}
                              >
                                {order.status === "pending" && <><ChefHat size={14} /> Iniciar preparación</>}
                                {order.status === "in_preparation" && <><Package size={14} /> Pasar a empacar</>}
                                {order.status === "packing" && <><CheckCircle2 size={14} /> Marcar listo</>}
                              </button>
                            )}
                          {order.status === "ready" && (
                            <p
                              style={{
                                color: "#2ecc71",
                                fontSize: "0.8rem",
                                margin: 0,
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <CheckCircle2 size={14} /> Listo para entregar
                            </p>
                          )}
                        <button
                          style={{
                            ...s.actionBtn,
                            background: "#e74c3c22",
                            color: "#e74c3c",
                            width: "100%",
                            marginTop: "0.4rem",
                            padding: "0.4rem",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px",
                          }}
                          onClick={() =>
                            handleStatusChange(order.id, "cancelled")
                          }
                        >
                          <XCircle size={13} /> Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )})}
      </div>

      {showHistoryModal && (
        <div style={s.modalOverlay} onClick={() => setShowHistoryModal(false)}>
          <div style={s.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h2 style={{ margin: 0, color: "#1a1c2d", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <BarChart2 size={20} /> Historial de Platos
              </h2>
              <button style={s.modalCloseBtn} onClick={() => setShowHistoryModal(false)}><XCircle size={20} /></button>
            </div>
            <div style={s.modalBody}>
              {sortedDishes.length === 0 ? (
                <p
                  style={{
                    color: "#888",
                    textAlign: "center",
                    padding: "2rem 0",
                  }}
                >
                  No hay platos preparados aún.
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.8rem",
                  }}
                >
                  {sortedDishes.map(([dish, count], idx) => (
                    <div
                      key={dish}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "1rem",
                        background: idx === 0 ? "#fff9f7" : "#f8f9fa",
                        borderRadius: "10px",
                        border:
                          idx === 0 ? "1px solid #f4511e" : "1px solid #eee",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: idx === 0 ? "#f4511e" : "#888", width: "24px" }}>
                          #{idx + 1}
                        </span>
                        <span style={{ fontWeight: idx === 0 ? "800" : "600", color: "#333", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "6px" }}>
                          {dish}
                          {idx === 0 && <Trophy size={15} color="#f4511e" />}
                        </span>
                      </div>
                      <span
                        style={{
                          fontWeight: "900",
                          color: "#2e7d32",
                          fontSize: "1.1rem",
                        }}
                      >
                        x{count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: {
    padding: "0",
    background: "transparent",
    minHeight: "calc(100vh - 100px)",
    color: "#333",
  },
  loaderContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "50vh",
  },
  loader: {
    border: "4px solid #f3f3f3",
    borderTop: "4px solid #f4511e",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    animation: "spin 2s linear infinite",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modalContent: {
    background: "#fff",
    borderRadius: "16px",
    width: "500px",
    maxWidth: "90%",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  modalHeader: {
    padding: "1.5rem",
    borderBottom: "1px solid #eee",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalCloseBtn: {
    background: "transparent",
    border: "none",
    fontSize: "1.2rem",
    cursor: "pointer",
    color: "#888",
  },
  modalBody: {
    padding: "1.5rem",
    overflowY: "auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
  },
  title: { margin: 0, fontSize: "1.8rem", color: "#1a1c2d", fontWeight: "800" },
  subtitle: { color: "#888", fontSize: "0.9rem", fontWeight: "500" },
  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "1.2rem",
  },
  column: {
    background: "#ffffff",
    borderRadius: "16px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
    border: "1px solid #f0f0f0",
  },
  columnHeader: {
    padding: "1rem 1.2rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: "800",
    fontSize: "0.9rem",
    textTransform: "uppercase",
  },
  columnCount: {
    background: "rgba(255,255,255,0.5)",
    padding: "0.2rem 0.6rem",
    borderRadius: "10px",
    fontSize: "0.8rem",
  },
  columnBody: { padding: "0.8rem", flex: 1, background: "#f8f9fa" },
  card: {
    borderRadius: "12px",
    padding: "1rem",
    cursor: "pointer",
    marginBottom: "0.8rem",
    transition: "all 0.3s ease",
    border: "1px solid #f0f0f0",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.6rem",
  },
  orderId: { fontWeight: "800", color: "#f4511e", fontSize: "0.95rem" },
  priorityBadge: {
    padding: "0.2rem 0.55rem",
    borderRadius: "20px",
    fontSize: "0.7rem",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  info: {
    margin: "0.3rem 0",
    color: "#666",
    fontSize: "0.85rem",
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
  },
  notes: {
    margin: "0.4rem 0",
    color: "#ef6c00",
    fontSize: "0.8rem",
    fontStyle: "italic",
    background: "#fff8e1",
    padding: "0.4rem",
    borderRadius: "6px",
  },
  timeRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "0.8rem",
  },
  elapsed: { fontSize: "0.85rem", fontWeight: "700" },
  urgentBadge: {
    background: "#fff1f0",
    color: "#f5222d",
    padding: "0.2rem 0.6rem",
    borderRadius: "6px",
    fontSize: "0.7rem",
    fontWeight: "800",
    border: "1px solid #ffa39e",
  },
  actions: {
    marginTop: "1rem",
    borderTop: "1px solid #f0f0f0",
    paddingTop: "1rem",
  },
  actionBtn: {
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.8rem",
    border: "none",
    transition: "all 0.2s",
  },
  cookInfo: {
    display: "flex",
    alignItems: "center",
    gap: "1.2rem",
    background: "white",
    padding: "0.8rem 1.5rem",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
    border: "1px solid #f0f0f0",
  },
  cookName: { color: "#1a1c2d", fontWeight: "800", fontSize: "0.95rem" },
  cookRole: {
    color: "#f4511e",
    fontSize: "0.75rem",
    fontWeight: "700",
    textTransform: "uppercase",
    background: "#fff9f7",
    padding: "0.3rem 0.7rem",
    borderRadius: "20px",
  },
  logoutBtn: {
    background: "#f1f3f5",
    color: "#888",
    border: "none",
    padding: "0.4rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.8rem",
    fontWeight: "600",
  },
  loginContainer: {
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
  loginIcon: { fontSize: "3.5rem", marginBottom: "1rem" },
  loginTitle: {
    color: "#1a1c2d",
    margin: "0 0 0.5rem",
    fontSize: "1.8rem",
    fontWeight: "900",
  },
  loginSubtitle: { color: "#888", margin: "0 0 2rem", fontSize: "0.95rem" },
  loginError: { color: "#f5222d", marginBottom: "1.5rem", fontSize: "0.9rem" },
  loginBtn: {
    width: "100%",
    background: "#f4511e",
    color: "white",
    border: "none",
    padding: "0.8rem",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "800",
    fontSize: "1rem",
    marginTop: "0.5rem",
    boxShadow: "0 4px 12px rgba(244, 81, 30, 0.2)",
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
  center: {
    padding: "5rem",
    color: "#888",
    textAlign: "center",
    fontSize: "1.1rem",
  },
  empty: {
    padding: "2rem",
    color: "#ccc",
    textAlign: "center",
    fontSize: "0.9rem",
    fontWeight: "500",
  },
  switchText: { color: "#888", fontSize: "0.85rem", marginTop: "1.5rem" },
  switchLink: {
    color: "#f4511e",
    cursor: "pointer",
    fontWeight: "700",
  },
};
