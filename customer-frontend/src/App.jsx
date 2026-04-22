import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LocationSelector from './components/common/LocationSelector';

// Pages
import Login from './pages/Login';
import CustomerHome from './pages/CustomerHome';
import DigitalMenu from './pages/DigitalMenu';
import OrderHistory from './pages/OrderHistory';
import RewardsCatalog from './pages/RewardsCatalog';
import Register from './pages/Register';
import Profile from './pages/Profile';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>;
  if (!user) return <Navigate to="/login" />;
  
  return children;
};

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter>
      {/* Global Location Guard for Customers */}
      {user && user.role !== 'admin' && !user.branch && <LocationSelector />}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route path="/" element={<Layout />}>
          {/* Customer Routes Only */}
          <Route index element={<ProtectedRoute><CustomerHome /></ProtectedRoute>} />
          <Route path="menu" element={<ProtectedRoute><DigitalMenu /></ProtectedRoute>} />
          <Route path="history" element={<ProtectedRoute><OrderHistory /></ProtectedRoute>} />
          <Route path="rewards" element={<ProtectedRoute><RewardsCatalog /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
