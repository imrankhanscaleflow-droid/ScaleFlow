/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useRouter } from './hooks/useRouter';
import { UserSession, Route } from './types';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ReceptionistPage } from './pages/ReceptionistPage';
import { LeadsPage } from './pages/LeadsPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { AutomationPage } from './pages/AutomationPage';
import { TeamPage } from './pages/TeamPage';
import { HandoffsPage } from './pages/HandoffsPage';
import { GmailPage } from './pages/GmailPage';
import { SheetsPage } from './pages/SheetsPage';
import { DiagnosticsPage } from './pages/DiagnosticsPage';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { X, ShieldAlert, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  backupWorkspaceData, 
  clearActiveWorkspaceKeys, 
  refreshUserSession, 
  initAccountsStorage, 
  swapWorkspaceTo, 
  logAuthRedirect, 
  SEED_ACCOUNT, 
  establishSession 
} from './lib/auth';

export default function App() {
  const { currentRoute, navigate } = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [isAuthInitializing, setIsAuthInitializing] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // Remaining seconds
  const [showExpiryModal, setShowExpiryModal] = useState(false);

  // Restore session from localStorage on mount and check validity
  useEffect(() => {
    try {
      initAccountsStorage();
      const savedSession = localStorage.getItem('scaleflow_session');
      const explicitLogout = localStorage.getItem('scaleflow_explicit_logout');

      if (savedSession) {
        const parsed: UserSession = JSON.parse(savedSession);
        if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
          // Session already expired
          const reason = `Session expired at ${new Date(parsed.expiresAt).toISOString()}`;
          logAuthRedirect(reason, 'login');
          localStorage.removeItem('scaleflow_session');
          clearActiveWorkspaceKeys();
          setShowExpiryModal(true);
          setUser(null);
        } else {
          if (parsed.businessId) {
            swapWorkspaceTo(parsed.businessId);
          }
          const refreshed = refreshUserSession();
          const activeUser = refreshed || parsed;
          setUser(activeUser);
          console.info(`[ScaleFlow Auth] Session restored successfully for: ${activeUser.email}`);
        }
      } else if (!explicitLogout) {
        // Auto-seed session for default workspace on fresh startup
        const seedAcc = SEED_ACCOUNT;
        const session = establishSession(seedAcc, true);
        setUser(session);
        console.info(`[ScaleFlow Auth] Default workspace session initialized for: ${session.email}`);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      console.warn('[ScaleFlow Auth] Exception restoring session:', err);
      logAuthRedirect(`Exception during session parse: ${err?.message || err}`, 'login');
      localStorage.removeItem('scaleflow_session');
      clearActiveWorkspaceKeys();
      setUser(null);
    } finally {
      setIsAuthInitializing(false);
    }
  }, []);

  // Timer checking and auto logout
  useEffect(() => {
    if (!user || !user.expiresAt) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const remainingSec = Math.max(0, Math.floor((user.expiresAt! - Date.now()) / 1000));
      setTimeLeft(remainingSec);

      if (remainingSec <= 0) {
        clearInterval(interval);
        // Execute automatic logout on expiration
        if (user.businessId) {
          backupWorkspaceData(user.businessId);
        }
        const reason = 'Session token duration reached 0s.';
        logAuthRedirect(reason, 'landing');
        localStorage.removeItem('scaleflow_session');
        clearActiveWorkspaceKeys();
        setUser(null);
        setShowExpiryModal(true);
        navigate('landing');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [user, navigate]);

  // Sync route and auth status: redirect non-auth requests ONLY after auth initialization completes
  useEffect(() => {
    if (isAuthInitializing) {
      return;
    }

    const publicRoutes: Route[] = ['landing', 'login'];
    const isPublic = publicRoutes.includes(currentRoute);

    if (!user && !isPublic) {
      const reason = `Attempted to access protected route '/${currentRoute}' without an active session.`;
      logAuthRedirect(reason, 'login');
      navigate('login');
    } else if (user && currentRoute === 'login') {
      console.info(`[ScaleFlow Auth] User already authenticated (${user.email}). Redirecting from login to dashboard.`);
      navigate('dashboard');
    }
  }, [currentRoute, user, isAuthInitializing, navigate]);

  const handleLoginSuccess = (email: string, name: string) => {
    localStorage.removeItem('scaleflow_explicit_logout');
    const savedSession = localStorage.getItem('scaleflow_session');
    if (savedSession) {
      try {
        setUser(JSON.parse(savedSession));
      } catch (e) {
        navigate('dashboard');
      }
    }
    navigate('dashboard');
  };

  const handleLogout = () => {
    if (user && user.businessId) {
      backupWorkspaceData(user.businessId);
    }
    const reason = 'User initiated explicit logout.';
    logAuthRedirect(reason, 'landing');
    localStorage.setItem('scaleflow_explicit_logout', 'true');
    setUser(null);
    localStorage.removeItem('scaleflow_session');
    clearActiveWorkspaceKeys();
    navigate('landing');
  };

  const handleRefreshSession = () => {
    const refreshed = refreshUserSession();
    if (refreshed) {
      setUser(refreshed);
      const remainingSec = Math.max(0, Math.floor((refreshed.expiresAt - Date.now()) / 1000));
      setTimeLeft(remainingSec);
    }
  };

  const getPageTitle = (route: Route): string => {
    switch (route) {
      case 'dashboard': return 'Workspace Overview';
      case 'receptionist': return 'AI Voice Receptionist';
      case 'leads': return 'Leads Qualification';
      case 'conversations': return 'Active Dialogues';
      case 'analytics': return 'Performance Reports';
      case 'integrations': return 'Integrations Hub';
      case 'automation': return 'AI Automation Engine';
      case 'team': return 'Team Management';
      case 'handoffs': return 'Human Handoff Tickets';
      case 'gmail': return 'Gmail Integration Hub';
      case 'sheets': return 'Google Sheets Integration Hub';
      case 'diagnostics': return 'Integration Diagnostics';
      default: return 'Console';
    }
  };

  // Render core views
  const renderPageContent = () => {
    switch (currentRoute) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigate} />;
      case 'receptionist':
        return <ReceptionistPage />;
      case 'leads':
        return <LeadsPage />;
      case 'conversations':
        return <ConversationsPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'integrations':
        return <IntegrationsPage />;
      case 'automation':
        return <AutomationPage />;
      case 'team':
        return <TeamPage />;
      case 'handoffs':
        return <HandoffsPage onNavigate={navigate} />;
      case 'gmail':
        return <GmailPage />;
      case 'sheets':
        return <SheetsPage />;
      case 'diagnostics':
        return <DiagnosticsPage />;
      default:
        return <DashboardPage onNavigate={navigate} />;
    }
  };

  // 0. Auth Loading Splash Loader (Prevents flash of login screen while checking session token)
  if (isAuthInitializing) {
    return (
      <div className="min-h-screen bg-[#050507] text-[#f3f4f6] flex flex-col items-center justify-center font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center max-w-sm text-center px-6">
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 border border-white/10">
              <span className="text-2xl font-bold text-white tracking-wider">SF</span>
            </div>
            <div className="absolute -inset-2 rounded-3xl border-2 border-brand-500/30 border-t-brand-400 animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-white tracking-tight mb-2">
            ScaleFlow Console
          </h2>
          <p className="text-sm text-gray-400 flex items-center gap-2 justify-center">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Restoring secure session token...
          </p>
        </div>
      </div>
    );
  }

  // 1. Landing Page Render
  if (currentRoute === 'landing') {
    return <LandingPage onNavigate={navigate} />;
  }

  // 2. Auth Login Page Render
  if (currentRoute === 'login') {
    return <LoginPage onNavigate={navigate} onLoginSuccess={handleLoginSuccess} />;
  }

  // 3. Authenticated Dashboard Framework Render
  return (
    <div className="min-h-screen bg-[#050507] text-[#f3f4f6] flex overflow-hidden font-sans relative selection:bg-brand-500/30 selection:text-white">
      
      {/* Desktop Sidebar (hidden on mobile) */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar 
          currentRoute={currentRoute} 
          onNavigate={navigate} 
          onLogout={handleLogout} 
          user={user} 
        />
      </div>

      {/* Mobile Drawer Navigation (slide-out overlay) */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileSidebarOpen(false)}
              className="fixed inset-0 bg-black"
            />

            {/* Sidebar content container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 h-full flex flex-col bg-[#07070a] z-10"
            >
              {/* Close Button overlay */}
              <div className="absolute top-4 right-4 z-50">
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1.5 rounded-md bg-[#12121a] border border-[#22222f] text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mounted Sidebar inside drawer */}
              <div className="flex-1 h-full">
                <Sidebar 
                  currentRoute={currentRoute} 
                  onNavigate={(route) => {
                    navigate(route);
                    setMobileSidebarOpen(false);
                  }} 
                  onLogout={() => {
                    handleLogout();
                    setMobileSidebarOpen(false);
                  }} 
                  user={user} 
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Workspace content stream */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Expiry Warning Banner (Less than 2 minutes) */}
        {timeLeft !== null && timeLeft <= 120 && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 py-2.5 px-4 flex items-center justify-between text-xs text-amber-400 font-medium z-40 animate-pulse">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 animate-bounce" />
              <span>
                Your secure session will expire in <strong className="font-mono font-bold text-white">{Math.floor(timeLeft / 60)}m {timeLeft % 60}s</strong>.
              </span>
            </div>
            <button
              onClick={handleRefreshSession}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 text-black hover:bg-amber-400 text-[10px] font-bold transition-all cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh Session
            </button>
          </div>
        )}

        {/* Top Navbar */}
        <TopNav 
          title={getPageTitle(currentRoute)} 
          onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} 
          onNavigate={navigate}
        />

        {/* Dynamic page render slot */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto">
            {renderPageContent()}
          </div>
        </main>
      </div>

      {/* Session Expired Feedback Dialog Modal */}
      <AnimatePresence>
        {showExpiryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm p-6 bg-[#08080c] border border-[#1a1a24] rounded-2xl shadow-2xl z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mx-auto text-red-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-sm font-display font-bold text-white tracking-tight">Security Session Expired</h3>
                <p className="text-[11px] text-gray-400 leading-normal">
                  To protect your business workspace and enforce data isolation policies, you have been automatically signed out.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowExpiryModal(false);
                  navigate('login');
                }}
                className="w-full py-2 bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
              >
                Sign In Again
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
