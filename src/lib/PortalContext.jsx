import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';

const PortalContext = createContext();

const TOKEN_KEY = 'aurelius_portal_token';
const EXP_KEY = 'aurelius_portal_expires';
const LABEL_KEY = 'aurelius_portal_label';
const OWNER_EMAIL = 'radzdomgallego4@gmail.com';

export function PortalProvider({ children }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [expires, setExpires] = useState(() => localStorage.getItem(EXP_KEY));
  const [label, setLabel] = useState(() => localStorage.getItem(LABEL_KEY));

  const isOwner = isAuthenticated && !!user && (user.role === 'admin' || String(user.email || '').toLowerCase() === OWNER_EMAIL);
  const tokenValid = !!token && !!expires && new Date(expires) > new Date();
  const mode = isOwner ? 'owner' : (tokenValid ? 'customer' : 'none');

  const login = useCallback((tok, exp, lbl) => {
    localStorage.setItem(TOKEN_KEY, tok);
    localStorage.setItem(EXP_KEY, exp);
    if (lbl) localStorage.setItem(LABEL_KEY, lbl);
    setToken(tok);
    setExpires(exp);
    setLabel(lbl || null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXP_KEY);
    localStorage.removeItem(LABEL_KEY);
    setToken(null);
    setExpires(null);
    setLabel(null);
  }, []);

  useEffect(() => {
    if (token && expires && new Date(expires) <= new Date()) logout();
  }, [token, expires, logout]);

  return (
    <PortalContext.Provider value={{ mode, isOwner, token, label, login, logout, isAuthenticated, isLoadingAuth }}>
      {children}
    </PortalContext.Provider>
  );
}

export const usePortal = () => {
  const ctx = useContext(PortalContext);
  if (!ctx) throw new Error('usePortal must be used within PortalProvider');
  return ctx;
};

export default PortalProvider;