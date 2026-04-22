import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useMutation } from '@apollo/client/react';
import { LOGIN_MUTATION } from '../graphql/operations';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginUser, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      const { user } = data.loginUser;
      login(user, 'real-jwt-token');
      
      const isAdmin = user.role === 'admin' || user.role === 'general_manager';
      if (isAdmin) {
        // Redirigir al portal de administración oficial (restohub-frontend) que corre en el puerto 3000
        // En producción sería una URL real. Para local:
        window.location.href = 'http://localhost:3000';
      } else {
        navigate('/');
      }
    },
    onError: (err) => {
      setError(err.message || 'Error al iniciar sesión');
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    loginUser({ variables: { email, password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/40 border border-slate-100 p-8 md:p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-brand-orange tracking-tight">
              RestoHub
            </h1>
            <p className="text-slate-500 mt-3 font-medium text-lg italic">Sistema de gestión de restaurantes</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-brand-dark placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 px-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-brand-dark placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-orange hover:bg-brand-700 text-white py-4 rounded-2xl font-black text-lg shadow-lg shadow-brand-orange/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-slate-500 font-medium">
            ¿No tienes cuenta? <button 
              onClick={() => navigate('/register')}
              className="text-brand-orange font-black hover:underline ml-1"
            >
              Regístrate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
