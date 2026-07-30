/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Route, MenuItem, UserSession } from '../types';
import { 
  LayoutDashboard, 
  Bot, 
  Target, 
  MessageSquare, 
  BarChart3, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Layers,
  User,
  Settings,
  Building,
  Cpu,
  Zap,
  Users,
  Inbox,
  Mail,
  FileSpreadsheet,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  currentRoute: Route;
  onNavigate: (route: Route) => void;
  onLogout: () => void;
  user: UserSession | null;
}

export function Sidebar({ currentRoute, onNavigate, onLogout, user }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [bizName, setBizName] = useState('ScaleFlow');
  const [bizLogo, setBizLogo] = useState('⚡');
  const [bizIndustry, setBizIndustry] = useState('Technology & SaaS');

  useEffect(() => {
    const savedSession = localStorage.getItem('scaleflow_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.businessProfile) {
          setBizName(parsed.businessProfile.name || 'ScaleFlow');
          setBizLogo(parsed.businessProfile.logo || '⚡');
          setBizIndustry(parsed.businessProfile.industry || 'Technology & SaaS');
        }
      } catch (e) {}
    }
  }, [user]);

  const [openTicketsCount, setOpenTicketsCount] = useState(0);

  useEffect(() => {
    const checkTickets = () => {
      const saved = localStorage.getItem('scaleflow_tickets');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const count = parsed.filter((t: any) => t.status === 'open').length;
          setOpenTicketsCount(count);
        } catch (e) {}
      }
    };
    checkTickets();
    const interval = setInterval(checkTickets, 1500);
    return () => clearInterval(interval);
  }, []);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', iconName: 'dashboard' },
    { id: 'receptionist', label: 'AI Receptionist', iconName: 'bot', badge: 'Live' },
    { id: 'leads', label: 'Leads', iconName: 'leads', badge: '12' },
    { id: 'conversations', label: 'Conversations', iconName: 'conversations', badge: '4' },
    { id: 'gmail', label: 'Gmail Hub', iconName: 'gmail', badge: 'OAuth' },
    { id: 'sheets', label: 'Google Sheets', iconName: 'sheets', badge: 'Sync' },
    { id: 'handoffs', label: 'Handoff Tickets', iconName: 'handoffs', badge: openTicketsCount > 0 ? openTicketsCount.toString() : undefined },
    { id: 'analytics', label: 'Analytics', iconName: 'analytics' },
    { id: 'integrations', label: 'Integrations', iconName: 'cpu' },
    { id: 'diagnostics', label: 'Diagnostics', iconName: 'activity', badge: 'Health' },
    { id: 'automation', label: 'Automation', iconName: 'zap' },
    { id: 'team', label: 'Team Space', iconName: 'users' },
  ];

  const getIcon = (name: string, isActive: boolean) => {
    const iconClass = `w-5 h-5 transition-transform group-hover:scale-105 ${
      isActive ? 'text-brand-400' : 'text-gray-400 group-hover:text-white'
    }`;
    switch (name) {
      case 'dashboard': return <LayoutDashboard className={iconClass} />;
      case 'bot': return <Bot className={iconClass} />;
      case 'leads': return <Target className={iconClass} />;
      case 'conversations': return <MessageSquare className={iconClass} />;
      case 'gmail': return <Mail className={iconClass} />;
      case 'sheets': return <FileSpreadsheet className={iconClass} />;
      case 'handoffs': return <Inbox className={iconClass} />;
      case 'analytics': return <BarChart3 className={iconClass} />;
      case 'cpu': return <Cpu className={iconClass} />;
      case 'activity': return <Activity className={iconClass} />;
      case 'zap': return <Zap className={iconClass} />;
      case 'users': return <Users className={iconClass} />;
      default: return <LayoutDashboard className={iconClass} />;
    }
  };

  return (
    <div 
      className={`relative h-screen bg-[#07080f]/90 backdrop-blur-2xl border-r border-indigo-500/10 flex flex-col transition-all duration-300 z-40 shadow-2xl ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-indigo-500/10 bg-indigo-950/20 relative">
        <div 
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden whitespace-nowrap"
        >
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex-shrink-0 flex items-center justify-center text-white font-black text-sm w-9 h-9 shadow-lg shadow-indigo-500/30 border border-white/20">
            {bizLogo}
          </div>
          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col text-left"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-sm tracking-tight text-white truncate max-w-[120px]">
                  {bizName}
                </span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              </div>
              <span className="text-[10px] font-mono text-indigo-300/60 truncate max-w-[130px]">
                {bizIndustry}
              </span>
            </motion.div>
          )}
        </div>

        {/* Collapse toggle (only visible on desktop) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex p-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/20 text-gray-400 hover:text-white absolute -right-3 top-4 z-50 transition-all cursor-pointer shadow-md"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-indigo-300" /> : <ChevronLeft className="w-3.5 h-3.5 text-indigo-300" />}
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer relative ${
                isActive 
                  ? 'bg-gradient-to-r from-indigo-600/25 via-violet-600/15 to-transparent text-white border border-indigo-500/30 shadow-md shadow-indigo-500/10 font-semibold' 
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              {getIcon(item.iconName, isActive)}
              {!isCollapsed && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex-1 text-left whitespace-nowrap tracking-wide"
                >
                  {item.label}
                </motion.span>
              )}
              {!isCollapsed && item.badge && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                  item.badge === 'Live' 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10' 
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20'
                }`}>
                  {item.badge}
                </span>
              )}
              {isCollapsed && item.badge && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Section */}
      <div className="p-3.5 border-t border-indigo-500/10 bg-[#05060b]/80">
        <div className="flex items-center gap-3 p-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
          {user?.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              className="w-9 h-9 rounded-xl border border-indigo-500/30 object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600/20 to-violet-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-bold flex-shrink-0">
              <User className="w-4 h-4" />
            </div>
          )}

          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Imran Khan'}</p>
              <p className="text-[10px] text-indigo-300/60 truncate font-mono">{user?.email || 'imran.khan@scaleflow.io'}</p>
            </motion.div>
          )}

          {!isCollapsed && (
            <button
              onClick={onLogout}
              className="p-1.5 text-gray-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
        {isCollapsed && (
          <button
            onClick={onLogout}
            className="mt-2 w-full p-2 text-gray-500 hover:text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors flex justify-center cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
