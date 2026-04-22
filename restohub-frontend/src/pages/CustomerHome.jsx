import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { 
  GET_LOYALTY_ACCOUNT, 
  GET_POINT_HISTORY, 
  GET_ORDERS,
  GET_PROMOTIONS
} from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import { 
  Trophy, 
  TrendingUp, 
  Clock, 
  ChevronRight, 
  Crown, 
  Gift, 
  Zap,
  ArrowUpRight
} from 'lucide-react';

const CustomerHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const { data: loyaltyData } = useQuery(GET_LOYALTY_ACCOUNT, {
    variables: { customerId: user.id },
    skip: !user
  });
  
  const { data: historyData } = useQuery(GET_POINT_HISTORY, {
    variables: { customerId: user.id },
    skip: !user
  });
  
  const { data: promoData } = useQuery(GET_PROMOTIONS, {
    variables: { activeOnly: true, branch: user?.branch }
  });

  const { data: ordersData } = useQuery(GET_ORDERS, {
    variables: { cid: user?.id },
    skip: !user
  });

  const loyalty = loyaltyData?.loyaltyAccount;
  const points = loyalty?.totalPoints || 0;
  const tier = loyalty?.tier?.toLowerCase() || 'bronze';
  const history = historyData?.pointHistory || [];
  const promos = promoData?.promotions || [];
  const orders = ordersData?.orders || [];

  // Tier progress logic
  let nextTier = "Plata", target = 100, currentBase = 0;
  if (points >= 1000) { nextTier = "Máximo Nivel"; target = points; currentBase = 0; }
  else if (points >= 500) { nextTier = "Platino"; target = 1000; currentBase = 500; }
  else if (points >= 100) { nextTier = "Oro"; target = 500; currentBase = 100; }

  const progress = Math.min(100, Math.max(5, ((points - currentBase) / (target - currentBase)) * 100));

  const tierColors = {
    bronze: 'from-orange-400 to-orange-700',
    silver: 'from-slate-300 to-slate-500',
    gold: 'from-amber-300 to-amber-500',
    platinum: 'from-indigo-400 to-indigo-600'
  };

  const combinedActivity = [
    ...orders.map(o => ({
      id: o.id,
      type: 'purchase',
      title: 'Compra en Sede',
      desc: o.branch,
      value: `-$${o.totalPrice.toLocaleString()}`,
      points: `+${Math.floor(o.totalPrice / 1000)}`,
      date: o.createdAt
    })),
    ...history.map((h, i) => ({
      id: `h-${i}`,
      type: 'loyalty',
      title: h.description || h.actionType,
      desc: 'Fidelización',
      value: h.points > 0 ? 'Crédito' : 'Canje',
      points: h.points > 0 ? `+${h.points}` : h.points,
      date: h.createdAt
    }))
  ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header with Welcome */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Hola, {user?.name?.split(' ')[0] || 'Usuario'} 👋</h1>
          <p className="text-slate-500 font-medium mt-1">Sede: <span className="text-brand-600 font-bold">{user?.branch || 'General'}</span></p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center min-w-[100px]">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Pedidos</div>
            <div className="text-xl font-black text-slate-800">{orders.length}</div>
          </div>
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 text-center min-w-[100px]">
             <div className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">Reviews</div>
             <div className="text-xl font-black text-slate-800">4</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tier Card */}
        <div className="lg:col-span-2 relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/20">
          <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${tierColors[tier]} opacity-20 blur-3xl`} />
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-10">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-2 block">Puntos Acumulados</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-black tracking-tighter">{points}</span>
                  <span className="text-xl font-bold text-slate-500 italic">pts</span>
                </div>
              </div>
              <div className={`p-4 bg-gradient-to-br ${tierColors[tier]} rounded-3xl shadow-xl flex items-center justify-center`}>
                <Crown size={32} />
              </div>
            </div>

            <div className="mt-auto">
              <div className="flex justify-between items-end mb-4">
                <div>
                   <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Tu Rango Actual</div>
                   <div className="text-2xl font-black uppercase tracking-tight">{tier}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Próximo Nivel: {nextTier}</div>
                   <div className="text-sm font-bold text-brand-400">{target - points} pts faltantes</div>
                </div>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full bg-gradient-to-r ${tierColors[tier]} rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Promos Column */}
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Ofertas para hoy</h3>
            <Zap className="text-brand-500 animate-pulse" size={16} />
          </div>
          
          {promos.length === 0 ? (
             <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                <p className="text-slate-400 text-sm italic">No hay ofertas disponibles en tu sede actualmente.</p>
             </div>
          ) : (
            promos.slice(0, 3).map((p) => (
              <div 
                key={p.id} 
                onClick={() => navigate('/menu')}
                className="group bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center font-black text-xl">
                    {p.discountPercent}%
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 leading-tight group-hover:text-brand-600 transition-colors">{p.title}</h4>
                    <p className="text-slate-500 text-xs line-clamp-1">{p.description}</p>
                  </div>
                  <ArrowUpRight size={18} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
                </div>
              </div>
            ))
          )}

          <button 
            onClick={() => navigate('/menu')}
            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
             Ver Todas las Promociones
          </button>
        </div>
      </div>

      {/* Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2">
               <Clock size={16} className="text-brand-600" />
               Actividad Reciente
            </h3>
            <button 
              onClick={() => navigate('/history')}
              className="text-xs font-bold text-brand-600 hover:underline"
            >
              Ver Historial Completo
            </button>
          </div>
          
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-50">
              {combinedActivity.length === 0 ? (
                 <div className="p-10 text-center text-slate-400 italic">No hay actividad reciente.</div>
              ) : (
                combinedActivity.map((act) => (
                  <div key={act.id} className="p-5 flex items-center gap-6 hover:bg-slate-50 transition-colors">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${act.type === 'purchase' ? 'bg-indigo-50 text-indigo-500' : 'bg-brand-50 text-brand-500'}`}>
                      {act.type === 'purchase' ? <Clock size={20} /> : <Gift size={20} />}
                    </div>
                    <div className="flex-1">
                      <h5 className="font-bold text-slate-900">{act.title}</h5>
                      <div className="text-xs text-slate-400 font-medium">📍 {act.desc} • {new Date(act.date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                       <div className={`font-black tracking-tight ${act.points.toString().includes('+') ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {act.points} pts
                       </div>
                       <div className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">{act.value}</div>
                    </div>
                    <ChevronRight size={18} className="text-slate-200 ml-4" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;
