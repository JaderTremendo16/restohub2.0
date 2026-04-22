import React, { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_USERS, GET_ALL_LOYALTY_ACCOUNTS, GET_POINT_HISTORY } from '../../graphql/loyaltyOperations';
import { useAuth } from '../../context/AuthContext';
import { Users, Search, Eye, Mail, Phone, MapPin, Trophy, History } from 'lucide-react';
import Modal from '../../components/common/Modal';

const ClientManagement = () => {
  const { user: currentUser, branchName } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);

  // Pasamos el nombre de la sede (String) para este microservicio de clientes
  const { data: userData, loading: loadingUsers } = useQuery(GET_USERS, {
    variables: { branch: branchName }
  });
  
  const { data: loyaltyData } = useQuery(GET_ALL_LOYALTY_ACCOUNTS);

  const users = (userData?.customers || []).filter(u => u.role !== 'admin');
  const loyaltyMap = (loyaltyData?.allLoyaltyAccounts || []).reduce((acc, curr) => {
    acc[curr.customerId] = curr;
    return acc;
  }, {});

  const filteredUsers = users.filter(u => 
    (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tierColors = {
    bronze: 'bg-orange-100 text-orange-700',
    silver: 'bg-slate-100 text-slate-700',
    gold: 'bg-amber-100 text-amber-700',
    platinum: 'bg-indigo-100 text-indigo-700'
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="text-brand-600" size={32} />
            Gestión de Clientes
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">Sede Actual: <span className="text-brand-600 font-bold uppercase tracking-tight px-2 py-0.5 bg-brand-50 rounded-lg">{branchName}</span></p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente por nombre o email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl text-sm font-medium outline-none border border-transparent focus:border-brand-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 text-left">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contacto</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntos</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rango</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loadingUsers ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cargando base de datos...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center text-slate-400">
                    No se encontraron clientes para esta sede.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const loyalty = loyaltyMap[u.id];
                  const points = loyalty?.totalPoints || 0;
                  const tier = loyalty?.tier?.toLowerCase() || 'bronze';
                  
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center font-black">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{u.name}</div>
                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-tight">ID: {u.id.substring(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
                            <Mail size={12} className="text-slate-400" />
                            {u.email}
                          </div>
                          <div className="flex items-center gap-2 text-slate-600 text-xs font-medium">
                            <Phone size={12} className="text-slate-400" />
                            {u.phone || '—'}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-900">{points.toLocaleString()} pts</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${tierColors[tier]}`}>
                          {tier}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => setSelectedClient(u)}
                          className="p-2 hover:bg-brand-50 text-slate-400 hover:text-brand-600 rounded-xl transition-all"
                        >
                          <Eye size={20} />
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

      {selectedClient && (
        <ClientDetailModal 
          client={selectedClient} 
          onClose={() => setSelectedClient(null)} 
          tierMap={loyaltyMap}
        />
      )}
    </div>
  );
};

const ClientDetailModal = ({ client, onClose, tierMap }) => {
  const loyalty = tierMap[client.id];
  const { data: histData, loading: loadingHist } = useQuery(GET_POINT_HISTORY, {
    variables: { customerId: client.id }
  });

  const history = histData?.pointHistory || [];

  return (
    <Modal title="Detalle del Cliente" onClose={onClose}>
      <div className="space-y-8">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center text-2xl font-black">
              {client.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h4 className="text-xl font-black text-slate-900 italic uppercase tracking-tight">{client.name}</h4>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-black text-slate-900 tracking-tighter">{(loyalty?.totalPoints || 0).toLocaleString()}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Puntos Totales</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem]">
           <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Mail size={12} /> Contacto
              </label>
              <div className="text-sm font-bold text-slate-600 break-all">{client.email}</div>
              <div className="text-sm font-bold text-slate-600">{client.phone || 'No registrado'}</div>
           </div>
           <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={12} /> Ubicación
              </label>
              <div className="text-sm font-bold text-slate-600">{client.country}, {client.city}</div>
              <div className="text-xs font-black text-brand-600 bg-brand-100/50 px-2 py-1 rounded inline-block uppercase tracking-tight">
                {client.branch || 'Global'}
              </div>
           </div>
        </div>

        <div className="space-y-4">
           <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <History size={14} /> Historial de Puntos
              </h5>
              <Trophy size={16} className="text-amber-400" />
           </div>

           <div className="max-h-[250px] overflow-y-auto border border-slate-100 rounded-2xl divide-y divide-slate-50">
              {loadingHist ? (
                <div className="p-10 text-center text-slate-300">Cargando historial...</div>
              ) : history.length === 0 ? (
                <div className="p-10 text-center text-slate-300 italic">Sin movimientos registrados.</div>
              ) : (
                history.map((h, i) => (
                  <div key={i} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                    <div>
                      <div className="text-sm font-bold text-slate-800">{h.description || h.actionType}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-tight">{new Date(h.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className={`text-sm font-black ${h.points > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {h.points > 0 ? '+' : ''}{h.points}
                    </div>
                  </div>
                ))
              )}
           </div>
        </div>
      </div>
    </Modal>
  );
};

export default ClientManagement;
