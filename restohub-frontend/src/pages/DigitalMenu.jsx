import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_DISHES, COMPLETE_ORDER_MUTATION } from '../graphql/operations';
import { GET_LOCATIONS, GET_COUNTRIES } from '../graphql/location';
import { useAuth } from '../context/AuthContext';
import { UtensilsCrossed, Search, Filter, ShoppingBag, Star, Info, CheckCircle2 } from 'lucide-react';
import RatingModal from '../components/common/RatingModal';

const DigitalMenu = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedDishForRating, setSelectedDishForRating] = useState(null);
  const [orderStatus, setOrderStatus] = useState({ show: false, text: '' });

  const { data, loading, error, refetch } = useQuery(GET_DISHES, {
    variables: { activeOnly: true, branch: user?.branch },
    skip: !user
  });

  const [completeOrder, { loading: ordering }] = useMutation(COMPLETE_ORDER_MUTATION, {
    refetchQueries: [
      'GetLoyaltyAccount',
      'GetPointHistory',
      'GetOrders'
    ],
    awaitRefetchQueries: true
  });

  // --- Lógica de país y moneda ---
  const { data: locationsData } = useQuery(GET_LOCATIONS);
  const { data: countriesData } = useQuery(GET_COUNTRIES);

  const sedeActual = locationsData?.locations?.find(
    (l) => l.name === (user?.branch || "General")
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

  const dishes = data?.dishes || [];
  const categories = ['Todos', ...new Set(dishes.map(d => d.category).filter(Boolean))];

  const filteredDishes = dishes.filter(dish => {
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          dish.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || dish.category === selectedCategory;
    
    // --- Nueva lógica de disponibilidad ---
    const hasInactiveIngredients = dish.ingredients?.some(ing => ing.ingredient && ing.ingredient.is_active === false);
    const isAvailable = dish.isActive !== false && !hasInactiveIngredients;
    
    return matchesSearch && matchesCategory && isAvailable;
  });

  const handleOrder = async (dish) => {
    if (!window.confirm(`¿Confirmar orden de ${dish.name} por ${formatCurrency(dish.price)}?`)) return;

    try {
      const items = JSON.stringify([{ name: dish.name, price: dish.price, qty: 1 }]);
      await completeOrder({
        variables: { 
          cid: user.id, 
          items, 
          total: parseFloat(dish.price), 
          branch: user.branch || "General" 
        }
      });
      
      setOrderStatus({ show: true, text: '¡Orden enviada con éxito! Se han sumado tus puntos.' });
      setTimeout(() => setOrderStatus({ show: false, text: '' }), 4000);
    } catch (err) {
      alert("Error al procesar orden: " + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <UtensilsCrossed className="text-brand-600" size={32} />
            Menú Digital
          </h1>
          <p className="text-slate-500 font-medium mt-1">Sede activa: <span className="font-bold text-brand-600">{user?.branch || 'General'}</span></p>
        </div>

        <div className="flex w-full md:w-auto gap-4">
           <div className="relative flex-1 md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar plato..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 ring-brand-500/20 transition-all border border-transparent focus:border-brand-500"
              />
           </div>
           <div className="bg-slate-900 px-4 rounded-2xl flex items-center gap-2 text-white">
              <Filter size={16} className="text-slate-500" />
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs font-black uppercase outline-none py-3"
              >
                {categories.map(cat => <option key={cat} value={cat} className="text-slate-900">{cat}</option>)}
              </select>
           </div>
        </div>
      </div>

      {orderStatus.show && (
         <div className="p-5 bg-emerald-50 text-emerald-700 rounded-3xl border border-emerald-100 flex items-center gap-4 animate-in slide-in-from-top-4">
            <CheckCircle2 size={24} />
            <p className="font-bold">{orderStatus.text}</p>
         </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Cargando la carta...</p>
        </div>
      ) : filteredDishes.length === 0 ? (
        <div className="bg-white p-20 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100">
           <Info size={48} className="text-slate-200 mx-auto mb-4" />
           <p className="text-slate-400 font-medium">No encontramos platos que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
          {filteredDishes.map((dish) => (
            <div key={dish.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all flex flex-col h-full">
              <div className="h-48 bg-slate-50 flex items-center justify-center relative overflow-hidden shrink-0">
                <div className="text-7xl group-hover:scale-125 transition-transform duration-500 select-none">
                  {dish.emoji}
                </div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-slate-100/50">
                  <span className="text-xl font-black text-slate-900 leading-none">{formatCurrency(dish.price)}</span>
                </div>
              </div>
              
              <div className="p-8 flex flex-col flex-1">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-[9px] font-black uppercase text-brand-600 bg-brand-50 px-3 py-1.5 rounded-xl tracking-widest leading-none">
                    {dish.category || 'General'}
                  </span>
                  {dish.branch && (
                    <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl tracking-widest leading-none border border-slate-100/50">
                      Sede: {dish.branch}
                    </span>
                  )}
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-3 leading-tight group-hover:text-brand-600 transition-colors uppercase italic tracking-tight">
                  {dish.name}
                </h3>

                <p className="text-slate-500 text-sm font-medium mb-8 line-clamp-2 leading-relaxed flex-1">
                  {dish.description || 'Una deliciosa opción preparada con los mejores ingredientes de nuestra sede.'}
                </p>

                <div className="flex gap-3 pt-6 border-t border-slate-50 mt-auto">
                  <button 
                    onClick={() => handleOrder(dish)}
                    disabled={ordering}
                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95 group/btn"
                  >
                    <ShoppingBag size={16} className="group-hover/btn:translate-y-[-1px] transition-transform" /> 
                    Ordenar
                  </button>
                  <button 
                    onClick={() => setSelectedDishForRating(dish.name)}
                    className="p-4 bg-white border-2 border-slate-100 text-amber-400 hover:border-amber-400 hover:bg-amber-50 rounded-2xl transition-all shadow-sm"
                  >
                    <Star size={20} fill="currentColor" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedDishForRating && (
        <RatingModal 
          dishName={selectedDishForRating} 
          onClose={() => setSelectedDishForRating(null)} 
        />
      )}
    </div>
  );
};

export default DigitalMenu;
