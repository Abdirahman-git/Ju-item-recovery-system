'use client';

import { createContext, useCallback, useContext, useState } from 'react';

const AdminHeaderActionsContext = createContext({
  actions: null,
  setActions: () => {},
  clearActions: () => {},
  stats: null,
  setStats: () => {},
  clearStats: () => {},
});

export function AdminHeaderActionsProvider({ children }) {
  const [actions, setActionsState] = useState(null);
  const [stats, setStatsState] = useState(null);

  const setActions = useCallback((node) => setActionsState(node), []);
  const clearActions = useCallback(() => setActionsState(null), []);
  const setStats = useCallback((node) => setStatsState(node), []);
  const clearStats = useCallback(() => setStatsState(null), []);

  return (
    <AdminHeaderActionsContext.Provider
      value={{ actions, setActions, clearActions, stats, setStats, clearStats }}
    >
      {children}
    </AdminHeaderActionsContext.Provider>
  );
}

export function useAdminHeaderActions() {
  return useContext(AdminHeaderActionsContext);
}
