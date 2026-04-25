import React, { useState } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client/react';
import {
  GET_REWARDS,
  GET_LOYALTY_ACCOUNT,
  REDEEM_POINTS_MUTATION,
  CREATE_REAL_ORDER,
  ADD_ORDER_ITEMS,
  GET_LOCATIONS,
  GET_CART,
  ADD_TO_CART
} from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Gift, Wallet, CheckCircle2, XCircle, Info,
  Sparkles, ChefHat, Loader2, Tag, ShoppingCart, Plus
} from 'lucide-react';

const RewardsCatalog = () => {
  const { user } = useAuth();
  const client = useApolloClient();
  const navigate = useNavigate();
  const [msg, setMsg]             = useState({ type: '', text: '' });
  const [claimingId, setClaimingId] = useState(null); // reward que está procesando

  // ─── Queries ───────────────────────────────────────────────
  const { data: rewardsData, loading: loadingRewards, refetch: refetchRewards, networkStatus } = useQuery(GET_REWARDS, {
    variables: { activeOnly: true },
    notifyOnNetworkStatusChange: true,
  });

  const { data: loyaltyData, refetch: refetchLoyalty } = useQuery(GET_LOYALTY_ACCOUNT, {
    variables: { customerId: user?.id },
    skip: !user,
    notifyOnNetworkStatusChange: true,
  });

  const isInitialLoading = loadingRewards && networkStatus === 1;

  // ─── Mutations ──────────────────────────────────────────────
  const [redeemPoints]    = useMutation(REDEEM_POINTS_MUTATION);
  const [createRealOrder] = useMutation(CREATE_REAL_ORDER);
  const [addOrderItems]   = useMutation(ADD_ORDER_ITEMS);

  const rewards = rewardsData?.rewards || [];
  const points  = loyaltyData?.loyaltyAccount?.totalPoints || 0;

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ type: '', text: '' }), 6000);
  };

  const { data: cartData } = useQuery(GET_CART, {
    variables: { customerId: user?.id },
    skip: !user,
  });

  const [addToCart, { loading: addingToCart }] = useMutation(ADD_TO_CART, {
    refetchQueries: ['GetCart'],
    onCompleted: () => {
      showMsg('success', 'Premio agregado al carrito correctamente.');
    },
  });

  const cartItemCount = cartData?.cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const handleAddToCartReward = async (reward) => {
    if (points < reward.pointsCost) {
      showMsg('error', `Necesitas ${reward.pointsCost} puntos. Solo tienes ${points}.`);
      return;
    }

    try {
      await addToCart({
        variables: {
          cid: user?.id,
          pid: `reward-${reward.id}`,
          name: `🎁 ${reward.name} (Canje)`,
          price: 0,
          qty: 1,
          reward: true
        }
      });
    } catch (err) {
      showMsg('error', "Error al agregar al carrito: " + err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Gift className="text-brand-600" size={32} />
            Catálogo de Premios
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Canjea tus puntos por platos y beneficios exclusivos — <strong>sin costo adicional</strong>.
          </p>
        </div>

        {/* Puntos disponibles */}
        <div className="bg-brand-dark text-white p-6 rounded-3xl flex items-center gap-6 shadow-xl shadow-brand-dark/20 w-full md:w-auto">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-brand-400">
            <Wallet size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Tus Puntos Disponibles</div>
            <div className="text-3xl font-black tabular-nums">
              {points.toLocaleString()} <span className="text-sm font-bold opacity-30 italic">pts</span>
            </div>
          </div>
        </div>

        {/* Cart Trigger */}
        <button 
          onClick={() => navigate('/cart')}
          className="bg-brand-dark text-white p-6 rounded-3xl flex items-center gap-4 shadow-xl hover:scale-105 transition-all relative"
        >
          <ShoppingCart size={24} />
          <div className="text-left">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-50">Mi Pedido</div>
            <div className="text-xl font-black">{cartItemCount} items</div>
          </div>
          {cartItemCount > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-orange text-white rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white">
              {cartItemCount}
            </div>
          )}
        </button>
      </div>

      {/* Cómo funciona */}
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4 text-blue-700">
        <Info size={20} className="mt-0.5 flex-shrink-0" />
        <div className="text-sm font-medium">
          <strong className="font-black">¿Cómo funciona?</strong> Cuando canjeas un premio, se descuentan tus puntos
          y se crea automáticamente un pedido gratuito en cocina. La factura se generará en <strong>$0</strong>.
          Sigue el estado en <strong>"Mis Pedidos"</strong>.
        </div>
      </div>

      {/* Alerta de resultado */}
      {msg.text && (
        <div className={`p-5 rounded-3xl flex items-start gap-4 animate-in slide-in-from-top-4 duration-300
          ${msg.type === 'success'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={24} className="flex-shrink-0 mt-0.5" /> : <XCircle size={24} className="flex-shrink-0 mt-0.5" />}
          <p className="font-bold">{msg.text}</p>
        </div>
      )}

      {/* Grid de premios */}
      {isInitialLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Cargando catálogo...</p>
        </div>
      ) : rewards.length === 0 ? (
        <div className="bg-white p-20 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100">
          <Info size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">No hay premios habilitados en este momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
          {rewards.map((reward) => {
            const canAfford  = points >= reward.pointsCost;
            const outOfStock = reward.stock === 0;
            const isClaiming = claimingId === reward.id;
            const disabled   = !canAfford || outOfStock || isClaiming || !!claimingId;

            return (
              <div
                key={reward.id}
                className={`group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm
                  hover:shadow-xl hover:-translate-y-2 transition-all flex flex-col h-full
                  ${outOfStock ? 'opacity-60 grayscale' : ''}
                  ${canAfford && !outOfStock ? 'border-brand-100' : ''}
                `}
              >
                {/* Top: icono + costo en puntos */}
                <div className="flex justify-between items-start mb-8 shrink-0">
                  <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center relative shadow-inner">
                    <Gift size={32} className="relative z-10" />
                    <Sparkles className="absolute top-1 right-1 text-brand-300 animate-pulse" size={14} />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{reward.pointsCost}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Puntos</div>
                  </div>
                </div>

                {/* Nombre */}
                <h3 className="text-xl font-black text-slate-900 mb-2 leading-tight group-hover:text-brand-600 transition-colors uppercase italic tracking-tight">
                  {reward.name}
                </h3>

                {/* Badge gratis */}
                <span className="inline-flex items-center gap-1 w-max mb-3 px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider">
                  <Tag size={10} /> Pedido Gratuito
                </span>

                {/* Descripción */}
                <p className="text-slate-500 text-sm font-medium mb-8 line-clamp-3 leading-relaxed flex-1">
                  {reward.description || 'Disfruta de este beneficio exclusivo por ser parte de nuestra comunidad.'}
                </p>

                {/* Footer: stock + botón */}
                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Actual</span>
                    <span className={`text-sm font-black tracking-tight ${reward.stock < 5 ? 'text-rose-500' : 'text-slate-800'}`}>
                      {reward.stock} {reward.stock === 1 ? 'unidad' : 'unidades'}
                    </span>
                  </div>

                  <button
                    disabled={disabled}
                    onClick={() => handleAddToCartReward(reward)}
                    className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest
                      transition-all min-w-[130px] flex items-center justify-center gap-2
                      ${canAfford && !outOfStock && !addingToCart
                        ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/30 hover:bg-brand-700 active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                  >
                    {addingToCart ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        Agregando...
                      </>
                    ) : outOfStock ? (
                      'Agotado'
                    ) : !canAfford ? (
                      `Faltan ${reward.pointsCost - points} pts`
                    ) : (
                      <>
                        <Plus size={13} />
                        Agregar al Carrito
                      </>
                    )}
                  </button>
                </div>

                {/* Barra de progreso de puntos */}
                {!outOfStock && !canAfford && (
                  <div className="mt-4">
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-brand-500 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (points / reward.pointsCost) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 text-right">
                      {points} / {reward.pointsCost} puntos
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RewardsCatalog;
