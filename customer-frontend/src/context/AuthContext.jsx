import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { GET_COUNTRIES } from '../graphql/operations';
import { set, get, del } from 'idb-keyval';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from IndexedDB on mount
    const restoreSession = async () => {
      try {
        const savedUser = await get('rh_session');
        if (savedUser) {
          setUser(savedUser);
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const login = async (userData) => {
    setUser(userData);
    await set('rh_session', userData);
  };

  const logout = async () => {
    setUser(null);
    await del('rh_session');
  };

  const updateUser = async (updatedData) => {
    const newUser = { ...user, ...updatedData };
    setUser(newUser);
    await set('rh_session', newUser);
  };

  const { data: countriesData } = useQuery(GET_COUNTRIES);
  const countries = countriesData?.countries || [];

  const getCurrencyConfig = (countryName) => {
    const country = countries.find(c => c.name?.toLowerCase() === countryName?.toLowerCase());
    if (country) {
      // Regla de puntos dinámica (basada en el divisor que definimos)
      let divisor = 1;
      if (['COP', 'CLP', 'ARS', 'PYG'].includes(country.currencyCode)) divisor = 1000;
      else if (['MXN', 'UYU', 'GTQ'].includes(country.currencyCode)) divisor = 20;

      return {
        code: country.currencyCode,
        symbol: country.currencySymbol,
        locale: country.locale || 'es-CO',
        divisor
      };
    }
    // Default fallback
    return { code: 'USD', symbol: '$', locale: 'en-US', divisor: 1 };
  };

  const formatPrice = (amount) => {
    const cfg = getCurrencyConfig(user?.country);
    return new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency: cfg.code,
      minimumFractionDigits: 0
    }).format(amount) + ` ${cfg.code}`;
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading, getCurrencyConfig, formatPrice }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
