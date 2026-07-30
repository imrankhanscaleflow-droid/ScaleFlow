/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { MetricCard } from '../components/MetricCard';
import { 
  Users, 
  PhoneCall, 
  Activity, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Circle,
  HelpCircle,
  Bot,
  AlertTriangle,
  Send,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Headphones,
  X,
  Radio,
  Zap,
  Calendar,
  CalendarCheck,
  CalendarDays,
  ExternalLink,
  XCircle,
  Mail
} from 'lucide-react';
import { getGmailAnalytics, getGmailConfig } from '../lib/gmail';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import { Route, Ticket, Appointment } from '../types';

interface DashboardPageProps {
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

const ANALYTICS_CHART_DATA = [
  { time: '08:00', calls: 14, qualified: 8, escalated: 2 },
  { time: '10:00', calls: 38, qualified: 24, escalated: 4 },
  { time: '12:00', calls: 62, qualified: 41, escalated: 5 },
  { time: '14:00', calls: 89, qualified: 58, escalated: 7 },
  { time: '16:00', calls: 74, qualified: 50, escalated: 6 },
  { time: '18:00', calls: 45, qualified: 31, escalated: 3 },
  { time: '20:00', calls: 28, qualified: 19, escalated: 1 },
];

export function DashboardPage({ onNavigate }: DashboardPageProps) {
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
  const modalChatEndRef = useRef<HTMLDivElement | null>(null);

  // Appointments and Calendly state
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('scaleflow_appointments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [
      { id: 'AP-901', customerName: 'Sarah Jenkins', phone: '+1 (555) 019-2831', email: 'sarah.j@gmail.com', service: 'Enterprise Demo', date: new Date().toISOString().split('T')[0], time: '10:00 AM', status: 'confirmed', createdTime: new Date().toISOString() },
      { id: 'AP-902', customerName: 'Marcus Sterling', phone: '+1 (555) 345-6789', email: 'msterling@novex.ai', service: 'Voice AI Onboarding', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '02:00 PM', status: 'confirmed', createdTime: new Date().toISOString() },
      { id: 'AP-903', customerName: 'Elena Rostova', phone: '+1 (555) 890-1234', email: 'elena@cybertech.io', service: 'Custom Integration', date: new Date(Date.now() + 172800000).toISOString().split('T')[0], time: '11:30 AM', status: 'confirmed', createdTime: new Date().toISOString() }
    ];
  });

  const [calendlyConfig, setCalendlyConfig] = useState(() => {
    const saved = localStorage.getItem('scaleflow_calendly_config');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { connected: false, email: '', eventType: '', bookingUrl: '' };
  });

  const [gmailAnalytics, setGmailAnalytics] = useState(() => getGmailAnalytics());
  const [gmailConfig, setGmailConfig] = useState(() => getGmailConfig());

  useEffect(() => {
    const loadAppointmentsAndConfig = () => {
      const savedAppts = localStorage.getItem('scaleflow_appointments');
      if (savedAppts) {
        try { setAppointments(JSON.parse(savedAppts)); } catch (e) {}
      }
      const savedCal = localStorage.getItem('scaleflow_calendly_config');
      if (savedCal) {
        try { setCalendlyConfig(JSON.parse(savedCal)); } catch (e) {}
      }
      setGmailAnalytics(getGmailAnalytics());
      setGmailConfig(getGmailConfig());
    };
    loadAppointmentsAndConfig();
    const interval = setInterval(loadAppointmentsAndConfig, 1500);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingCount = appointments.filter(a => a.status === 'confirmed' && a.date >= todayStr).length;
  const todayCount = appointments.filter(a => a.status === 'confirmed' && a.date === todayStr).length;

  const todayMs = new Date(todayStr).getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeekCount = appointments.filter(a => {
    if (a.status !== 'confirmed') return false;
    const apptMs = new Date(a.date).getTime();
    return Math.abs(apptMs - todayMs) <= weekMs;
  }).length;

  const totalBookedCount = appointments.filter(a => a.status === 'confirmed').length;

  useEffect(() => {
    const loadTickets = () => {
      const saved = localStorage.getItem('scaleflow_tickets');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setTickets(parsed);
          // Sync selectedTicket conversation in real-time
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

  // Onboarding milestones representing realistic SaaS setup phases
  const milestones = [
    { id: 1, title: 'Verify custom inbound numbers', status: 'completed', desc: 'Secure local dial-in numbers.' },
    { id: 2, title: 'Build AI Receptionist Prompt', status: 'completed', desc: 'Define conversational instructions.' },
    { id: 3, title: 'Configure Lead Qualifying rules', status: 'completed', desc: 'Formulate lead status filters.' },
    { id: 4, title: 'Integrate Webhook endpoints', status: 'pending', desc: 'Export qualified leads dynamically.' },
  ];

  // Realistic recent platform transactions
  const recentEvents = [
    { id: 'ev-101', type: 'call', time: '2 mins ago', title: 'Inbound Voice Call Completed', status: 'Answered', meta: 'Duration: 3m 42s | ID: +1 (555) 0192' },
    { id: 'ev-102', type: 'lead', time: '14 mins ago', title: 'New Qualified Lead Captured', status: 'Qualified', meta: 'Imran Khan - ScaleFlow ($5,000/mo)' },
    { id: 'ev-103', type: 'sms', time: '48 mins ago', title: 'SMS Query Processed', status: 'Replied', meta: 'SMS Text: "Is your pricing model flexible?"' },
    { id: 'ev-104', type: 'system', time: '1 hour ago', title: 'AI prompt updated', status: 'Active', meta: 'Version 2.4.1 deployed to node regions' },
  ];

  const openTicketCount = tickets.filter(t => t.status === 'open').length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Top Welcome & Control Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0e0f18] via-[#090a12] to-[#0d0e17] border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
        {/* Glow & grid overlay */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-violet-600/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/20 shadow-sm">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Voice AI Node Cluster: <strong className="text-emerald-400">ONLINE</strong></span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.04] text-gray-300 border border-white/[0.08]">
                <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                <span>Enterprise SLA: 99.99% Uptime</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              ScaleFlow Control Dashboard
            </h1>
            <p className="text-sm text-gray-400 max-w-2xl font-sans">
              Monitor live voice receptionist metrics, review active lead pipelines, and handle operator overrides in real-time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onNavigate('receptionist')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-semibold text-white rounded-xl transition-all shadow-lg shadow-violet-600/20 hover:shadow-violet-600/40 border border-violet-400/30 cursor-pointer active:scale-95"
            >
              <Headphones className="w-4 h-4" />
              <span>Launch AI Console</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('conversations')}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-gray-200 rounded-xl transition-all border border-white/10 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-violet-400" />
              <span>Live Logs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary Voice AI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Lead Capture Velocity"
          value="482 leads"
          change="+12.4%"
          trend="up"
          description="Captured this billing cycle"
          icon={<Users className="w-5 h-5 text-violet-400" />}
        />
        <MetricCard
          title="Voice Node Uptime"
          value="100%"
          change="stable"
          trend="neutral"
          description="SLA dialer response rate"
          icon={<PhoneCall className="w-5 h-5 text-emerald-400" />}
        />
        <MetricCard
          title="Active Voice Channels"
          value="4 / 10"
          change="+2 slots"
          trend="up"
          description="Simultaneous call capacity"
          icon={<Activity className="w-5 h-5 text-sky-400" />}
        />
        <MetricCard
          title="Conversion Efficiency"
          value="24.8%"
          change="+4.2%"
          trend="up"
          description="Inbound-to-Qualified ratio"
          icon={<Clock className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* Calendly & Appointment Performance Metric Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
              Appointments & Calendly Overview
            </h3>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            calendlyConfig.connected 
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${calendlyConfig.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span>Calendly: {calendlyConfig.connected ? 'Connected' : 'Disconnected'}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Upcoming Appointments"
            value={`${upcomingCount} sessions`}
            change="Scheduled"
            trend="up"
            description="Future booked slots"
            icon={<CalendarCheck className="w-5 h-5 text-sky-400" />}
          />
          <MetricCard
            title="Today's Appointments"
            value={`${todayCount} slots`}
            change="Active Today"
            trend="neutral"
            description={`Date: ${todayStr}`}
            icon={<Clock className="w-5 h-5 text-emerald-400" />}
          />
          <MetricCard
            title="This Week's Appointments"
            value={`${thisWeekCount} slots`}
            change="7-Day Window"
            trend="up"
            description="Rolling 7-day bookings"
            icon={<CalendarDays className="w-5 h-5 text-violet-400" />}
          />
          <MetricCard
            title="Total Booked Appointments"
            value={`${totalBookedCount} total`}
            change="Lifetime"
            trend="up"
            description="Synced via Voice AI & Calendly"
            icon={<CheckCircle2 className="w-5 h-5 text-indigo-400" />}
          />
        </div>
      </div>

      {/* Gmail Integration Metric Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
              Gmail Activity & Delivery Analytics
            </h3>
          </div>
          <button
            onClick={() => onNavigate('gmail')}
            className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border bg-red-500/10 text-rose-300 border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${gmailConfig.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>Gmail: {gmailConfig.connected ? 'Connected' : 'Disconnected'}</span>
            <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <MetricCard
            title="Emails Sent Today"
            value={`${gmailAnalytics.sentToday} sent`}
            change="Automated & Copilot"
            trend="up"
            description="Outbound notification emails"
            icon={<Send className="w-5 h-5 text-rose-400" />}
          />
          <MetricCard
            title="Emails Received Today"
            value={`${gmailAnalytics.receivedToday} received`}
            change="Inbound Inquiries"
            trend="neutral"
            description="Customer replies & messages"
            icon={<Mail className="w-5 h-5 text-sky-400" />}
          />
          <MetricCard
            title="Unread Emails"
            value={`${gmailAnalytics.unread} unread`}
            change="Action Needed"
            trend="neutral"
            description="Pending inbox responses"
            icon={<Clock className="w-5 h-5 text-amber-400" />}
          />
          <MetricCard
            title="Failed Deliveries"
            value={`${gmailAnalytics.failedDeliveries} failures`}
            change="0.0% Error Rate"
            trend="neutral"
            description="Handled with auto-retry"
            icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
          />
          <MetricCard
            title="Email Response Rate"
            value={`${gmailAnalytics.replyRatePct}%`}
            change="+12.4% vs Avg"
            trend="up"
            description="Average response time 12m"
            icon={<Zap className="w-5 h-5 text-violet-400" />}
          />
        </div>
      </div>

      {/* Human Handoff Alert Banner */}
      {tickets.some(t => t.status === 'open') && (
        <div className="p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-amber-500/15 text-amber-400 rounded-2xl border border-amber-500/30 shadow-inner">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Operator Escalation Pending</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-black uppercase">
                  {openTicketCount} Action Needed
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-1">
                There are <span className="text-amber-400 font-bold">{openTicketCount} active tickets</span> waiting for manual override intervention.
              </p>
            </div>
          </div>

          <button
            id="open-handoffs-alert-btn"
            onClick={() => onNavigate('handoffs')}
            className="text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black px-5 py-2.5 rounded-xl font-bold tracking-wide relative z-10 self-start sm:self-auto cursor-pointer transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 hover:scale-[1.02]"
          >
            <span>Open Escalation Desk</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Volume & Qualification Chart */}
        <div className="lg:col-span-2 bg-[#0a0b10]/80 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl shadow-xl space-y-6 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold font-display text-white tracking-tight">
                  Voice Traffic & Qualification Velocity
                </h3>
              </div>
              <p className="text-xs text-gray-400">Hourly throughput of processed calls, AI qualifications, and human escalations.</p>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
                <span>Total Calls</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span>Qualified</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span>Escalated</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ANALYTICS_CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorQualified" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f1017', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#d1d5db' }}
                />
                <Area type="monotone" dataKey="calls" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCalls)" />
                <Area type="monotone" dataKey="qualified" stroke="#34d399" strokeWidth={2.5} fillOpacity={1} fill="url(#colorQualified)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Call Center Performance Metrics */}
        <div className="bg-[#0a0b10]/80 border border-white/[0.08] rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between space-y-6">
          <div className="border-b border-white/[0.06] pb-4 space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold font-display text-white tracking-tight">AI Receptionist Efficiency</h3>
            </div>
            <p className="text-xs text-gray-400">Automated query resolution vs. human intervention.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300 font-medium">Autonomous Resolution Rate</span>
                <span className="text-emerald-400 font-bold font-mono">85.6%</span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden p-0.5 border border-white/[0.05]">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full w-[85.6%]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300 font-medium">Avg Lead Capture Latency</span>
                <span className="text-violet-400 font-bold font-mono">1.2s</span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden p-0.5 border border-white/[0.05]">
                <div className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full w-[92%]" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300 font-medium">Sentiment Positivity Index</span>
                <span className="text-amber-400 font-bold font-mono">94.1%</span>
              </div>
              <div className="w-full bg-white/[0.05] h-2 rounded-full overflow-hidden p-0.5 border border-white/[0.05]">
                <div className="bg-gradient-to-r from-amber-500 to-orange-400 h-full rounded-full w-[94.1%]" />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 text-xs text-violet-200 flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-violet-400 shrink-0" />
              Model Gemini 2.5 Active
            </span>
            <button 
              onClick={() => onNavigate('receptionist')}
              className="text-violet-300 hover:text-white font-semibold underline text-xs cursor-pointer"
            >
              Tune Prompt →
            </button>
          </div>
        </div>
      </div>

      {/* Human Handoff Tickets Section */}
      <div className="bg-[#0a0b10]/80 border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold font-display text-white tracking-tight">
                Human Handoff Escalation Queue
              </h3>
            </div>
            <p className="text-xs text-gray-400">View, take over, and respond in real-time to active customer escalations.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('handoffs')}
              className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-violet-600/10 hover:bg-violet-600 hover:text-white text-violet-300 border border-violet-500/20 transition-all cursor-pointer"
            >
              <span>OPEN TICKETS: {openTicketCount}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="p-12 text-center bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-3 relative z-10">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-gray-300">All Escalation Tickets Cleared</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">When the AI receptionist encounters complex custom SLA or enterprise pricing queries, tickets automatically appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
            {tickets.map((ticket) => {
              const isOpen = ticket.status === 'open';
              return (
                <div 
                  key={ticket.id} 
                  className={`p-5 bg-white/[0.02] border rounded-2xl flex flex-col justify-between gap-4 transition-all duration-300 ${
                    isOpen 
                      ? 'border-white/[0.1] hover:border-violet-500/40 hover:bg-white/[0.04] shadow-lg' 
                      : 'border-emerald-500/15 bg-emerald-500/[0.01] opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-violet-400 tracking-wider uppercase block font-semibold">{ticket.id}</span>
                        <h4 className="text-sm font-bold text-white font-display truncate max-w-[160px]">{ticket.customerName}</h4>
                      </div>
                      <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wider backdrop-blur-md ${
                        ticket.priority === 'urgent' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse' :
                        ticket.priority === 'high' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                        'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs border-t border-white/[0.06] pt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium">Reason:</span>
                        <span className="text-gray-200 font-medium truncate max-w-[140px]" title={ticket.reason}>{ticket.reason}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium">Email:</span>
                        <span className="text-gray-300 font-mono truncate max-w-[140px]" title={ticket.email}>{ticket.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium">Phone:</span>
                        <span className="text-gray-300 font-mono truncate max-w-[140px]" title={ticket.phone}>{ticket.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-medium">Linked Lead:</span>
                        <span className="text-violet-300 font-mono font-semibold">{ticket.leadId || 'None'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
                    <span className="text-[10px] text-gray-400 font-mono">{new Date(ticket.createdTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <div className="flex items-center gap-2">
                      {isOpen ? (
                        <>
                          <button
                            onClick={() => {
                              localStorage.setItem('scaleflow_active_ticket_id', ticket.id);
                              // Mark notification of this ticket as read if matching
                              const savedNotifs = localStorage.getItem('scaleflow_notifications');
                              if (savedNotifs) {
                                try {
                                  const parsed = JSON.parse(savedNotifs);
                                  const updated = parsed.map((n: any) => n.ticketId === ticket.id ? { ...n, unread: false } : n);
                                  localStorage.setItem('scaleflow_notifications', JSON.stringify(updated));
                                } catch (e) {}
                              }
                              onNavigate('handoffs');
                            }}
                            className="text-xs bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white font-semibold px-3 py-1.5 border border-violet-500/30 hover:border-transparent rounded-xl transition-all cursor-pointer shadow-sm"
                          >
                            Reply & View
                          </button>
                          <button
                            onClick={() => handleResolveTicket(ticket.id)}
                            className="text-xs bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white font-semibold p-1.5 border border-emerald-500/20 hover:border-transparent rounded-xl transition-all cursor-pointer"
                            title="Mark as Resolved"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
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
      </div>

      {/* Ticket Reply Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0c14] border border-white/10 rounded-2xl w-full max-w-2xl h-[620px] flex flex-col overflow-hidden shadow-2xl relative animate-fade-in">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-violet-400 uppercase tracking-wider font-semibold">{selectedTicket.id} / Operator Override</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h3 className="text-base font-bold text-white font-display">Live Operator Console</h3>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase ${
                    selectedTicket.status === 'open' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {selectedTicket.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedTicket.status === 'open' ? (
                  <button
                    onClick={() => handleResolveTicket(selectedTicket.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-400 hover:text-white text-xs font-semibold border border-emerald-500/30 hover:border-transparent rounded-xl transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolve Ticket
                  </button>
                ) : (
                  <button
                    onClick={() => handleReopenTicket(selectedTicket.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-600 text-amber-400 hover:text-white text-xs font-semibold border border-amber-500/30 hover:border-transparent rounded-xl transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Re-open Ticket
                  </button>
                )}
                <button 
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-white p-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Customer Details Metadata Bar */}
            <div className="px-6 py-3 bg-white/[0.01] border-b border-white/[0.06] flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-medium">Customer:</span>
                <span className="text-white font-semibold">{selectedTicket.customerName}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-medium">Phone:</span>
                <span className="text-gray-300 font-mono">{selectedTicket.phone}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-medium">Email:</span>
                <span className="text-gray-300 font-mono">{selectedTicket.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 font-medium">Linked Lead:</span>
                {selectedTicket.leadId ? (
                  <button
                    onClick={() => {
                      setSelectedTicket(null);
                      onNavigate('leads');
                    }}
                    className="text-violet-400 hover:text-violet-300 font-mono font-semibold underline cursor-pointer"
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
                      <div className="px-3.5 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-xs text-gray-400 font-mono text-center max-w-lg shadow-sm">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                    <div className={`max-w-md rounded-2xl p-4 space-y-1 shadow-md ${
                      isAgent 
                        ? 'bg-white/[0.05] text-gray-200 rounded-tl-none border border-white/10' 
                        : 'bg-violet-600 text-white rounded-tr-none border border-violet-400/30'
                    }`}>
                      <div className="flex items-center justify-between gap-6 mb-1">
                        <span className="text-[10px] font-mono opacity-70 uppercase tracking-wider font-semibold">
                          {isAgent ? 'Human Representative' : 'Customer'}
                        </span>
                        <span className="text-[10px] font-mono opacity-60">{msg.timestamp}</span>
                      </div>
                      <p className="text-xs leading-relaxed font-sans whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={modalChatEndRef} />
            </div>

            {/* Send Reply Footer */}
            <div className="p-4 border-t border-white/[0.08] bg-white/[0.02]">
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
                    placeholder="Type response to customer..."
                    className="block flex-1 px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="p-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all border border-violet-400/30 flex-shrink-0 cursor-pointer shadow-lg shadow-violet-600/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="text-center py-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  This ticket has been marked as RESOLVED. Re-open ticket status to type responses.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Onboarding Checklist & Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Events logs - Taking up 2/3 space */}
        <div className="lg:col-span-2 bg-[#0a0b10]/80 border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold font-display text-white tracking-tight">Recent Activity Stream</h3>
              <p className="text-xs text-gray-400">Live transaction triggers and AI interactions processed by your node cluster.</p>
            </div>
            <button
              onClick={() => onNavigate('conversations')}
              className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>View full log</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentEvents.map((event) => (
              <div 
                key={event.id}
                className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-violet-500/30 hover:bg-white/[0.03] transition-all duration-300 flex items-start gap-4"
              >
                <div className={`p-2.5 rounded-xl border ${
                  event.type === 'call' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                  event.type === 'lead' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  event.type === 'sms' ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' : 'bg-gray-500/10 text-gray-300 border-gray-500/20'
                }`}>
                  {event.type === 'call' && <PhoneCall className="w-4 h-4" />}
                  {event.type === 'lead' && <Users className="w-4 h-4" />}
                  {event.type === 'sms' && <Bot className="w-4 h-4" />}
                  {event.type === 'system' && <Activity className="w-4 h-4" />}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-white truncate">{event.title}</p>
                    <span className="text-[10px] text-gray-400 font-mono whitespace-nowrap">{event.time}</span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono truncate">{event.meta}</p>
                </div>

                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wider backdrop-blur-md ${
                  event.status === 'Qualified' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  event.status === 'Answered' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                  event.status === 'Replied' ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}>
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Setup Onboarding Checklist - Taking up 1/3 space */}
        <div className="bg-[#0a0b10]/80 border border-white/[0.08] rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-xl flex flex-col justify-between">
          <div className="space-y-6">
            <div className="border-b border-white/[0.06] pb-4 space-y-1">
              <h3 className="text-base font-bold font-display text-white tracking-tight">Onboarding Milestones</h3>
              <p className="text-xs text-gray-400">Configure core endpoints to complete workspace launch.</p>
            </div>

            <div className="space-y-3">
              {milestones.map((step) => (
                <div 
                  key={step.id} 
                  className={`p-3.5 rounded-xl border flex items-start gap-3.5 transition-all duration-300 ${
                    step.status === 'completed' 
                      ? 'bg-violet-500/5 border-violet-500/20' 
                      : 'bg-white/[0.02] border-white/[0.06]'
                  }`}
                >
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5 hover:text-violet-400 transition-colors cursor-pointer" />
                  )}
                  
                  <div className="space-y-0.5">
                    <p className={`text-xs font-semibold ${
                      step.status === 'completed' ? 'text-white' : 'text-gray-300'
                    }`}>{step.title}</p>
                    <p className="text-xs text-gray-400">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Support Module */}
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between text-xs text-gray-300 mt-4">
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-violet-400" />
              Need deployment help?
            </span>
            <a href="#docs" className="font-semibold text-violet-400 hover:text-violet-300 transition-colors">
              Read Docs →
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
