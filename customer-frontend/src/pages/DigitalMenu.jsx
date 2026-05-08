import React, { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_DISHES,
  COMPLETE_ORDER_MUTATION,
  CREATE_REAL_ORDER,
  ADD_ORDER_ITEMS,
  GET_CART,
  ADD_TO_CART,
  GET_LOCATIONS
} from "../graphql/operations";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  UtensilsCrossed,
  Search,
  Filter,
  ShoppingBag,
  Star,
  Info,
  CheckCircle2,
  ShoppingCart,
  Plus,
  Loader2,
  MessageSquare,
  ChevronDown,
  MapPin,
} from "lucide-react";
import RatingModal from "../components/common/RatingModal";

const DigitalMenu = () => {
  const { user, getCurrencyConfig, formatPrice } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedDishForRating, setSelectedDishForRating] = useState(null);
  const [orderStatus, setOrderStatus] = useState({ show: false, text: "" });

  const { data: locData } = useQuery(GET_LOCATIONS);
  const locations = locData?.locations || [];

  // Encontrar el ID numérico de la sede actual del usuario basado en su nombre
  const currentLocation = locations.find(loc => 
    loc.name?.trim().toLowerCase() === user?.branch?.trim().toLowerCase()
  );
  const currentLocationId = currentLocation ? parseInt(currentLocation.id) : null;

  // Usamos OnlyActive para ver platos disponibles.
  // Se omite location_id porque el cliente usa nombres de sede (String)
  // que no mapean directamente a los IDs numéricos del menu-service.
  const { data, loading, error, refetch } = useQuery(GET_DISHES, {
    variables: { 
      OnlyActive: true,
      location_id: currentLocationId 
    },
    skip: !user || !currentLocationId,
  });

  const [completeOrder] = useMutation(COMPLETE_ORDER_MUTATION, {
    refetchQueries: ["GetOrders"],
    awaitRefetchQueries: true,
  });

  const [createRealOrder] = useMutation(CREATE_REAL_ORDER);
  const [addOrderItems, { loading: ordering }] = useMutation(ADD_ORDER_ITEMS, {
    refetchQueries: ["GetLoyaltyAccount", "GetPointHistory"],
    awaitRefetchQueries: true,
  });

  const { data: cartData } = useQuery(GET_CART, {
    variables: { customerId: user?.id },
    skip: !user,
  });

  const [addToCart, { loading: addingToCart }] = useMutation(ADD_TO_CART, {
    refetchQueries: ["GetCart"],
    onCompleted: () => {
      setOrderStatus({ show: true, text: "¡Producto agregado al carrito!" });
      setTimeout(() => setOrderStatus({ show: false, text: "" }), 3000);
    },
  });

  const cartItemCount = cartData?.cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  // Normalizar platos del menu-service real al formato que usa el componente
  const rawDishes = data?.dishes || [];
  const dishes = rawDishes.map((d) => {
    // Buscar el precio específico de la sede del usuario, si no, el primero.
    let priceObj = null;
    if (currentLocationId) {
      priceObj = d.prices?.find(p => parseInt(p.restaurant_id) === currentLocationId);
    }
    if (!priceObj) {
      priceObj = d.prices?.[0];
    }
    
    let price = priceObj?.price ?? 0;
    
    return {
      ...d,
      price: parseFloat(price),
      emoji: d.emoji || "🍽️",
      imageUrl: d.image_url,
      isActive: d.is_active,
    };
  });

  const categories = [
    "Todos",
    ...new Set(dishes.map((d) => d.category).filter(Boolean)),
  ];

  const filteredDishes = dishes.filter((dish) => {
    const matchesSearch =
      dish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dish.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todos" || dish.category === selectedCategory;
    
    // Nueva lógica: Solo mostrar si está activo y disponible (stock)
    const hasInactiveIngredients = dish.ingredients?.some(ing => ing.ingredient && !ing.ingredient.is_active);
    const isAvailable = dish.is_active && !hasInactiveIngredients && dish.isAvailable !== false;

    return matchesSearch && matchesCategory && isAvailable;
  });



  const handleAddToCart = async (dish) => {
    try {
      await addToCart({
        variables: {
          cid: user.id,
          pid: String(dish.id),
          name: dish.name,
          price: parseFloat(dish.price),
          qty: 1,
          reward: false
        }
      });
    } catch (err) {
      alert("Error al agregar al carrito: " + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-[var(--bg-card)] p-8 rounded-[2.5rem] shadow-sm border border-[var(--border-color)] flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="animate-in slide-in-from-left-4">
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-4">
            <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center">
              <UtensilsCrossed className="text-brand-orange" size={24} />
            </div>
            Menú Digital
          </h1>
          <p className="text-[var(--text-secondary)] font-medium mt-1">
            Sede activa:{" "}
            <span className="font-bold text-brand-orange">
              {user?.branch || "General"}
            </span>
          </p>
        </div>

        <div className="flex w-full md:w-auto gap-4">
          <div className="relative flex-1 md:w-64">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar plato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-4 focus:ring-brand-orange/10 focus:border-brand-orange transition-all placeholder:text-slate-400"
            />
          </div>
          
          <div className="relative group w-full md:w-auto">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-brand-orange transition-colors pointer-events-none">
              <Filter size={18} />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full md:w-auto pl-11 pr-10 py-3.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-2xl text-[var(--text-primary)] font-black uppercase tracking-widest text-[10px] outline-none focus:ring-4 focus:ring-brand-orange/10 focus:border-brand-orange transition-all appearance-none cursor-pointer shadow-sm min-w-[140px]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="text-slate-900">
                  {cat.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
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
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">
            Cargando la carta...
          </p>
        </div>
      ) : filteredDishes.length === 0 ? (
        <div className="bg-white p-20 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100">
          <Info size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">
            No encontramos platos que coincidan con tu búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
          {filteredDishes.map((dish) => (
            <div
              key={dish.id}
              className="group bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all flex flex-col h-full"
            >
              <div className="h-48 bg-slate-100 flex items-center justify-center relative overflow-hidden shrink-0">
                {dish.imageUrl ? (
                  <img 
                    src={dish.imageUrl} 
                    alt={dish.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="text-7xl group-hover:scale-125 transition-transform duration-500 select-none">
                    {dish.emoji}
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-slate-100/50">
                  <span className="text-xl font-black text-slate-900 leading-none">
                    {formatPrice(dish.price)}
                  </span>
                </div>
              </div>

              <div className="p-8 flex flex-col flex-1">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-[9px] font-black uppercase text-brand-600 bg-brand-50 px-3 py-1.5 rounded-xl tracking-widest leading-none">
                    {dish.category || "General"}
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
                  {dish.description ||
                    "Una deliciosa opción preparada con los mejores ingredientes de nuestra sede."}
                </p>

                <div className="flex gap-3 pt-6 border-t border-slate-50 mt-auto">
                  <button
                    onClick={() => handleAddToCart(dish)}
                    disabled={addingToCart}
                    className="flex-1 py-4 bg-brand-orange text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-brand-700 transition-all shadow-lg shadow-brand-orange/20 active:scale-95 group/btn"
                  >
                    {addingToCart ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <Plus size={16} className="group-hover/btn:translate-y-[-1px] transition-transform" />
                        Agregar al Carrito
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedDishForRating(dish.name)}
                    className="p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-brand-600 hover:border-brand-600 hover:text-brand-600 dark:hover:bg-brand-900/20 rounded-2xl transition-all shadow-sm group/rating"
                    title="Calificar este plato"
                  >
                    <MessageSquare size={20} className="group-hover/rating:scale-110 transition-transform" />
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
