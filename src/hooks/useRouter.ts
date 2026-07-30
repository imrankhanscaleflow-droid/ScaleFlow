/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Route } from '../types';

// Helper to parse route from URL hash
const getRouteFromHash = (): Route => {
  const hash = window.location.hash.replace(/^#\/?/, '');
  
  // Map hash string to valid Route
  const validRoutes: Route[] = [
    'landing',
    'login',
    'dashboard',
    'receptionist',
    'leads',
    'conversations',
    'analytics',
    'integrations',
    'automation',
    'team',
    'handoffs',
    'gmail',
    'sheets',
    'diagnostics'
  ];

  if (validRoutes.includes(hash as Route)) {
    return hash as Route;
  }
  
  return 'landing'; // Default route
};

export function useRouter() {
  const [currentRoute, setCurrentRoute] = useState<Route>(getRouteFromHash());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(getRouteFromHash());
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const navigate = useCallback((route: Route) => {
    window.location.hash = `/${route}`;
    setCurrentRoute(route);
  }, []);

  return {
    currentRoute,
    navigate,
  };
}

