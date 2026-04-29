import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_DISHES, TOGGLE_DISH_STATUS_MUTATION } from '../../graphql/operations';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Search, Filter, Plus, Power, MapPin } from 'lucide-react';

const MenuManagement = () => {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  const { data, loading, refetch } = useQuery(GET_DISHES, {
    variables: { 
      activeOnly: false,
      branch: currentUser?.branch 
    }
  });

  const [toggleDishStatus] = useMutation(TOGGLE_DISH_STATUS_MUTATION);

  const dishes = data?.dishes || [];
  const categories = ['Todas', ...new Set(dishes.map(d => d.category).filter(Boolean))];

  const filteredDishes = dishes.filter(d => 
    (d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     d.description?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (categoryFilter === 'Todas' || d.category === categoryFilter)
  );

  const handleToggle = async (id) => {
    try {
      await toggleDishStatus({ variables: { id } });
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <BookOpen className="text-brand-600" size={32} />
            Gestión de Menú
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Sede Actual: <span className="text-brand-600 font-bold">{currentUser?.branch || 'Global'}</span></p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o descripción..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-brand-500 focus:bg-white transition-all"
          />
        </div>
        <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
           <Filter size={18} className="text-slate-400" />
           <select 
             className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none py-2"
             value={categoryFilter}
             onChange={(e) => setCategoryFilter(e.target.value)}
           >
             {categories.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
        </div>
      </div>

      {loading ? (
         <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Sincronizando menú...</p>
         </div>
      ) : filteredDishes.length === 0 ? (
         <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-400">
            No hay platos que coincidan con los filtros.
         </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filteredDishes.map((dish) => (
            <div key={dish.id} className={`group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col h-full overflow-hidden ${!dish.isActive ? 'bg-slate-50/50 grayscale-[0.5]' : ''}`}>
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-slate-50 shrink-0">
                    {dish.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-slate-900 uppercase italic leading-tight truncate tracking-tight mb-1">
                      {dish.name}
                    </h3>
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${dish.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                       <span className="text-[8px] font-black uppercase text-slate-400 tracking-widest truncate">
                         {dish.category || 'General'}
                       </span>
                    </div>
                  </div>
                </div>

                <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed flex-1 line-clamp-2">
                  {dish.description || 'Sin descripción disponible.'}
                </p>

                <div className="space-y-4 pt-6 border-t border-slate-50">
                  <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Precio</span>
                    <span className="text-xl font-black text-slate-900">${dish.price.toLocaleString()}</span>
                  </div>
                  
                  <button 
                    onClick={() => handleToggle(dish.id)}
                    className={`w-full py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 font-black text-[11px] uppercase tracking-widest ${
                      dish.isActive 
                        ? 'bg-rose-600 text-white shadow-lg shadow-rose-200 hover:bg-rose-700' 
                        : 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700'
                    }`}
                  >
                    <Power size={14} /> {dish.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
