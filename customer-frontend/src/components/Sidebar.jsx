import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@apollo/client/react';
import { useAuth } from '../context/AuthContext';
import { GET_CART } from '../graphql/operations';
import { 
  BarChart2, 
  Users, 
  BookOpen, 
  Gift, 
  Megaphone, 
  Star, 
  LayoutDashboard,
  UtensilsCrossed,
  History,
  LogOut,
  Settings,
  ShoppingBag
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'general_manager';

  const { data: cartData } = useQuery(GET_CART, {
    variables: { customerId: user?.id },
    skip: !user,
  });
  const cartItemCount = cartData?.cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const NavItem = ({ to, icon: Icon, label, end = false }) => (
    <NavLink
      to={to}
      end={end || to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
          isActive 
            ? 'bg-brand-orange text-white shadow-xl shadow-brand-orange/40' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`
      }
    >
      <Icon size={20} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <aside className="w-72 h-screen sticky top-0 bg-[#1a1a2e] flex flex-col p-6 overflow-y-auto">
      <div className="mb-10 px-2 flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center text-white text-xl font-black shadow-lg shadow-brand-orange/40">
          R
        </div>
        <div>
          <h1 className="text-xl font-black text-white leading-none tracking-tight">RestoHub</h1>
          <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Management System</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4 mb-4 block">
          Mi Portal
        </label>
        
        <NavItem to="/" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/menu" icon={UtensilsCrossed} label="Menú Digital" />
        <NavItem to="/history" icon={History} label="Mis Pedidos" />
        <NavItem to="/rewards" icon={Gift} label="Premios" />
        <NavItem to="/cart" icon={ShoppingBag} label={`Mi Carrito (${cartItemCount})`} />
      </nav>

      <div className="mt-auto space-y-2 pt-6 border-t border-white/5">
        <NavItem to="/profile" icon={Settings} label="Perfil" />
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-rose-400 hover:bg-rose-500/10 transition-all"
        >
          <LogOut size={20} />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
