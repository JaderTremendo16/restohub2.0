import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavbar from './BottomNavbar';

export default function Layout() {
  return (
    <div className="min-h-screen font-sans selection:bg-brand-orange/10" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      <main className="pb-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>
      <BottomNavbar />
    </div>
  );
}
