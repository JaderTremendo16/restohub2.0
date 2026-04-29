import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { 
  GET_REWARDS, 
  CREATE_REWARD_MUTATION, 
  UPDATE_REWARD_MUTATION, 
  TOGGLE_REWARD_MUTATION 
} from '../../graphql/loyaltyOperations';
import { useAuth } from '../../context/AuthContext';
import { Gift, Plus, Pencil, Power, Package, AlertCircle } from 'lucide-react';
import Modal from '../../components/common/Modal';

const RewardsManagement = () => {
  const { user: currentUser, branchName } = useAuth();
  const [modalType, setModalType] = useState(null); // 'create' or 'edit'
  const [selectedReward, setSelectedReward] = useState(null);
  const [formData, setFormData] = useState({ name: '', pts: '', stock: '', desc: '' });

  const { data, loading, refetch } = useQuery(GET_REWARDS, {
    variables: { activeOnly: false, branch: branchName }
  });

  const [createReward] = useMutation(CREATE_REWARD_MUTATION);
  const [updateReward] = useMutation(UPDATE_REWARD_MUTATION);
  const [toggleReward] = useMutation(TOGGLE_REWARD_MUTATION);

  const rewards = data?.rewards || [];

  const handleOpenCreate = () => {
    setFormData({ name: '', pts: '', stock: '', desc: '' });
    setModalType('create');
  };

  const handleOpenEdit = (r) => {
    setSelectedReward(r);
    setFormData({ name: r.name, pts: r.pointsCost, stock: r.stock, desc: r.description || '' });
    setModalType('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalType === 'create') {
        await createReward({
          variables: { 
            name: formData.name, 
            pts: parseInt(formData.pts), 
            stock: parseInt(formData.stock), 
            desc: formData.desc 
          }
        });
      } else {
        await updateReward({
          variables: { 
            id: selectedReward.id, 
            name: formData.name, 
            pts: parseInt(formData.pts), 
            stock: parseInt(formData.stock), 
            desc: formData.desc 
          }
        });
      }
      setModalType(null);
      refetch();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleReward({ variables: { id } });
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
            <Gift className="text-brand-600" size={32} />
            Catálogo de Premios
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">Gestiona los premios exclusivos para la sede: <span className="text-brand-600 font-bold uppercase tracking-tight px-2 py-0.5 bg-brand-50 rounded-lg">{branchName}</span></p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/20"
        >
          <Plus size={16} /> Añadir Premio
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cargando catálogo...</div>
      ) : rewards.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-slate-400">
           Aún no has creado premios. ¡Empieza añadiendo uno!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rewards.map((r) => (
            <div key={r.id} className={`group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all relative overflow-hidden flex flex-col ${!r.isActive ? 'opacity-60 bg-slate-50' : ''}`}>
              {!r.isActive && <div className="absolute top-4 right-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-200 px-2 py-0.5 rounded-full">Inactivo</div>}
              
              <div className="flex justify-between items-start mb-6">
                 <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center font-black">
                    <Gift size={32} />
                 </div>
                 <div className="text-right">
                    <div className="text-2xl font-black text-slate-800 tracking-tighter">{r.pointsCost}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntos</div>
                 </div>
              </div>

              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase italic leading-tight group-hover:text-brand-600 transition-colors">{r.name}</h3>
              <p className="text-slate-500 text-sm font-medium mb-8 flex-1 leading-relaxed line-clamp-2">{r.description || 'Sin descripción disponible.'}</p>

              <div className="flex items-center gap-4 mb-8">
                 <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${r.stock < 5 ? 'bg-rose-50 text-rose-600 border border-rose-100 animate-pulse' : 'bg-slate-50 text-slate-600'}`}>
                    {r.stock < 5 ? <AlertCircle size={14} /> : <Package size={14} />}
                    <span className="text-[10px] font-black uppercase tracking-widest">Stock: {r.stock}</span>
                 </div>
              </div>

              <div className="flex gap-2 pt-6 border-t border-slate-50">
                <button 
                  onClick={() => handleOpenEdit(r)}
                  className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button 
                   onClick={() => handleToggle(r.id)}
                   className={`px-4 rounded-xl transition-all flex items-center justify-center ${r.isActive ? 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-500 hover:text-white'}`}
                >
                   <Power size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalType && (
        <Modal 
          title={modalType === 'create' ? 'Añadir Nuevo Premio' : `Editar: ${selectedReward.name}`} 
          onClose={() => setModalType(null)}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nombre del Premio</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm transition-all"
                  placeholder="Ej: Bono de Descuento"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Costo en Puntos</label>
                  <input 
                    required
                    type="number" 
                    value={formData.pts}
                    onChange={(e) => setFormData({...formData, pts: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm transition-all"
                    placeholder="500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Stock Inicial</label>
                  <input 
                    required
                    type="number" 
                    value={formData.stock}
                    onChange={(e) => setFormData({...formData, stock: e.target.value})}
                    className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm transition-all"
                    placeholder="20"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Descripción (Opcional)</label>
                <textarea 
                  value={formData.desc}
                  onChange={(e) => setFormData({...formData, desc: e.target.value})}
                  className="w-full p-4 bg-slate-50 rounded-2xl border border-transparent focus:border-brand-500 outline-none font-bold text-sm transition-all h-24 resize-none"
                  placeholder="Explica qué incluye este premio..."
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all"
            >
              {modalType === 'create' ? 'Crear Premio' : 'Guardar Cambios'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default RewardsManagement;
