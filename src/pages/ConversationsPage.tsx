/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { SavedConversation } from '../types';
import { useRouter } from '../hooks/useRouter';
import { 
  MessageSquare, 
  Phone, 
  CheckCircle2, 
  User, 
  MessageCircle, 
  SlidersHorizontal,
  Bot,
  Hash,
  Search,
  Filter,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  Archive,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  Inbox
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Seed conversations matching initial leads to ensure the interface is fully populated
const SEED_CONVERSATIONS: SavedConversation[] = [
  {
    id: 'conv-imran-801',
    leadId: 'LD-801',
    customerName: 'Imran Khan',
    phone: '+1 (555) 019-2831',
    email: 'imran@scaleflow.io',
    date: '2026-07-16',
    time: '10:15 AM',
    lastMessage: 'Are you able to support international routing?',
    status: 'open',
    messages: [
      { id: 'm1', sender: 'user', text: 'Hi, I saw your ScaleFlow voice automation tools.', timestamp: '10:14 AM' },
      { id: 'm2', sender: 'agent', text: 'Hello Imran! I am ScaleFlow AI Receptionist. I can explain our routing features or qualify your workspace details.', timestamp: '10:14 AM' },
      { id: 'm3', sender: 'user', text: 'Great. Are you able to support international routing rules out-of-the-box?', timestamp: '10:15 AM' },
      { id: 'm4', sender: 'system', text: 'Call session routed to Active Pipeline dashboard.', timestamp: '10:15 AM' }
    ],
    notes: 'Imran is looking for custom international SIP trunking integration. Follow up on Monday.',
    archived: false
  },
  {
    id: 'conv-sarah-802',
    leadId: 'LD-802',
    customerName: 'Sarah Jenkins',
    phone: '+1 (555) 014-9922',
    email: 'sarah@vertex.sys',
    date: '2026-07-15',
    time: '04:30 PM',
    lastMessage: 'The quote looks great, looking forward to starting.',
    status: 'closed',
    messages: [
      { id: 'm5', sender: 'user', text: 'Can we configure custom voice accents with the receptionist?', timestamp: '04:28 PM' },
      { id: 'm6', sender: 'agent', text: 'Yes Sarah! We support US, UK, and Australia neural accent profiles natively.', timestamp: '04:29 PM' },
      { id: 'm7', sender: 'user', text: 'The quote looks great, looking forward to starting.', timestamp: '04:30 PM' }
    ],
    notes: 'Approved the SLA standard. Contract sent via DocuSign.',
    archived: false
  },
  {
    id: 'conv-marcus-803',
    leadId: 'LD-803',
    customerName: 'Marcus Sterling',
    phone: '+1 (555) 012-3844',
    email: 'marcus@novex.ai',
    date: '2026-07-14',
    time: '02:15 PM',
    lastMessage: 'Please text me the webhook verification keys.',
    status: 'escalated',
    messages: [
      { id: 'm8', sender: 'user', text: 'Is there a setup guide for the webhooks?', timestamp: '02:10 PM' },
      { id: 'm9', sender: 'agent', text: 'Of course. Go to the Developer Docs under the dashboard workspace tab.', timestamp: '02:12 PM' },
      { id: 'm10', sender: 'user', text: 'Please text me the webhook verification keys.', timestamp: '02:15 PM' },
      { id: 'm11', sender: 'system', text: 'Live Receptionist Support Active. A human representative has been notified.', timestamp: '02:16 PM' }
    ],
    notes: 'Handoff triggered because Marcus requested api credentials via chat.',
    archived: false
  },
  {
    id: 'conv-david-805',
    leadId: 'LD-805',
    customerName: 'David Cho',
    phone: '+1 (555) 017-4839',
    email: 'david@aether.cap',
    date: '2026-07-12',
    time: '11:20 AM',
    lastMessage: 'Let me review the SLA latency with my dev team.',
    status: 'open',
    messages: [
      { id: 'm12', sender: 'user', text: 'What is the average voice delay in milliseconds?', timestamp: '11:18 AM' },
      { id: 'm13', sender: 'agent', text: 'Our voice synthesis nodes stream audio packages with sub-second SLA speed (~850ms).', timestamp: '11:19 AM' },
      { id: 'm14', sender: 'user', text: 'Let me review the SLA latency with my dev team.', timestamp: '11:20 AM' }
    ],
    notes: 'Interested in sub-800ms ping rates. Sent technical documentation whitepaper.',
    archived: false
  }
];

export function ConversationsPage() {
  const { navigate } = useRouter();

  // Load conversations from localStorage or seed
  const [conversations, setConversations] = useState<SavedConversation[]>(() => {
    const saved = localStorage.getItem('scaleflow_all_conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      } catch (err) {
        console.error('Error parsing conversations:', err);
      }
    }
    // Seed and save to local storage
    localStorage.setItem('scaleflow_all_conversations', JSON.stringify(SEED_CONVERSATIONS));
    return SEED_CONVERSATIONS;
  });

  const [activeId, setActiveId] = useState<string>(() => {
    return conversations[0]?.id || '';
  });

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed' | 'escalated'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Note text state
  const [noteText, setNoteText] = useState<string>('');

  // Find active conversation
  const activeChat = useMemo(() => {
    return conversations.find(c => c.id === activeId) || null;
  }, [conversations, activeId]);

  // Load existing note when activeChat changes
  useEffect(() => {
    if (activeChat) {
      setNoteText(activeChat.notes || '');
    } else {
      setNoteText('');
    }
  }, [activeId, activeChat]);

  // Synchronize with localStorage
  const saveConversations = (updated: SavedConversation[]) => {
    setConversations(updated);
    localStorage.setItem('scaleflow_all_conversations', JSON.stringify(updated));
  };

  // Helper date matchers
  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const isThisWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  };

  const isThisMonth = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  // Client-side filtering and search
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      // Archive filter
      if (showArchived) {
        if (!c.archived) return false;
      } else {
        if (c.archived) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;

      // Time filter
      if (timeFilter === 'today' && !isToday(c.date)) return false;
      if (timeFilter === 'week' && !isThisWeek(c.date)) return false;
      if (timeFilter === 'month' && !isThisMonth(c.date)) return false;

      // Search filter (Name, Phone, Email, Conversation ID)
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesName = c.customerName.toLowerCase().includes(query);
        const matchesPhone = c.phone.toLowerCase().includes(query);
        const matchesEmail = c.email.toLowerCase().includes(query);
        const matchesId = c.id.toLowerCase().includes(query);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesId) return false;
      }

      return true;
    });
  }, [conversations, statusFilter, timeFilter, searchTerm, showArchived]);

  // Handle Business Owner Actions
  const handleSaveNotes = () => {
    if (!activeChat) return;
    const updated = conversations.map(c => {
      if (c.id === activeId) {
        return { ...c, notes: noteText };
      }
      return c;
    });
    saveConversations(updated);
  };

  const handleUpdateStatus = (newStatus: 'open' | 'closed' | 'escalated') => {
    if (!activeChat) return;
    const updated = conversations.map(c => {
      if (c.id === activeId) {
        return { ...c, status: newStatus };
      }
      return c;
    });
    saveConversations(updated);
  };

  const handleToggleArchive = () => {
    if (!activeChat) return;
    const nextArchivedState = !activeChat.archived;
    const updated = conversations.map(c => {
      if (c.id === activeId) {
        return { ...c, archived: nextArchivedState };
      }
      return c;
    });
    saveConversations(updated);

    // Switch selection to another conversation in list if we just archived/unarchived this one
    const remaining = filteredConversations.filter(c => c.id !== activeId);
    if (remaining.length > 0) {
      setActiveId(remaining[0].id);
    } else {
      setActiveId('');
    }
  };

  const handleViewLeadProfile = (leadId: string) => {
    localStorage.setItem('scaleflow_selected_lead_id', leadId);
    navigate('leads');
  };

  const getStatusBadgeStyle = (status: 'open' | 'closed' | 'escalated') => {
    switch (status) {
      case 'open':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'closed':
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
      case 'escalated':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6 h-[calc(100vh-140px)] flex flex-col animate-fade-in">
      {/* Header section */}
      <div className="border-b border-[#1a1a24] pb-4 flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight">Active Dialogues & Conversations</h2>
          <p className="text-xs text-gray-500">Audit customer dialogues, review real-time AI transcripts, manage escalation status, and record notes.</p>
        </div>

        {/* Top filter toggle for active vs archived */}
        <div className="flex bg-[#08080c] border border-[#1d1d29] rounded-lg p-1">
          <button
            onClick={() => {
              setShowArchived(false);
              const activeList = conversations.filter(c => !c.archived);
              if (activeList.length > 0) setActiveId(activeList[0].id);
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              !showArchived 
                ? 'bg-brand-600/20 text-brand-300 border border-brand-500/25' 
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Inbox className="w-3.5 h-3.5" />
              Active Feed
            </div>
          </button>
          <button
            onClick={() => {
              setShowArchived(true);
              const archivedList = conversations.filter(c => c.archived);
              if (archivedList.length > 0) setActiveId(archivedList[0].id);
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              showArchived 
                ? 'bg-brand-600/20 text-brand-300 border border-brand-500/25' 
                : 'text-gray-400 hover:text-white border border-transparent'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5" />
              Archived ({conversations.filter(c => c.archived).length})
            </div>
          </button>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="flex-1 flex gap-5 min-h-0 bg-[#08080c] border border-[#1a1a24] rounded-2xl overflow-hidden">
        
        {/* Left Side: Inbox List Column */}
        <div className="w-full md:w-96 border-r border-[#151520] flex flex-col flex-shrink-0 bg-[#060609]">
          
          {/* Quick Search Widget */}
          <div className="p-4 border-b border-[#151520] space-y-3 flex-shrink-0">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-gray-500" />
              </span>
              <input
                type="text"
                placeholder="Search name, phone, email, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            {/* Quick Filters controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-gray-500 font-sans font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1"><Filter className="w-2.5 h-2.5 text-brand-400" /> Status Filter</span>
                <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5 text-indigo-400" /> Timeframe</span>
              </div>

              {/* Status Row */}
              <div className="grid grid-cols-4 gap-1">
                {(['all', 'open', 'closed', 'escalated'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`py-1 text-[9px] font-semibold uppercase tracking-wider font-sans rounded cursor-pointer border transition-all ${
                      statusFilter === status
                        ? 'bg-brand-600/10 text-brand-300 border-brand-500/30'
                        : 'bg-[#040406] text-gray-500 border-[#1a1a24] hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Time Row */}
              <div className="grid grid-cols-4 gap-1">
                {(['all', 'today', 'week', 'month'] as const).map((time) => (
                  <button
                    key={time}
                    onClick={() => setTimeFilter(time)}
                    className={`py-1 text-[9px] font-semibold uppercase tracking-wider font-sans rounded cursor-pointer border transition-all ${
                      timeFilter === time
                        ? 'bg-indigo-600/10 text-indigo-400 border-indigo-500/30'
                        : 'bg-[#040406] text-gray-500 border-[#1a1a24] hover:text-white'
                    }`}
                  >
                    {time === 'all' ? 'All Time' : time}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List Scroll Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#12121c] p-2 space-y-1">
            {filteredConversations.length > 0 ? (
              filteredConversations.map((chat) => (
                <div
                  key={chat.id}
                  id={`chat-item-${chat.id}`}
                  onClick={() => {
                    setActiveId(chat.id);
                  }}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all flex flex-col gap-2 border ${
                    activeId === chat.id 
                      ? 'bg-brand-600/10 border-brand-500/25 shadow-lg shadow-brand-950/20' 
                      : 'bg-transparent border-transparent hover:bg-[#12121a]/40 hover:border-[#12121a]'
                  }`}
                >
                  {/* Row 1: Avatar, Name, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#12121a] border border-[#1d1d29] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {chat.customerName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">{chat.customerName}</div>
                        <div className="text-[9px] text-gray-500 font-mono flex items-center gap-1">
                          <Hash className="w-2 h-2 text-brand-500" />
                          {chat.id}
                        </div>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-sans font-semibold tracking-wider uppercase flex-shrink-0 ${getStatusBadgeStyle(chat.status)}`}>
                      {chat.status}
                    </span>
                  </div>

                  {/* Row 2: Last message blurb */}
                  <p className="text-xs text-gray-400 line-clamp-2 px-1 leading-relaxed">
                    {chat.lastMessage || <span className="italic text-gray-600">No messages yet</span>}
                  </p>

                  {/* Row 3: Metadata (Date, Lead connection indicator) */}
                  <div className="flex items-center justify-between mt-1 pt-2 border-t border-[#12121c] text-[10px] text-gray-500 font-sans font-medium">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-600" />
                      <span>{chat.date} {chat.time}</span>
                    </div>

                    {chat.leadId && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-brand-500/5 text-brand-400 border border-brand-500/10 text-[8px] font-semibold uppercase">
                        <User className="w-2.5 h-2.5" />
                        Lead Sync
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="h-48 flex flex-col items-center justify-center p-6 text-center text-gray-600">
                <Inbox className="w-8 h-8 text-gray-700 mb-2" />
                <p className="text-xs">No dialogues match your filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Active Dialogue transcript & detailing */}
        <div className="flex-1 flex flex-col bg-transparent min-w-0">
          {activeChat ? (
            <div className="flex-1 flex flex-col lg:flex-row min-h-0">
              
              {/* Central Area: Transcript loop */}
              <div className="flex-1 flex flex-col border-r border-[#151520] min-h-0">
                
                {/* Chat header toolbar */}
                <div className="px-6 py-4 border-b border-[#151520] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#050508]/30 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-600/10 border border-brand-500/20 flex items-center justify-center font-bold text-brand-400 text-sm flex-shrink-0">
                      {activeChat.customerName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-white">{activeChat.customerName}</h3>
                        {activeChat.leadId && (
                          <button
                            onClick={() => handleViewLeadProfile(activeChat.leadId!)}
                            className="inline-flex items-center gap-1 text-[9px] px-2 py-0.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 rounded border border-brand-500/20 cursor-pointer font-semibold transition-all uppercase"
                          >
                            <User className="w-2.5 h-2.5" />
                            Lead Profile
                            <ArrowUpRight className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2.5 text-[10px] text-gray-500 font-sans font-medium mt-0.5">
                        <span>Conv ID: <span className="text-gray-400 font-mono font-semibold">{activeChat.id}</span></span>
                        <span>•</span>
                        <span>Created: <span className="text-gray-400">{activeChat.date} at {activeChat.time}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2">
                    {/* Status Toggle buttons */}
                    {activeChat.status === 'closed' ? (
                      <button
                        onClick={() => handleUpdateStatus('open')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-colors border border-emerald-500/10 cursor-pointer uppercase"
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reopen Conversation
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateStatus('closed')}
                        className="px-3 py-1.5 bg-[#0e1711] hover:bg-[#142319] text-emerald-400 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-colors border border-emerald-500/20 cursor-pointer uppercase"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Mark Resolved
                      </button>
                    )}

                    {/* Escalate button */}
                    {activeChat.status !== 'escalated' && (
                      <button
                        onClick={() => handleUpdateStatus('escalated')}
                        className="px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition-colors border border-red-500/20 cursor-pointer uppercase"
                      >
                        <AlertCircle className="w-3 h-3" />
                        Escalate
                      </button>
                    )}

                    {/* Archive button */}
                    <button
                      onClick={handleToggleArchive}
                      className="p-1.5 bg-[#12121a] hover:bg-[#1c1c2b] text-gray-400 hover:text-white rounded-lg border border-[#1d1d29] transition-all cursor-pointer"
                      title={activeChat.archived ? "Unarchive Conversation" : "Archive Conversation"}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Dialogues List Stream */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {activeChat.messages && activeChat.messages.length > 0 ? (
                    activeChat.messages.map((msg, index) => {
                      if (msg.sender === 'system') {
                        return (
                          <div key={msg.id || index} className="flex justify-center my-2">
                            <div className="px-3 py-1 bg-brand-500/5 border border-brand-500/10 rounded-lg text-[10px] text-brand-300 font-sans font-semibold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {msg.text}
                            </div>
                          </div>
                        );
                      }

                      const isAgent = msg.sender === 'agent';
                      return (
                        <div key={msg.id || index} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-lg rounded-xl p-3.5 space-y-1 ${
                            isAgent 
                              ? 'bg-brand-600 text-white rounded-tr-none border border-brand-500/10' 
                              : 'bg-[#0a0a0f] text-gray-200 rounded-tl-none border border-[#1a1a26]'
                          }`}>
                            <div className="flex items-center justify-between gap-6 pb-1 border-b border-white/5">
                              <span className="text-[9px] font-sans font-semibold opacity-70 uppercase tracking-wider flex items-center gap-1">
                                {isAgent ? <Bot className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                                {isAgent ? 'ScaleFlow AI' : activeChat.customerName}
                              </span>
                              <span className="text-[9px] font-sans font-medium opacity-50">{msg.timestamp}</span>
                            </div>
                            <p className="text-xs leading-relaxed font-sans mt-1.5 whitespace-pre-wrap">{msg.text}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600">
                      <MessageSquare className="w-8 h-8 mb-2" />
                      <p className="text-xs font-sans">No dialogue messages synced.</p>
                    </div>
                  )}
                </div>

                {/* Status-specific warning banner */}
                {activeChat.status === 'escalated' && (
                  <div className="p-3 bg-red-950/15 border-t border-red-900/30 text-red-400 text-xs font-sans font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 animate-pulse text-red-500" />
                    <span>⚠️ Escalated Status Active: Live operator must contact this customer. Phone: <span className="font-mono">{activeChat.phone}</span></span>
                  </div>
                )}
              </div>

              {/* Side panel: Metadata, Contacts & Notes */}
              <div className="w-full lg:w-80 bg-[#050508]/20 flex flex-col p-5 space-y-5 flex-shrink-0 overflow-y-auto">
                
                {/* Lead Profile/Contact Info */}
                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-semibold text-gray-400 font-sans tracking-wider uppercase">Contact Details</h4>
                  
                  <div className="space-y-3 bg-[#08080c] border border-[#151520] p-4 rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-[9px] text-gray-500 font-sans font-semibold uppercase block tracking-wider">Customer Name</span>
                      <p className="text-xs font-bold text-white">{activeChat.customerName}</p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] text-gray-500 font-sans font-semibold uppercase block tracking-wider">Phone Number</span>
                      <p className="text-xs font-semibold text-gray-300 font-sans font-medium flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-gray-600" />
                        {activeChat.phone}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[9px] text-gray-500 font-sans font-semibold uppercase block tracking-wider">Email Address</span>
                      <p className="text-xs font-semibold text-gray-300 font-sans font-medium flex items-center gap-1 truncate">
                        <FileText className="w-3.5 h-3.5 text-gray-600" />
                        {activeChat.email}
                      </p>
                    </div>

                    {activeChat.leadId && (
                      <div className="pt-2 border-t border-[#12121c] flex items-center justify-between">
                        <span className="text-[9px] text-emerald-400 font-sans font-semibold uppercase tracking-wider">Linked Lead ID:</span>
                        <span className="text-xs font-bold text-white font-mono">{activeChat.leadId}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Internal Notes Panel */}
                <div className="space-y-3 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-semibold text-gray-400 font-sans tracking-wider uppercase">Internal Notes</h4>
                    <span className="text-[9px] text-brand-400 font-sans font-semibold uppercase">Private</span>
                  </div>

                  <div className="flex-1 flex flex-col bg-[#08080c] border border-[#151520] p-4 rounded-xl space-y-3">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add system notes, task follow-ups, or custom lead details here..."
                      className="block w-full flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 resize-none focus:outline-none min-h-[140px]"
                    />
                    
                    <button
                      onClick={handleSaveNotes}
                      className="w-full py-2 bg-brand-600/10 hover:bg-brand-600/20 text-brand-300 text-xs font-semibold rounded-lg border border-brand-500/20 transition-all cursor-pointer"
                    >
                      Save Internal Notes
                    </button>
                  </div>
                </div>

                {/* Metadata details */}
                <div className="pt-3 border-t border-[#151520] space-y-2 text-[9px] font-sans font-semibold text-gray-600">
                  <div className="flex justify-between">
                    <span>Archived:</span>
                    <span className={activeChat.archived ? "text-amber-500" : "text-gray-400"}>
                      {activeChat.archived ? "YES" : "NO"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dialer Sync:</span>
                    <span className="text-emerald-400 font-semibold">ONLINE</span>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 bg-[#050508]/10">
              <Inbox className="w-10 h-10 text-gray-700 mb-2.5" />
              <p className="text-sm font-sans">No dialogue thread selected.</p>
              <p className="text-xs text-gray-600 max-w-xs mt-1">Select an active contact or customer conversation on the left panel to review full dialog transcripts.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
