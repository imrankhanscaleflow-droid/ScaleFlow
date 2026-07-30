/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  CheckCircle2, 
  Send, 
  AlertTriangle, 
  Clock, 
  ArrowLeft, 
  Search, 
  Filter, 
  RefreshCw, 
  Inbox
} from 'lucide-react';
import { Route, Ticket } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface HandoffsPageProps {
  onNavigate: (route: Route) => void;
}

const DEFAULT_TICKETS: Ticket[] = [
  {
    id: "TCK-801",
    leadId: "LD-101",
    customerName: "Sarah Jenkins",
    phone: "+1 (555) 019-2831",
    email: "sarah.j@gmail.com",
    priority: "urgent",
    reason: "AI receptionist stuck on Custom SLA details.",
    createdTime: new Date(Date.now() - 3600000).toISOString(),
    status: "open",
    conversation: [
      { id: "msg-1", sender: "system", text: "AI conversation initialized via Voice widget.", timestamp: "10:28 AM" },
      { id: "msg-2", sender: "user", text: "I need to know if you can guarantee 99.99% uptime in writing before we sign the deal.", timestamp: "10:29 AM" },
      { id: "msg-3", sender: "agent", text: "Our standard SLA outlines service availability targets and credits, but any custom guarantees require corporate review.", timestamp: "10:30 AM" },
      { id: "msg-4", sender: "user", text: "That is too vague. Can you actually write 99.99% into our contract? Let me talk to a human.", timestamp: "10:31 AM" },
      { id: "msg-5", sender: "system", text: "Customer requested human supervisor. Routed to Escalation Desk.", timestamp: "10:31 AM" }
    ]
  },
  {
    id: "TCK-802",
    leadId: "LD-102",
    customerName: "Claire Sterling",
    phone: "+1 (555) 789-0123",
    email: "claire@zenith.ai",
    priority: "high",
    reason: "Requested custom enterprise volume pricing.",
    createdTime: new Date(Date.now() - 7200000).toISOString(),
    status: "open",
    conversation: [
      { id: "msg-6", sender: "system", text: "AI conversation initialized via Chat widget.", timestamp: "09:12 AM" },
      { id: "msg-7", sender: "user", text: "We have 500+ nodes, we need custom enterprise tier pricing.", timestamp: "09:13 AM" },
      { id: "msg-8", sender: "agent", text: "I would be happy to have our account managers design a custom pricing model for your team.", timestamp: "09:14 AM" },
      { id: "msg-9", sender: "user", text: "Excellent, can you connect me to one now to discuss?", timestamp: "09:15 AM" },
      { id: "msg-10", sender: "system", text: "Lead marked as Enterprise. Escalated to Human Handoff Pool.", timestamp: "09:15 AM" }
    ]
  },
  {
    id: "TCK-803",
    leadId: null,
    customerName: "David Chen",
    phone: "+1 (555) 543-9876",
    email: "dchen@innovate.co",
    priority: "medium",
    reason: "Technical query about API rate limits.",
    createdTime: new Date(Date.now() - 14400000).toISOString(),
    status: "resolved",
    conversation: [
      { id: "msg-11", sender: "system", text: "AI conversation initialized.", timestamp: "08:00 AM" },
      { id: "msg-12", sender: "user", text: "What are your API rate limits for the free tier?", timestamp: "08:01 AM" },
      { id: "msg-13", sender: "agent", text: "The free tier is rate limited to 60 requests per minute.", timestamp: "08:02 AM" },
      { id: "msg-14", sender: "user", text: "Perfect, thank you!", timestamp: "08:03 AM" },
      { id: "msg-15", sender: "system", text: "Ticket resolved automatically.", timestamp: "08:03 AM" }
    ]
  }
];

