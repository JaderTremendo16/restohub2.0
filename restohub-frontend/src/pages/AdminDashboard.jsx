import { Link } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { 
  GET_TOTAL_ORDERS, 
  GET_ALL_RATINGS, 
  GET_REWARDS, 
  GET_USERS 
} from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart2, 
  TrendingUp, 
  Star, 
  AlertTriangle, 
  Utensils, 
  ChevronRight,
  ShoppingCart,
  Users
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const branchFilter = user?.branch;

  const { data: ordersData } = useQuery(GET_TOTAL_ORDERS, {
    variables: { b: branchFilter }
  });
  
  const { data: ratingsData } = useQuery(GET_ALL_RATINGS, {
    variables: { branch: branchFilter }
  });
  
  const { data: rewardsData } = useQuery(GET_REWARDS);
  
  const { data: usersData } = useQuery(GET_USERS, {
    variables: { b: branchFilter }
  });

  const totalOrders = ordersData?.totalOrders || 0;
  const ratings = ratingsData?.allRatings || [];
  const rewards = rewardsData?.rewards || [];
  const customers = (usersData?.users || []).filter(u => u.role !== 'admin');

  // Stats calculation
  const totalReviews = ratings.length;
  const avgRating = totalReviews > 0 
    ? (ratings.reduce((sum, r) => sum + r.stars, 0) / totalReviews).toFixed(1) 
    : "0.0";

  // Top Dishes calculation
  const dishStats = {};
  ratings.forEach(r => {
    if (!dishStats[r.itemName]) dishStats[r.itemName] = { count: 0, sum: 0 };
    dishStats[r.itemName].count++;
    dishStats[r.itemName].sum += r.stars;
  });
  
  const topDishes = Object.keys(dishStats)
    .map(name => ({ name, avg: dishStats[name].sum / dishStats[name].count, count: dishStats[name].count }))
    .sort((a,b) => b.avg - a.avg)
    .slice(0, 4);

  // Critical Stock Alerts
  const criticalRewards = rewards.filter(r => r.stock < 5 && r.isActive);

  const StatCard = ({ label, value, icon: Icon, color, trend }) => (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 blur-3xl rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-700`} />
      <div className="relative z-10">
        <div className={`w-14 h-14 bg-${color}-50 text-${color}-600 rounded-2xl flex items-center justify-center mb-6`}>
          <Icon size={28} />
        </div>
        <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">{label}</div>
        <div className="flex items-baseline gap-2">
          <div className="text-4xl font-black text-slate-900 tracking-tighter">{value}</div>
          {trend && <div className="text-xs font-bold text-emerald-500 flex items-center gap-0.5"><TrendingUp size={12} /> {trend}</div>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BarChart2 className="text-brand-600" size={32} />
            Analytics Dashboard
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Visualización de métricas para la sede: <span className="text-brand-600 font-bold">{branchFilter || 'Todas'}</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard label="Pedidos Totales" value={totalOrders} icon={ShoppingCart} color="brand" trend="+12%" />
        <StatCard label="Reseñas Recibidas" value={totalReviews} icon={Star} color="amber" trend="+5%" />
        <StatCard label="Valoración Media" value={avgRating} icon={TrendingUp} color="emerald" />
        <StatCard label="Clientes Activos" value={customers.length} icon={Users} color="indigo" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Dishes */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
             <Utensils className="text-brand-600" size={24} />
             Platos Mejor Valorados
          </h3>
          <div className="space-y-4">
            {topDishes.length === 0 ? (
               <p className="text-slate-400 italic text-center py-10">Aún no hay reseñas para platos.</p>
            ) : (
              topDishes.map((dish, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-3xl hover:bg-slate-50 transition-colors">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400">
                    #{i + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 uppercase italic text-sm tracking-tight">{dish.name}</h4>
                    <span className="text-xs text-slate-400 font-bold">{dish.count} opiniones</span>
                  </div>
                  <div className="text-right">
                    <div className="flex text-amber-400 mb-1">
                      {[...Array(5)].map((_, star) => (
                        <Star key={star} size={12} fill={star < Math.round(dish.avg) ? "currentColor" : "none"} />
                      ))}
                    </div>
                    <div className="text-xs font-black text-slate-900">{dish.avg.toFixed(1)} / 5.0</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Inventory Alerts */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-3">
             <AlertTriangle className="text-rose-500" size={24} />
             Alertas de Stock (Premios)
          </h3>
          <div className="flex-1 space-y-4">
            {criticalRewards.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                    <TrendingUp size={32} />
                  </div>
                  <p className="text-slate-400 font-medium">Todos los premios tienen stock suficiente.</p>
               </div>
            ) : (
              criticalRewards.map((r) => (
                <div key={r.id} className="p-5 border-2 border-rose-50 bg-rose-50/20 rounded-3xl flex justify-between items-center group hover:bg-rose-50 transition-all">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center animate-pulse">
                        <AlertTriangle size={20} />
                     </div>
                     <div>
                        <h4 className="font-bold text-slate-900 uppercase italic text-sm">{r.name}</h4>
                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">STOCK CRÍTICO</span>
                     </div>
                  </div>
                  <div className="text-right">
                     <div className="text-2xl font-black text-rose-600">{r.stock}</div>
                     <div className="text-[10px] font-black text-slate-400 uppercase">unidades</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <Link 
            to="/admin/rewards"
            className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
             Gestionar Inventario <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
