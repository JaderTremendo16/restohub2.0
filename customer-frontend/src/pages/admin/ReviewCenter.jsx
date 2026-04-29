import React from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_ALL_RATINGS } from '../../graphql/operations';
import { useAuth } from '../../context/AuthContext';
import { Star, MessageSquare, Calendar, Filter, User } from 'lucide-react';

const ReviewCenter = () => {
  const { user: currentUser } = useAuth();
  const { data, loading, error } = useQuery(GET_ALL_RATINGS, {
    variables: { branch: currentUser?.branch }
  });

  const ratings = data?.allRatings || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <MessageSquare className="text-brand-600" size={32} />
            Centro de Reseñas
          </h1>
          <p className="text-slate-500 mt-1 font-medium">Escucha a tus clientes y mejora la experiencia en tus sedes.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Plato / Item</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Calificación</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Comentario</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cargando opiniones...</p>
                  </td>
                </tr>
              ) : ratings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center text-slate-400 italic">
                    Aún no se han recibido reseñas.
                  </td>
                </tr>
              ) : (
                ratings.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                       <div className="font-bold text-slate-900 uppercase italic tracking-tight">{r.itemName}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex text-amber-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill={i < r.stars ? "currentColor" : "none"} strokeWidth={i < r.stars ? 0 : 2} />
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6 max-w-xs">
                       <p className="text-sm text-slate-600 font-medium line-clamp-2 leading-relaxed">
                         {r.comment || <span className="text-slate-300 italic">Sin comentario</span>}
                       </p>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                          <Calendar size={12} /> {new Date(r.createdAt).toLocaleDateString()}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-brand-50 rounded-full flex items-center justify-center text-brand-600">
                            <User size={16} />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-sm font-black text-slate-800 tracking-tight leading-none mb-1">
                               {r.customerName || "Usuario Desconocido"}
                             </span>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                               ID: {r.customerId.substring(0, 8)}...
                             </span>
                          </div>
                       </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReviewCenter;
