import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import {
  GET_LOYALTY_ACCOUNT,
  GET_POINT_HISTORY,
  GET_ORDERS,
  GET_PROMOTIONS,
  GET_CUSTOMER_RATINGS,
} from "../graphql/operations";
import { useAuth } from "../context/AuthContext";
import {
  Clock,
  ChevronRight,
  Crown,
  Gift,
  ShoppingBag,
  MessageSquare,
  User,
  History,
  Star,
  MapPin
} from "lucide-react";

const CustomerHome = () => {
  const { user, getCurrencyConfig, formatPrice } = useAuth();
  const navigate = useNavigate();

  const { data: loyaltyData } = useQuery(GET_LOYALTY_ACCOUNT, {
    variables: { customerId: user?.id },
    skip: !user,
    fetchPolicy: 'network-only',
  });

  const { data: historyData } = useQuery(GET_POINT_HISTORY, {
    variables: { customerId: user?.id },
    skip: !user,
    fetchPolicy: 'network-only',
  });

  const { data: ordersData } = useQuery(GET_ORDERS, {
    variables: { cid: user?.id },
    skip: !user,
    fetchPolicy: 'network-only',
  });

  const { data: ratingsData } = useQuery(GET_CUSTOMER_RATINGS, {
    variables: { cid: user?.id },
    skip: !user,
    fetchPolicy: 'network-only',
  });

  const loyalty = loyaltyData?.loyaltyAccount;
  const points = loyalty?.totalPoints || 0;
  const tier = loyalty?.tier?.toLowerCase() || "bronze";
  const history = historyData?.pointHistory || [];
  const orders = ordersData?.customerOrders || [];
  const ratingsCount = ratingsData?.ratings?.length || 0;

  // Tier progress logic
  let nextTier = "Plata", target = 100, currentBase = 0;
  if (points >= 1000) { nextTier = "Platino+"; target = points; currentBase = 0; }
  else if (points >= 500) { nextTier = "Platino"; target = 1000; currentBase = 500; }
  else if (points >= 100) { nextTier = "Oro"; target = 500; currentBase = 100; }

  const progress = Math.min(100, Math.max(5, ((points - currentBase) / (target - currentBase)) * 100));

  const combinedActivity = [
    ...history.map((h, i) => {
      const formattedAmount = h.totalAmount ? formatPrice(h.totalAmount) : 'Fidelización';
      return {
        id: `h-${i}`,
        type: h.actionType === 'earn' ? 'purchase' : 'loyalty',
        title: h.description || (h.actionType === 'earn' ? 'Pedido completado' : 'Canje de puntos'),
        desc: formattedAmount,
        value: h.points > 0 ? 'Crédito' : 'Canje',
        points: h.points > 0 ? `+${h.points}` : h.points,
        date: h.createdAt,
      };
    }),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      
      {/* HEADER SECTION */}
      <div className="bg-[var(--bg-card)] p-8 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-black text-[var(--text-primary)] tracking-tight leading-none mb-2">
            Hola, {user?.name?.split(" ")[0] || "Usuario"} 👋
          </h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-[var(--text-secondary)] font-bold uppercase text-[10px] tracking-widest">
            <MapPin size={12} className="text-brand-orange" />
            <span>Sede activa: <span className="text-brand-orange">{user?.branch || "Sede Montería"}</span></span>
          </div>
        </div>

        {/* TUS PUNTOS Mini Badge */}
        <div className="bg-brand-orange p-6 rounded-[2rem] shadow-xl shadow-brand-orange/20 text-white min-w-[160px] relative overflow-hidden group hover:scale-105 transition-transform duration-300">
           <div className="absolute top-0 right-0 w-16 h-16 bg-white/20 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
           <div className="relative z-10 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block mb-1">Tus Puntos</span>
              <div className="flex items-baseline justify-center gap-1">
                 <span className="text-4xl font-black">{points}</span>
                 <span className="text-xs font-bold opacity-70">pts</span>
              </div>
              <div className="mt-2 bg-black/20 rounded-full py-1.5 px-4 text-[9px] font-black uppercase tracking-widest inline-block border border-white/10">
                 ● {tier}
              </div>
           </div>
        </div>
      </div>

      {/* QUICK ACTIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm text-center flex flex-col justify-center gap-1">
          <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest mb-1">Pedidos Realizados</span>
          <span className="text-4xl font-black text-[var(--text-primary)] leading-none">{orders.length}</span>
          <div className="w-8 h-1.5 bg-[var(--bg-input)] mx-auto mt-4 rounded-full"></div>
        </div>

        <div className="bg-[var(--bg-card)] p-6 rounded-[2.5rem] border border-[var(--border-color)] shadow-sm text-center flex flex-col justify-center gap-1">
          <span className="text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-widest mb-1">Reseñas Enviadas</span>
          <span className="text-4xl font-black text-[var(--text-primary)] leading-none">{ratingsCount}</span>
          <div className="w-8 h-1.5 bg-[var(--bg-input)] mx-auto mt-4 rounded-full"></div>
        </div>

        <button 
          onClick={() => navigate('/menu')}
          className="bg-brand-orange rounded-[2.5rem] p-6 text-white shadow-lg shadow-brand-orange/30 flex flex-col items-center justify-center gap-3 hover:bg-orange-600 transition-all active:scale-95 group relative overflow-hidden"
        >
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center group-hover:rotate-6 transition-all duration-300">
            <ShoppingBag size={28} />
          </div>
          <span className="text-[12px] font-black uppercase tracking-[0.15em] leading-none">Pide Aquí</span>
        </button>
      </div>

      {/* PROGRESS BAR */}
      <div className="bg-[var(--bg-card)] p-8 rounded-[2rem] border border-[var(--border-color)] shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
           <span className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Tu Progreso de Nivel</span>
           <span className="text-[10px] font-black text-brand-orange uppercase tracking-widest bg-orange-50 dark:bg-orange-500/10 px-4 py-1.5 rounded-full">
            Faltan {target - points} pts para {nextTier}
          </span>
        </div>
        <div className="h-4 w-full bg-[var(--bg-input)] rounded-full overflow-hidden p-1">
             <div 
               className="h-full bg-brand-orange rounded-full shadow-[0_0_15px_rgba(255,92,0,0.5)] transition-all duration-1000 ease-out"
               style={{ width: `${progress}%` }}
             ></div>
        </div>
      </div>

      {/* PRIMARY BUTTONS: Perfil y Canjear */}
      <div className="flex flex-col md:flex-row gap-6 pt-4 w-full">
        <button 
          onClick={() => navigate('/rewards')}
          className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group flex items-center justify-center gap-6"
        >
          <div className="w-16 h-16 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center text-brand-orange group-hover:scale-110 transition-transform">
             <Gift size={32} />
          </div>
          <div className="text-left">
            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] block">Canjear</span>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Premios y Bonos</span>
          </div>
        </button>

        <button 
          onClick={() => navigate('/profile')}
          className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all group flex items-center justify-center gap-6"
        >
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
             <User size={32} />
          </div>
          <div className="text-left">
            <span className="text-[12px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)] block">Mi Perfil</span>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">Gestionar Cuenta</span>
          </div>
        </button>
      </div>

      {/* RECENT ACTIVITY */}
      <div className="pt-8 px-2">
        <div className="flex justify-between items-end mb-6">
          <h3 className="text-xs font-black uppercase tracking-[0.25em] text-[var(--text-secondary)]">Historial Reciente</h3>
          <button 
            onClick={() => navigate('/history')}
            className="text-[10px] font-black uppercase text-brand-orange hover:underline tracking-widest"
          >
            Ver Todo
          </button>
        </div>

        <div className="bg-[var(--bg-card)] rounded-[2.5rem] border border-[var(--border-color)] shadow-sm overflow-hidden">
           {combinedActivity.length === 0 ? (
             <div className="p-14 text-center text-slate-300 dark:text-slate-600 italic text-sm">Aún no tienes movimientos registrados.</div>
           ) : (
             <div className="divide-y divide-[var(--border-color)]">
               {combinedActivity.map((act) => (
                 <div key={act.id} className="p-6 flex items-center gap-5 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                    <div className="w-14 h-14 bg-orange-50 dark:bg-orange-500/10 rounded-2xl flex items-center justify-center text-brand-orange group-hover:scale-105 transition-transform">
                       {act.type === 'purchase' ? <ShoppingBag size={24} /> : <Gift size={24} />}
                    </div>
                    <div className="flex-1">
                       <h4 className="text-base font-black text-[var(--text-primary)] leading-none mb-1.5">{act.title}</h4>
                       <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{act.desc} • {new Date(act.date).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                       <span className={`text-base font-black block leading-none mb-1.5 ${act.points.toString().includes('+') ? 'text-emerald-500' : 'text-rose-500'}`}>
                         {act.points} pts
                       </span>
                       <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-tighter">{act.value}</span>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>

    </div>
  );
};

export default CustomerHome;
