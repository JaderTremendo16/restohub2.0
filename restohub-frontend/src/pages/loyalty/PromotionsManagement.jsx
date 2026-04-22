import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { 
  GET_PROMOTIONS, 
  CREATE_PROMOTION_MUTATION, 
  TOGGLE_PROMOTION_MUTATION 
} from '../../graphql/loyaltyOperations';
import { useAuth } from '../../context/AuthContext';
import { Megaphone, Plus, Power, MapPin, Tag } from 'lucide-react';
import Modal from '../../components/common/Modal';

const PromotionsManagement = () => {
  const { user: currentUser, branchName } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', pct: '', desc: '' });

  const { data, loading, refetch } = useQuery(GET_PROMOTIONS, {
    variables: { activeOnly: false, branch: branchName }
  });

  const [createPromotion] = useMutation(CREATE_PROMOTION_MUTATION);
  const [togglePromotion] = useMutation(TOGGLE_PROMOTION_MUTATION);

  const promos = data?.promotions || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPromotion({
        variables: { 
          title: formData.title, 
          pct: parseFloat(formData.pct), 
          desc: formData.desc,
          branch: branchName 
        }
      });
      setShowCreateModal(false);
      setFormData({ title: '', pct: '', desc: '' });
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggle = async (id) => {
    try {
      await togglePromotion({ variables: { id } });
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Megaphone className="text-brand-600" size={32} />
            Gestión de Promociones
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">Lanza ofertas temporales y descuentos para <span className="text-brand-600 font-bold uppercase tracking-tight px-2 py-0.5 bg-brand-50 rounded-lg">{branchName}</span>.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20"
        >
          <Plus size={16} /> Nueva Promoción
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cargando promociones...</div>
      ) : promos.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-400">
           No hay promociones activas para esta sede.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
          {promos.map((p) => (
            <div key={p.id} className={`group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col ${!p.isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              <div className="flex justify-between items-start mb-6">
                 <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black relative">
                    <Tag size={32} />
                 </div>
                 <div className="text-right">
                    <div className="text-3xl font-black text-emerald-600 tracking-tighter">{p.discountPercent}%</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descuento</div>
                 </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase italic leading-tight group-hover:text-emerald-600 transition-colors">{p.title}</h3>
              <p className="text-slate-500 text-sm font-medium mb-8 flex-1 leading-relaxed line-clamp-2">{p.description || 'Sin descripción adicional.'}</p>

              <div className="flex items-center gap-2 mb-8">
                 <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-500 px-3 py-1 rounded-full flex items-center gap-1.5">
                    <MapPin size={10} /> {p.branch || 'Todas las Sedes'}
                 </span>
              </div>

              <div className="flex gap-2 pt-6 border-t border-slate-50 justify-between items-center">
                <div className="flex items-center gap-2">
                   <div className={`w-2 h-2 rounded-full ${p.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                   <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                     {p.isActive ? 'Activa' : 'Pausada'}
                   </span>
                </div>
                
                <button 
                  onClick={() => handleToggle(p.id)}
                  className={`p-3 rounded-2xl transition-all flex items-center gap-2 font-black text-[10px] uppercase tracking-widest ${
                    p.isActive 
                      ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white' 
                      : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                  }`}
                >
                  <Power size={14} /> {p.isActive ? 'Pausar' : 'Reactivar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <Modal title="Lanzar Nueva Promoción" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Título de la Promo</label>
                <input 
                  required
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm transition-all"
                  placeholder="Ej: Promo Fines de Semana"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">% de Descuento</label>
                <input 
                  required
                  type="number" 
                  min="1"
                  max="100"
                  value={formData.pct}
                  onChange={(e) => setFormData({...formData, pct: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm transition-all"
                  placeholder="20"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descripción Corta</label>
                <textarea 
                  value={formData.desc}
                  onChange={(e) => setFormData({...formData, desc: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm transition-all h-24 resize-none"
                  placeholder="Explica de qué trata el descuento..."
                />
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3 italic">
                 <MapPin className="text-emerald-600 shrink-0" size={18} />
                  <p className="text-[10px] font-bold text-emerald-600 leading-normal">Esta promoción se aplicará automáticamente a tu sede asignada: <strong className="uppercase">{branchName}</strong></p>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all"
            >
              Publicar Promoción
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default PromotionsManagement;
