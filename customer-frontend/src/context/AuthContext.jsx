import React, { createContext, useContext, useState, useEffect } from 'react';
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

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
