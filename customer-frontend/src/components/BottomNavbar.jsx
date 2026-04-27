import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ShoppingCart, 
  History, 
  Gift, 
  User,
  Moon,
  Sun
} from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { GET_CART } from '../graphql/operations';

const BottomNavbar = () => {
  const { user } = useAuth();
  const [isDark, setIsDark] = useState(localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const { data: cartData } = useQuery(GET_CART, {
    variables: { customerId: user?.id },
    skip: !user
  });

  const cartItemCount = cartData?.cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const NavItem = ({ to, icon: Icon, label, badge = 0, end = false }) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-1 transition-all duration-300 relative ${
          isActive 
            ? 'text-brand-orange scale-110' 
            : 'text-slate-400 hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative">
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            {badge > 0 && (
              <span className="absolute -top-2 -right-3 bg-brand-orange text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-lg border-2 border-[#1a1a2e]">
                {badge}
              </span>
            )}
          </div>
          <span className={`text-[9px] font-bold uppercase tracking-wider ${isActive ? 'text-brand-orange' : ''}`}>
            {label}
          </span>
          {/* Active indicator dot */}
          {isActive && (
            <div className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-brand-orange" />
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-3 pb-3 sm:px-6 sm:pb-5 pointer-events-none">
      <nav className="bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 px-4 sm:px-6 py-3 rounded-[2rem] shadow-2xl shadow-black/30 flex items-center gap-5 sm:gap-8 pointer-events-auto transition-all duration-500 hover:border-brand-orange/20 w-full max-w-lg sm:max-w-fit">
        <NavItem to="/" icon={LayoutDashboard} label="Inicio" end />
        <NavItem to="/menu" icon={UtensilsCrossed} label="Menú" />
        <NavItem to="/cart" icon={ShoppingCart} label="Carrito" badge={cartItemCount} />
        <NavItem to="/history" icon={History} label="Pedidos" />
        <NavItem to="/rewards" icon={Gift} label="Premios" />
        <NavItem to="/profile" icon={User} label="Perfil" />
        
        {/* Theme Toggle */}
        <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />
        <button 
          onClick={() => setIsDark(!isDark)}
          className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 transition-all duration-300 hidden sm:flex items-center justify-center"
          title={isDark ? 'Modo Claro' : 'Modo Oscuro'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>
    </div>
  );
};

export default BottomNavbar;
