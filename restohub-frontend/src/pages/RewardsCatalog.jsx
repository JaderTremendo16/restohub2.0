import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { GET_REWARDS, GET_LOYALTY_ACCOUNT, REDEEM_POINTS_MUTATION } from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import { Gift, Wallet, CheckCircle2, XCircle, Info, Sparkles } from 'lucide-react';

const RewardsCatalog = () => {
  const { user } = useAuth();
  const [msg, setMsg] = useState({ type: '', text: '' });
  
  const { data: rewardsData, loading: loadingRewards, refetch: refetchRewards } = useQuery(GET_REWARDS, {
    variables: { activeOnly: true }
  });
  
  const { data: loyaltyData, refetch: refetchLoyalty } = useQuery(GET_LOYALTY_ACCOUNT, {
    variables: { customerId: user.id },
    skip: !user
  });

  const [redeemPoints, { loading: redeeming }] = useMutation(REDEEM_POINTS_MUTATION);

  const rewards = rewardsData?.rewards || [];
  const points = loyaltyData?.loyaltyAccount?.totalPoints || 0;

  const handleRedeem = async (reward) => {
    if (points < reward.pointsCost) {
      setMsg({ type: 'error', text: 'No tienes puntos suficientes para este premio.' });
      setTimeout(() => setMsg({ type: '', text: '' }), 4000);
      return;
    }

    if (!window.confirm(`¿Seguro que quieres canjear "${reward.name}" por ${reward.pointsCost} puntos?`)) return;

    try {
      const { data } = await redeemPoints({
        variables: { cid: user.id, rid: reward.id }
      });

      if (data?.redeemPoints?.success) {
        setMsg({ type: 'success', text: `${data.redeemPoints.message}. ¡Disfruta tu premio!` });
        refetchRewards();
        refetchLoyalty();
      } else {
        setMsg({ type: 'error', text: data.redeemPoints.message });
      }
    } catch (error) {
      setMsg({ type: 'error', text: error.message });
    }
    setTimeout(() => setMsg({ type: '', text: '' }), 5000);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Gift className="text-brand-600" size={32} />
            Catálogo de Premios
          </h1>
          <p className="text-slate-500 font-medium mt-1">Canjea tus puntos acumulados por experiencias exclusivas.</p>
        </div>
        
        <div className="bg-slate-900 text-white p-6 rounded-3xl flex items-center gap-6 shadow-xl shadow-slate-900/20 w-full md:w-auto">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-brand-400">
            <Wallet size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-0.5">Tus Puntos Disponibles</div>
            <div className="text-3xl font-black tabular-nums">{points.toLocaleString()} <span className="text-sm font-bold opacity-30 italic">pts</span></div>
          </div>
        </div>
      </div>

      {msg.text && (
        <div className={`p-5 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
          {msg.type === 'success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
          <p className="font-bold">{msg.text}</p>
        </div>
      )}

      {loadingRewards ? (
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
            const canAfford = points >= reward.pointsCost;
            return (
              <div 
                key={reward.id} 
                className={`group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all flex flex-col h-full ${reward.stock === 0 ? 'opacity-60 grayscale' : ''}`}
              >
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

                <h3 className="text-xl font-black text-slate-900 mb-3 leading-tight group-hover:text-brand-600 transition-colors uppercase italic tracking-tight">
                  {reward.name}
                </h3>
                
                <p className="text-slate-500 text-sm font-medium mb-8 line-clamp-3 leading-relaxed flex-1">
                  {reward.description || 'Disfruta de este beneficio exclusivo por ser parte de nuestra comunidad.'}
                </p>

                <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Actual</span>
                    <span className={`text-sm font-black tracking-tight ${reward.stock < 5 ? 'text-rose-500' : 'text-slate-800'}`}>
                      {reward.stock} {reward.stock === 1 ? 'unidad' : 'unidades'}
                    </span>
                  </div>
                  
                  <button
                    disabled={!canAfford || reward.stock === 0 || redeeming}
                    onClick={() => handleRedeem(reward)}
                    className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all min-w-[120px] ${
                      canAfford && reward.stock > 0
                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/30 hover:bg-brand-900 active:scale-95'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {reward.stock === 0 ? 'Agotado' : !canAfford ? 'Insuficiente' : 'Canjear Ahora'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RewardsCatalog;
