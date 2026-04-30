import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavbar from './BottomNavbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[var(--bg-main)] selection:bg-brand-orange/10 transition-colors duration-300">
      <main className="w-full p-6 md:p-12 pb-32">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <BottomNavbar />
    </div>
  );
}
