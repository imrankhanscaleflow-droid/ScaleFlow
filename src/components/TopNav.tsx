import { useState, useEffect } from 'react';
import { Search, Bell, Menu, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Route } from '../types';

interface TopNavProps {
  title: string;
  onMenuToggle: () => void;
  onNavigate?: (route: Route) => void;
}

export function TopNav({ title, onMenuToggle, onNavigate }: TopNavProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const loadNotifs = () => {
      const savedNotifs = localStorage.getItem('scaleflow_notifications');
      if (savedNotifs) {
        try {
          setNotifications(JSON.parse(savedNotifs));
        } catch (e) {}
      }
    };

    loadNotifs();
    // Poll for any changes (e.g. from chatbot)
    const interval = setInterval(loadNotifs, 1500);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleClearNotifs = () => {
    const cleared = notifications.map(n => ({ ...n, unread: false }));
    setNotifications(cleared);
    localStorage.setItem('scaleflow_notifications', JSON.stringify(cleared));
  };

  const handleDeleteNotif = (id: string) => {
    const filtered = notifications.filter(n => n.id !== id);
    setNotifications(filtered);
    localStorage.setItem('scaleflow_notifications', JSON.stringify(filtered));
  };

  return (
    <header className="h-16 bg-[#06070d]/80 backdrop-blur-xl border-b border-indigo-500/10 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30 shadow-lg shadow-black/20">
      {/* Left section: Mobile Toggle & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.05] border border-white/5 focus:outline-none"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs text-indigo-300/50 font-medium hidden sm:inline">Workspace</span>
          <span className="text-xs text-indigo-500/30 hidden sm:inline">/</span>
          <h1 className="text-sm font-display font-bold text-white tracking-tight flex items-center gap-2">
            {title}
          </h1>
        </div>
      </div>

      {/* Middle section: Search bar mockup */}
      <div className="hidden md:flex items-center max-w-md w-full mx-4">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-indigo-400/60" />
          </div>
          <input
            type="text"
            placeholder="Search leads, calls, transcripts..."
            className="block w-full pl-10 pr-3 py-1.5 bg-[#0a0b12] border border-indigo-500/15 rounded-xl text-xs text-gray-200 placeholder-indigo-300/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
            disabled
          />
          <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono text-indigo-300/60 bg-indigo-950/40 rounded-md border border-indigo-500/20">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right section: System Status & Notifications */}
      <div className="flex items-center gap-3 relative">
        {/* Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400 font-sans font-semibold shadow-sm shadow-emerald-500/10">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>AI Nodes Active</span>
        </div>

        {/* Upgrade / Billing Callout */}
        <button className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 border border-white/20 transition-all cursor-pointer hover:scale-[1.02]">
          <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
          Upgrade
        </button>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="p-2 rounded-xl bg-[#0a0b12] border border-indigo-500/15 text-gray-300 hover:text-white hover:border-indigo-500/30 relative transition-all cursor-pointer flex items-center justify-center shadow-md"
          >
            <Bell className="w-4 h-4 text-indigo-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[9px] font-extrabold text-black flex items-center justify-center font-sans shadow-md shadow-amber-500/50">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-3 w-84 bg-[#0a0c16]/95 backdrop-blur-2xl border border-indigo-500/20 rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-indigo-500/10 bg-indigo-950/30 flex items-center justify-between">
                <span className="text-[11px] font-sans font-bold text-indigo-200 uppercase tracking-wider">Handoff Alerts</span>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleClearNotifs}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-gray-500">
                    No active handoff notifications.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`p-3.5 space-y-1 transition-colors ${
                        notif.unread ? 'bg-indigo-500/10' : 'bg-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          {notif.title}
                        </span>
                        <button 
                          onClick={() => handleDeleteNotif(notif.id)}
                          className="text-gray-500 hover:text-gray-300 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-gray-300 leading-normal">{notif.message}</p>
                      <span className="text-[9px] text-indigo-300/50 font-mono block">
                        {new Date(notif.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 border-t border-indigo-500/10 bg-indigo-950/20 text-center">
                <button
                  id="top-nav-open-handoffs-btn"
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('handoffs');
                    } else {
                      window.location.hash = '/handoffs';
                    }
                    setDropdownOpen(false);
                  }}
                  className="w-full py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl border border-white/10 transition-all cursor-pointer block text-center uppercase tracking-wider shadow-md"
                >
                  Open Handoffs
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
