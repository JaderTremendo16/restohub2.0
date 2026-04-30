import React from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { 
  GET_CART, 
  REMOVE_FROM_CART, 
  UPDATE_CART_QTY, 
  CLEAR_CART,
  GET_LOYALTY_ACCOUNT
} from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ArrowLeft,
  XCircle,
  Package
} from 'lucide-react';

const Cart = () => {
  const { user, getCurrencyConfig, formatPrice } = useAuth();
  const navigate = useNavigate();

  const { data: loyaltyData, refetch: refetchLoyalty } = useQuery(GET_LOYALTY_ACCOUNT, {
    variables: { customerId: user?.id },
    skip: !user,
    notifyOnNetworkStatusChange: true,
  });

  const { data, loading, refetch } = useQuery(GET_CART, {
    variables: { customerId: user?.id },
    skip: !user
  });

  const [removeFromCart] = useMutation(REMOVE_FROM_CART, {
    refetchQueries: ['GetCart']
  });

  const [updateQty] = useMutation(UPDATE_CART_QTY, {
    refetchQueries: ['GetCart']
  });

  const [clearCart] = useMutation(CLEAR_CART, {
    refetchQueries: ['GetCart']
  });

  const cart = data?.cart;
  const items = cart?.items || [];
  const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-12 h-12 border-4 border-brand-orange border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (items.length === 0) return (
    <div className="max-w-2xl mx-auto text-center py-20 space-y-6">
      <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
        <ShoppingBag size={48} />
      </div>
      <h2 className="text-3xl font-black text-slate-800 uppercase italic">Tu carrito está vacío</h2>
      <p className="text-slate-500 font-medium">¿Aún no te decides? ¡Mira nuestro delicioso menú!</p>
      <button 
        onClick={() => navigate('/menu')}
        className="inline-flex items-center gap-2 bg-brand-orange text-white px-8 py-4 rounded-2xl font-black uppercase text-sm shadow-xl shadow-brand-orange/20 hover:bg-brand-700 transition-all"
      >
        <ArrowLeft size={18} /> Ir al Menú
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase italic">Mi Carrito</h1>
          <p className="text-slate-500 font-medium mt-1">Revisa tus productos antes de finalizar el pedido.</p>
        </div>
        <button 
          onClick={() => clearCart({ variables: { cid: user.id } })}
          className="flex items-center gap-2 text-rose-500 font-black text-xs uppercase hover:bg-rose-50 px-4 py-2 rounded-xl transition-all"
        >
          <XCircle size={16} /> Vaciar Carrito
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.productId} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-md transition-all">
              <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shrink-0 group-hover:scale-110 transition-transform">
                {item.isReward ? "🎁" : "🍽️"}
              </div>
              
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-1">
                  {item.isReward && (
                    <span className="text-[8px] font-black uppercase bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg">Premio</span>
                  )}
                  <h3 className="text-lg font-black text-slate-800 uppercase italic leading-none">{item.name}</h3>
                </div>
                <p className="text-brand-orange font-black text-sm">
                  {item.price === 0 ? "GRATIS" : formatPrice(item.price)}
                </p>
              </div>

              <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                <button 
                  onClick={() => updateQty({ variables: { cid: user.id, pid: item.productId, qty: item.quantity - 1 } })}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-xl text-slate-400 hover:text-brand-orange hover:shadow-sm transition-all"
                >
                  <Minus size={14} />
                </button>
                <span className="font-black text-slate-800 w-4 text-center">{item.quantity}</span>
                <button 
                  onClick={() => updateQty({ variables: { cid: user.id, pid: item.productId, qty: item.quantity + 1 } })}
                  className="w-8 h-8 flex items-center justify-center bg-white rounded-xl text-slate-400 hover:text-brand-orange hover:shadow-sm transition-all"
                >
                  <Plus size={14} />
                </button>
              </div>

              <button 
                onClick={() => removeFromCart({ variables: { cid: user.id, pid: item.productId } })}
                className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}

          <button 
            onClick={() => navigate('/menu')}
            className="w-full py-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-3xl font-black uppercase text-xs hover:border-brand-orange hover:text-brand-orange transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Agregar más productos
          </button>
        </div>

        <div className="space-y-6">
          <div className="bg-brand-dark rounded-[2.5rem] p-8 text-white space-y-6 shadow-2xl shadow-black/20 sticky top-24">
            <h4 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-2">
              <Package size={20} /> Resumen
            </h4>
            
            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex justify-between items-center text-slate-400 font-bold text-sm">
                <span>Subtotal</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 font-bold text-sm">
                <span>Envío</span>
                <span className="text-emerald-400">Gratis</span>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-white/10">
                <span className="text-lg font-black uppercase italic">Total</span>
                <span className="text-2xl font-black text-brand-orange">{formatPrice(total)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-5 bg-brand-orange hover:bg-brand-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-orange/20 group"
            >
              Continuar al Pago
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <p className="text-[10px] text-slate-500 text-center font-bold uppercase tracking-widest leading-relaxed">
              * El total final puede variar según la sede seleccionada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
