import React, { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_LIVE_ORDERS, GET_ORDER_ITEMS_LIVE, GET_LOCATIONS, GET_INVOICE } from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import {
  History, ChefHat, Package, CheckCircle2, Clock,
  Truck, XCircle, ShoppingBag, ChevronDown, ChevronUp,
  Utensils, CalendarDays, FileText, MessageSquare
} from 'lucide-react';

// ─── Configuración de estados ───────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: {
    label: 'Pendiente',
    description: 'Tu pedido ha sido recibido por el restaurante.',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-400',
    step: 1,
  },
  validated: {
    label: 'Confirmado',
    description: 'El restaurante confirmó tu pedido.',
    icon: CheckCircle2,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: 'bg-blue-400',
    step: 2,
  },
  in_preparation: {
    label: 'Preparando',
    description: 'Tu pedido está siendo preparado en cocina. 🍳',
    icon: ChefHat,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-400',
    step: 3,
  },
  packing: {
    label: 'Empacando',
    description: 'Tu pedido está siendo empacado para entrega.',
    icon: Package,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: 'bg-purple-400',
    step: 4,
  },
  ready: {
    label: '¡Listo!',
    description: 'Tu pedido está listo. ¡Ve a recogerlo!',
    icon: Utensils,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    dot: 'bg-green-500',
    step: 5,
  },
  delivered: {
    label: 'Entregado',
    description: 'Tu pedido fue entregado. ¡Buen provecho!',
    icon: Truck,
    color: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    dot: 'bg-slate-400',
    step: 6,
  },
  cancelled: {
    label: 'Cancelado',
    description: 'Este pedido fue cancelado.',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-400',
    step: 0,
  },
};

const STEPS = ['pending', 'validated', 'in_preparation', 'packing', 'ready', 'delivered'];

// ─── Barra de progreso del pedido ──────────────────────────────────────────

