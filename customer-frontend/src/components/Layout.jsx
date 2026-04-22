import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-[#f3f4f6] font-sans selection:bg-brand-orange/10">
      <Sidebar />
      <main className="flex-1 p-8 relative max-h-screen overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
