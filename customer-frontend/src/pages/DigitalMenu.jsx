import React, { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  GET_DISHES,
  COMPLETE_ORDER_MUTATION,
  CREATE_REAL_ORDER,
  ADD_ORDER_ITEMS,
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
  Loader2
} from "lucide-react";
import { GET_CART, ADD_TO_CART } from "../graphql/operations";
import RatingModal from "../components/common/RatingModal";
import { GET_LOCATIONS } from "../graphql/operations";

const DigitalMenu = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [selectedDishForRating, setSelectedDishForRating] = useState(null);
  const [orderStatus, setOrderStatus] = useState({ show: false, text: "" });

  // Usamos OnlyActive para ver platos disponibles.
  // Se omite location_id porque el cliente usa nombres de sede (String)
  // que no mapean directamente a los IDs numéricos del menu-service.
  const { data, loading, error, refetch } = useQuery(GET_DISHES, {
    variables: { OnlyActive: true },
    skip: !user,
  });

  const navigate = useNavigate();

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
    variables: { customerId: user.id },
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

  const { data: locData } = useQuery(GET_LOCATIONS);
  const locations = locData?.locations || [];

  // Encontrar el ID numérico de la sede actual del usuario basado en su nombre
  const currentLocation = locations.find(loc => 
    loc.name?.trim().toLowerCase() === user?.branch?.trim().toLowerCase()
  );
  const currentLocationId = currentLocation ? parseInt(currentLocation.id) : null;

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
    
    // CORRECCIÓN CRÍTICA: Si el precio viene multiplicado por 1000 (ej: 650000), lo normalizamos.
    if (price > 10000) {
      price = price / 1000;
    }

    return {
      ...d,
      price: price,
      emoji: "🍽️",
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
    return matchesSearch && matchesCategory;
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
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <UtensilsCrossed className="text-brand-600" size={32} />
            Menú Digital
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Sede activa:{" "}
            <span className="font-bold text-brand-600">
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
              className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 ring-brand-500/20 transition-all border border-transparent focus:border-brand-500"
            />
          </div>
          
          <div className="bg-brand-dark px-4 rounded-2xl flex items-center gap-2 text-white shadow-lg shadow-brand-dark/10">
            <Filter size={16} className="text-slate-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-xs font-black uppercase outline-none py-3"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat} className="text-slate-900">
                  {cat}
                </option>
              ))}
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
              <div className="h-48 bg-slate-50 flex items-center justify-center relative overflow-hidden shrink-0">
                <div className="text-7xl group-hover:scale-125 transition-transform duration-500 select-none">
                  {dish.emoji}
                </div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-2xl shadow-sm border border-slate-100/50">
                  <span className="text-xl font-black text-slate-900 leading-none">
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dish.price)}
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