function StatusProgress({ status }) {
  if (status === 'cancelled') return null;
  const currentStep = STATUS_CONFIG[status]?.step ?? 1;

  return (
    <div className="flex items-center gap-1 my-3">
      {STEPS.map((st, i) => {
        const cfg = STATUS_CONFIG[st];
        const done = cfg.step <= currentStep;
        const active = cfg.step === currentStep;
        return (
          <React.Fragment key={st}>
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500
                ${active ? `${cfg.dot} ring-4 ring-offset-1 ring-opacity-30 ring-current scale-110` : done ? cfg.dot : 'bg-slate-200'}
              `}
            >
              {done && !active && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${cfg.step < currentStep ? cfg.dot : 'bg-slate-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Tarjeta de pedido individual ──────────────────────────────────────────

function OrderCard({ order, locations = [], userCountry }) {
  const { getCurrencyConfig } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  const locInfo = locations.find((l) => String(l.id) === String(order.restaurant_id));
  const branchDisplay = locInfo ? locInfo.name : `Sede ${order.restaurant_id}`;

  const { data: itemsData, loading: itemsLoading } = useQuery(GET_ORDER_ITEMS_LIVE, {
    variables: { order_id: order.id },
    skip: !expanded,
    fetchPolicy: 'cache-first',
  });

  const { data: invoiceData } = useQuery(GET_INVOICE, {
    variables: { order_id: order.id },
    skip: !expanded,
    fetchPolicy: 'cache-first',
  });

  const items = itemsData?.orderItems || [];
  const total = items.reduce((sum, i) => sum + parseFloat(i.subtotal || 0), 0);
  const invoice = invoiceData?.orderInvoice;

  const isActive = !['delivered', 'cancelled'].includes(order.status);

  const formattedDate = order.created_at
    ? (() => {
        const cfg = getCurrencyConfig(userCountry);
        return new Date(order.created_at).toLocaleString(cfg.locale, {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
      })()
    : '—';

  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm transition-all duration-300
      ${cfg.border} ${isActive ? 'shadow-md' : ''}
    `}>
      {/* Badge activo pulsante */}
      {isActive && (
        <div className="px-4 pt-3 flex items-center gap-2">
          <span className={`relative flex h-2.5 w-2.5`}>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${cfg.dot}`} />
          </span>
          <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>En curso</span>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={cfg.color} size={22} />
            </div>
            <div>
              <div className={`text-sm font-black ${cfg.color}`}>{cfg.label}</div>
              <div className="text-xs text-slate-400 font-medium">{cfg.description}</div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg whitespace-nowrap">
            #{order.id?.slice(0, 8).toUpperCase()}
          </span>
        </div>

        {/* Progreso */}
        <StatusProgress status={order.status} />

        {/* Info */}
        <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={12} className="text-slate-400" />
            {formattedDate}
          </div>
          {order.restaurant_id && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-slate-600">{branchDisplay}</span>
            </div>
          )}
          {order.channel && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300">·</span>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase
                ${order.channel === 'web' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-600'}
              `}>{order.channel}</span>
            </div>
          )}
        </div>

        {/* Indicaciones de entrega */}
        {order.notes && (
          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <MessageSquare size={13} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              <span className="font-black uppercase tracking-wide text-amber-600">Indicaciones: </span>
              {order.notes.replace(/^Indicaciones: /, '').split('. Pagado')[0].split('. Pago en efectivo')[0]}
            </p>
          </div>
        )}

        {/* Expandir ítems */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider transition-colors"
        >
          <ShoppingBag size={13} />
          {expanded ? 'Ocultar ítems' : 'Ver ítems del pedido'}
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {/* Ítems */}
        {expanded && (
          <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {itemsLoading ? (
              <div className="flex items-center justify-center py-4 gap-2 text-slate-400 text-xs font-bold">
                <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                Cargando platos...
              </div>
            ) : items.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-3">Sin ítems registrados.</p>
            ) : (
              <>
                {items.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl">
                    <div>
                      <div className="font-bold text-slate-800 text-sm">{item.product_name}</div>
                      <div className="text-xs text-slate-400 font-medium">x{item.quantity} unidades</div>
                    </div>
                    <div className="font-black text-slate-700 text-sm">
                        {(() => {
                          const cfg = getCurrencyConfig(userCountry);
                          return new Intl.NumberFormat(cfg.locale, {
                            style: 'currency',
                            currency: cfg.code,
                            minimumFractionDigits: 0
                          }).format(item.unit_price * item.quantity);
                        })()}
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center px-4 pt-2 border-t border-slate-200 mt-1">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-wider">Total</span>
                  <span className="font-black text-brand-600 text-base">{(() => {
                    const cfg = getCurrencyConfig(userCountry);
                    return new Intl.NumberFormat(cfg.locale, {
                      style: 'currency',
                      currency: cfg.code,
                      minimumFractionDigits: 0
                    }).format(total);
                  })()}</span>
                </div>
              </>
            )}

            {/* Factura */}
            {invoice && (
              <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                <h4 className="text-xs font-black text-blue-800 uppercase flex items-center gap-2">
                  <FileText size={14} /> Factura: {invoice.invoice_number}
                </h4>
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Subtotal:</span>
                  <span>{(() => {
                    const cfg = getCurrencyConfig(userCountry);
                    return new Intl.NumberFormat(cfg.locale, {
                      style: 'currency',
                      currency: cfg.code,
                      minimumFractionDigits: 0
                    }).format(invoice.subtotal);
                  })()}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Impuestos:</span>
                  <span>{(() => {
                    const cfg = getCurrencyConfig(userCountry);
                    return new Intl.NumberFormat(cfg.locale, {
                      style: 'currency',
                      currency: cfg.code,
                      minimumFractionDigits: 0
                    }).format(invoice.tax);
                  })()}</span>
                </div>
                <div className="flex justify-between text-xs font-black text-slate-800 border-t border-blue-200 pt-1 mt-1">
                  <span>Total Facturado:</span>
                  <span className="text-blue-700">{(() => {
                    const cfg = getCurrencyConfig(userCountry);
                    return new Intl.NumberFormat(cfg.locale, {
                      style: 'currency',
                      currency: cfg.code,
                      minimumFractionDigits: 0
                    }).format(invoice.total);
                  })()}</span>
                </div>
                <div className="mt-2 text-[10px] font-bold text-blue-500 uppercase">
                  Estado: {invoice.status === "paid" ? "✅ Pagada" : "⏳ Pendiente"} | Medio: {invoice.payment_method || "N/A"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ───────────────────────────────────────────────────────

const OrderHistory = () => {
  const { user, getCurrencyConfig } = useAuth();

  const { data, loading, error } = useQuery(GET_LIVE_ORDERS, {
    variables: { cid: user?.id },
    skip: !user?.id,
    pollInterval: 8000, // actualiza cada 8s para ver estados de cocina
    fetchPolicy: "network-only",
  });

  const { data: locData } = useQuery(GET_LOCATIONS);
  const locations = locData?.locations || [];

  const orders = (data?.orders || [])
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const activeOrders  = orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
  const pastOrders    = orders.filter(o =>  ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <History className="text-brand-600" size={32} />
            Mis Pedidos
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {activeOrders.length > 0
              ? `${activeOrders.length} pedido${activeOrders.length > 1 ? 's' : ''} en curso · actualiza automáticamente`
              : 'Revisa el estado de tus pedidos en tiempo real.'}
          </p>
        </div>
        {activeOrders.length > 0 && (
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-brand-500" />
          </span>
        )}
      </div>

      {/* Estados */}
      {loading && (
        <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-bold text-sm">Cargando pedidos...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center text-red-600 text-sm font-bold">
          Error al cargar pedidos. Intenta recargar la página.
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm py-24 flex flex-col items-center gap-4">
          <ShoppingBag size={52} className="text-slate-200" />
          <p className="text-slate-400 font-bold text-lg">Aún no has realizado pedidos.</p>
          <p className="text-slate-400 text-sm">Ve al Menú Digital y haz tu primer pedido.</p>
        </div>
      )}

      {/* Pedidos en curso */}
      {activeOrders.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
            </span>
            En curso ({activeOrders.length})
          </h2>
          {activeOrders.map((order) => (
            <OrderCard key={order.id} order={order} locations={locations} userCountry={user?.country} />
          ))}
        </section>
      )}

      {/* Historial */}
      {pastOrders.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">
            Historial ({pastOrders.length})
          </h2>
          {pastOrders.map((order) => (
            <OrderCard key={order.id} order={order} locations={locations} userCountry={user?.country} />
          ))}
        </section>
      )}
    </div>
  );
};

export default OrderHistory;