export function HandoffsPage({ onNavigate }: HandoffsPageProps) {
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    const saved = localStorage.getItem('scaleflow_tickets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {}
    }
    localStorage.setItem('scaleflow_tickets', JSON.stringify(DEFAULT_TICKETS));
    return DEFAULT_TICKETS;
  });

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const modalChatEndRef = useRef<HTMLDivElement | null>(null);

  // Poll for tickets in real-time
  useEffect(() => {
    const loadTickets = () => {
      const saved = localStorage.getItem('scaleflow_tickets');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTickets(parsed);
          // Sync selectedTicket conversation in real-time if modal is open
          if (selectedTicket) {
            const fresh = parsed.find((t: any) => t.id === selectedTicket.id);
            if (fresh && JSON.stringify(fresh.conversation) !== JSON.stringify(selectedTicket.conversation)) {
              setSelectedTicket(fresh);
            }
          }
        } catch (e) {}
      }
    };
    loadTickets();
    const interval = setInterval(loadTickets, 1500);
    return () => clearInterval(interval);
  }, [selectedTicket]);

  // Check for active ticket redirected from dashboard
  useEffect(() => {
    const activeId = localStorage.getItem('scaleflow_active_ticket_id');
    if (activeId && tickets.length > 0) {
      const activeTicket = tickets.find(t => t.id === activeId);
      if (activeTicket) {
        setSelectedTicket(activeTicket);
      }
      localStorage.removeItem('scaleflow_active_ticket_id');
    }
  }, [tickets]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (selectedTicket) {
      modalChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.conversation]);

  const handleSendReply = (ticketId: string, text: string) => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = {
      id: `msg-human-${Date.now()}`,
      sender: 'agent' as const,
      text,
      timestamp: timeString
    };

    const savedTickets = localStorage.getItem('scaleflow_tickets');
    if (savedTickets) {
      try {
        const currentTickets = JSON.parse(savedTickets);
        const updated = currentTickets.map((t: any) => {
          if (t.id === ticketId) {
            const updatedConv = [...(t.conversation || []), newMsg];
            setSelectedTicket({
              ...t,
              conversation: updatedConv
            });
            return {
              ...t,
              conversation: updatedConv
            };
          }
          return t;
        });
        localStorage.setItem('scaleflow_tickets', JSON.stringify(updated));
        setTickets(updated);
        setReplyText('');
      } catch (e) {}
    }
  };

  const handleResolveTicket = (ticketId: string) => {
    const savedTickets = localStorage.getItem('scaleflow_tickets');
    if (savedTickets) {
      try {
        const currentTickets = JSON.parse(savedTickets);
        const updated = currentTickets.map((t: any) => {
          if (t.id === ticketId) {
            return {
              ...t,
              status: 'resolved' as const
            };
          }
          return t;
        });
        localStorage.setItem('scaleflow_tickets', JSON.stringify(updated));
        setTickets(updated);
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket({
            ...selectedTicket,
            status: 'resolved' as const
          });
        }
      } catch (e) {}
    }
  };

  const handleReopenTicket = (ticketId: string) => {
    const savedTickets = localStorage.getItem('scaleflow_tickets');
    if (savedTickets) {
      try {
        const currentTickets = JSON.parse(savedTickets);
        const updated = currentTickets.map((t: any) => {
          if (t.id === ticketId) {
            return {
              ...t,
              status: 'open' as const
            };
          }
          return t;
        });
        localStorage.setItem('scaleflow_tickets', JSON.stringify(updated));
        setTickets(updated);
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket({
            ...selectedTicket,
            status: 'open' as const
          });
        }
      } catch (e) {}
    }
  };

  const handleOpenTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    // Mark notifications of this ticket as read
    const savedNotifs = localStorage.getItem('scaleflow_notifications');
    if (savedNotifs) {
      try {
        const parsed = JSON.parse(savedNotifs);
        const updated = parsed.map((n: any) => n.ticketId === ticket.id ? { ...n, unread: false } : n);
        localStorage.setItem('scaleflow_notifications', JSON.stringify(updated));
      } catch (e) {}
    }
  };

  // Filter and search logic
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'open' && ticket.status === 'open') ||
      (statusFilter === 'resolved' && ticket.status === 'resolved');

    return matchesSearch && matchesStatus;
  });

  const openTicketsCount = tickets.filter(t => t.status === 'open').length;

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      
      {/* Header and Back navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-bold text-white tracking-tight">Human Handoff Tickets</h2>
            <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded bg-brand-600/10 text-brand-400 border border-brand-500/15">
              Escalation Desk
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Audit, respond, and override active AI conversations requiring manual operator guidance.
          </p>
        </div>

        {/* Quick Statistics badges */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-[#08080c] border border-[#1a1a24] text-center shrink-0">
            <span className="block text-[9px] font-sans font-semibold text-gray-500 uppercase tracking-wider">Open Queue</span>
            <span className={`text-sm font-mono font-bold ${openTicketsCount > 0 ? 'text-amber-400 animate-pulse' : 'text-gray-400'}`}>
              {openTicketsCount}
            </span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-[#08080c] border border-[#1a1a24] text-center shrink-0">
            <span className="block text-[9px] font-sans font-semibold text-gray-500 uppercase tracking-wider">Total Handled</span>
            <span className="text-sm font-mono font-bold text-white">
              {tickets.length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#08080c]/60 border border-white/[0.04] rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg backdrop-blur-md">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, reason, ticket ID..."
            className="block w-full pl-10 pr-4 py-2 bg-[#040406]/60 border border-white/[0.06] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-sans font-semibold text-gray-500 uppercase flex items-center gap-1.5 mr-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          <div className="bg-[#040406]/60 border border-white/[0.06] rounded-xl p-1 flex items-center gap-1">
            {(['all', 'open', 'resolved'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all duration-150 cursor-pointer ${
                  statusFilter === status
                    ? 'bg-white/[0.08] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tickets List */}
      {filteredTickets.length === 0 ? (
        <div className="bg-[#08080c]/60 border border-white/[0.04] rounded-2xl p-16 text-center space-y-4 shadow-xl backdrop-blur-md">
          <div className="w-12 h-12 rounded-full bg-[#12121e] border border-white/[0.05] flex items-center justify-center mx-auto text-gray-500">
            <Inbox className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white font-display">No handoff tickets found</h4>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              There are no escalation tickets matching your active search filters. Escalation cues populate when clients trigger operator override.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => {
            const isOpen = ticket.status === 'open';
            return (
              <div 
                key={ticket.id} 
                className={`p-5 bg-[#08080c] border rounded-2xl flex flex-col justify-between gap-5 transition-all shadow-md ${
                  isOpen ? 'border-[#1a1a24] hover:border-brand-500/30' : 'border-emerald-500/10 opacity-70'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-mono text-brand-400 tracking-wider uppercase block">{ticket.id}</span>
                      <h4 className="text-xs font-bold text-white font-display truncate max-w-[140px]">{ticket.customerName}</h4>
                    </div>
                    <span className={`text-[9px] font-sans font-semibold px-2 py-0.5 rounded border uppercase ${
                      ticket.priority === 'urgent' ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' :
                      ticket.priority === 'high' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                    }`}>
                      {ticket.priority}
                    </span>
                  </div>

                  <div className="space-y-2 text-[11px] border-t border-[#12121a] pt-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans font-medium">Reason:</span>
                      <span className="text-gray-300 font-medium truncate max-w-[150px]" title={ticket.reason}>{ticket.reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans font-medium">Email:</span>
                      <span className="text-gray-300 font-mono truncate max-w-[150px]" title={ticket.email}>{ticket.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans font-medium">Phone:</span>
                      <span className="text-gray-300 font-mono truncate max-w-[150px]" title={ticket.phone}>{ticket.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-sans font-medium">Linked Lead:</span>
                      <span className="text-brand-300 font-mono">{ticket.leadId || 'None'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-[#12121a] pt-3">
                  <span className="text-[10px] text-gray-500 font-mono">
                    {new Date(ticket.createdTime).toLocaleDateString()} @ {new Date(ticket.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex gap-1.5">
                    {isOpen ? (
                      <>
                        <button
                          onClick={() => handleOpenTicket(ticket)}
                          className="text-[10px] bg-brand-600/10 hover:bg-brand-600 hover:text-white text-brand-300 font-semibold px-3 py-1.5 border border-brand-500/20 hover:border-transparent rounded-lg transition-all cursor-pointer"
                        >
                          Reply & View
                        </button>
                        <button
                          onClick={() => handleResolveTicket(ticket.id)}
                          className="text-[10px] bg-emerald-500/5 hover:bg-emerald-500 hover:text-white text-emerald-400 font-semibold p-1.5 border border-emerald-500/15 hover:border-transparent rounded-lg transition-all cursor-pointer"
                          title="Mark as Resolved"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 py-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden shadow-2xl relative animate-fade-in">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#12121a] bg-[#050508]/60 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-brand-400 uppercase tracking-wider">{selectedTicket.id} / Handoff Override</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-sm font-bold text-white font-display">Live Operator Chat</h3>
                  <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded border uppercase ${
                    selectedTicket.status === 'open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {selectedTicket.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedTicket.status === 'open' ? (
                  <button
                    onClick={() => handleResolveTicket(selectedTicket.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white text-[10px] font-semibold border border-emerald-500/20 hover:border-transparent rounded-lg transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Resolve
                  </button>
                ) : (
                  <button
                    onClick={() => handleReopenTicket(selectedTicket.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-600 text-amber-400 hover:text-white text-[10px] font-semibold border border-amber-500/20 hover:border-transparent rounded-lg transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Re-open
                  </button>
                )}
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-white p-1.5 bg-[#12121a] hover:bg-[#1a1a24] border border-[#22222f] rounded-lg transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Customer Details Metadata Bar */}
            <div className="px-6 py-2.5 bg-[#0b0b10] border-b border-[#12121a] flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Customer:</span>
                <span className="text-white font-semibold">{selectedTicket.customerName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Phone:</span>
                <span className="text-gray-300 font-mono">{selectedTicket.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Email:</span>
                <span className="text-gray-300 font-mono">{selectedTicket.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Linked Lead:</span>
                {selectedTicket.leadId ? (
                  <button
                    onClick={() => {
                      setSelectedTicket(null);
                      onNavigate('leads');
                    }}
                    className="text-brand-400 hover:text-brand-300 font-mono font-semibold underline cursor-pointer"
                  >
                    {selectedTicket.leadId}
                  </button>
                ) : (
                  <span className="text-gray-500 font-mono">None</span>
                )}
              </div>
            </div>

            {/* Conversation Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-transparent">
              {selectedTicket.conversation?.map((msg: any) => {
                const isAgent = msg.sender === 'agent';
                const isSystem = msg.sender === 'system';
                
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="px-3 py-1.5 bg-[#12121a] border border-[#1d1d29] rounded-lg text-[10px] text-gray-400 font-mono text-center max-w-lg">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-md rounded-xl p-3.5 space-y-1 ${
                      isAgent 
                        ? 'bg-[#0c0c14] text-gray-200 rounded-tl-none border border-[#1b1b2a]' 
                        : 'bg-brand-600 text-white rounded-tr-none border border-brand-500/20'
                    }`}>
                      <div className="flex items-center justify-between gap-6 mb-1">
                        <span className="text-[9px] font-mono opacity-50 uppercase tracking-wider">
                          {isAgent ? 'Representative (You)' : 'Customer'}
                        </span>
                        <span className="text-[9px] font-mono opacity-40">{msg.timestamp}</span>
                      </div>
                      <p className="text-xs leading-relaxed font-sans whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={modalChatEndRef} />
            </div>

            {/* Send Reply Footer */}
            <div className="p-4 border-t border-[#12121a] bg-[#050508]/60">
              {selectedTicket.status === 'open' ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!replyText.trim()) return;
                    handleSendReply(selectedTicket.id, replyText);
                  }} 
                  className="flex items-center gap-3"
                >
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type reply to customer as human agent..."
                    className="block flex-1 px-4 py-2.5 bg-[#040406] border border-[#1d1d29] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="p-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors border border-brand-500/10 flex-shrink-0 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="text-center py-2 text-xs font-mono text-emerald-400">
                  This ticket has been marked as RESOLVED. Re-open ticket status to type responses.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
