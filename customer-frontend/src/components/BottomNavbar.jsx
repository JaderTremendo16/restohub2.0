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
            : 'text-slate-400 hover:text-brand-orange dark:text-slate-500 dark:hover:text-brand-orange'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative group">
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} className="transition-transform group-hover:scale-110" />
            {badge > 0 && (
              <span className="absolute -top-2 -right-3 bg-brand-orange text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-lg border-2 border-brand-dark animate-in zoom-in">
                {badge}
              </span>
            )}
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
            {label}
          </span>
          {/* Active indicator dot */}
          {isActive && (
            <div className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-brand-orange shadow-[0_0_8px_rgba(234,88,12,0.6)]" />
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[5000] flex justify-center px-4 pb-6 sm:px-6 pointer-events-none">
      <nav className="bg-brand-dark/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/10 px-6 py-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-6 sm:gap-10 pointer-events-auto transition-all duration-500 hover:border-brand-orange/30 w-full max-w-fit">
        <NavItem to="/" icon={LayoutDashboard} label="Inicio" end />
        <NavItem to="/menu" icon={UtensilsCrossed} label="Menú" />
        <NavItem to="/cart" icon={ShoppingCart} label="Carrito" badge={cartItemCount} />
        <NavItem to="/history" icon={History} label="Pedidos" />
        <NavItem to="/rewards" icon={Gift} label="Premios" />
        <NavItem to="/profile" icon={User} label="Perfil" />
        
        {/* Theme Toggle */}
        <div className="h-8 w-[1px] bg-white/10" />
        <button 
          onClick={() => setIsDark(!isDark)}
          className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 transition-all duration-300 flex items-center justify-center group"
          title={isDark ? 'Modo Claro' : 'Modo Oscuro'}
        >
          {isDark ? (
            <Sun size={20} className="group-hover:rotate-90 transition-transform duration-500" />
          ) : (
            <Moon size={20} className="group-hover:-rotate-12 transition-transform duration-500" />
          )}
        </button>
      </nav>
    </div>
  );
};

export default BottomNavbar;
