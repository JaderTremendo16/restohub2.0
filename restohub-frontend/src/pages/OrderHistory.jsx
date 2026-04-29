import React, { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_ORDERS } from '../graphql/operations';
import { useAuth } from '../context/AuthContext';
import { History, Search, ExternalLink, Calendar, Wallet, MapPin } from 'lucide-react';
import Modal from '../components/common/Modal';

const OrderHistory = () => {
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { data, loading, error } = useQuery(GET_ORDERS, {
    variables: { cid: user.id },
    skip: !user
  });

  const orders = data?.orders || [];

  const handleShowDetail = (order) => {
    try {
      const items = JSON.parse(order.items);
      setSelectedOrder({ ...order, parsedItems: items });
    } catch (e) {
      alert("No se pudo cargar el detalle del pedido.");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <History className="text-brand-600" size={32} />
            Mis Pedidos
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Revisa tu historial de consumo y puntos ganados.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por plato o sede..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 ring-brand-500/20 transition-all border border-transparent focus:border-brand-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen del Pedido</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sede</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cargando historial...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-32 text-center">
                    <History size={48} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">Aún no has realizado pedidos.</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  let dishCount = 1;
                  let firstDish = "Pedido";
                  try {
                    const items = JSON.parse(order.items);
                    dishCount = items.length;
                    firstDish = items[0].name;
                  } catch(e) {}

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-black">
                            {dishCount}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{firstDish}</div>
                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight">
                              {dishCount > 1 ? `+${dishCount - 1} platos adicionales` : 'Item único'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2 text-slate-600 font-medium text-sm">
                          <Calendar size={14} className="text-slate-400" />
                          {new Date(order.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase tracking-wider">
                          {order.branch}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900">${order.totalPrice.toLocaleString()}</div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => handleShowDetail(order)}
                          className="p-2 hover:bg-brand-50 text-slate-400 hover:text-brand-600 rounded-xl transition-all"
                        >
                          <ExternalLink size={20} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <Modal 
          title={`Detalle de Pedido #${selectedOrder.id.substring(0, 8)}`} 
          onClose={() => setSelectedOrder(null)}
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Ítems del Pedido</label>
              <div className="space-y-2">
                {selectedOrder.parsedItems.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-xs text-slate-400 font-bold tracking-tight">Cantidad: {item.qty}</div>
                    </div>
                    <div className="font-black text-brand-600">${(item.price * item.qty).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-slate-900 rounded-2xl text-white">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Pagado</div>
                  <div className="text-xl font-black">${selectedOrder.totalPrice.toLocaleString()}</div>
               </div>
               <div className="p-4 bg-brand-50 rounded-2xl text-brand-600 border border-brand-100">
                  <div className="text-[10px] font-black text-brand-400 uppercase tracking-widest mb-1">Puntos Ganados</div>
                  <div className="text-xl font-black">+{Math.floor(selectedOrder.totalPrice / 1000)} pts</div>
               </div>
            </div>

            <div className="flex items-center gap-3 text-slate-500 text-xs font-bold pt-4">
              <MapPin size={14} /> Sede: {selectedOrder.branch}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OrderHistory;
