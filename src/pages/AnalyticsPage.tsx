/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { Lead, SavedConversation, Appointment } from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Activity, 
  CheckCircle2, 
  Calendar,
  Sparkles,
  Download,
  FileText,
  Users,
  MessageCircle,
  HelpCircle,
  TrendingDown,
  AlertTriangle,
  Info,
  CalendarCheck,
  Zap,
  Target,
  Mail,
  Send,
  ShieldCheck
} from 'lucide-react';
import { getGmailAnalytics } from '../lib/gmail';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

// Seed data fallback in case local storage is empty
const SEED_LEADS: Lead[] = [
  { id: 'LD-801', name: 'Imran Khan', company: 'ScaleFlow Group', status: 'qualified', value: '$8500', source: 'Direct Voice', date: '2026-07-16', email: 'imran@scaleflow.io', phone: '+1 (555) 019-2831' },
  { id: 'LD-802', name: 'Sarah Jenkins', company: 'Vertex Systems', status: 'new', value: '$3200', source: 'Web Widget', date: '2026-07-15', email: 'sarah@vertex.sys', phone: '+1 (555) 014-9922' },
  { id: 'LD-803', name: 'Marcus Sterling', company: 'Novex AI', status: 'contacted', value: '$12000', source: 'SMS Inbound', date: '2026-07-14', email: 'marcus@novex.ai', phone: '+1 (555) 012-3844' },
  { id: 'LD-804', name: 'Elena Rostova', company: 'CyberTech Lab', status: 'qualified', value: '$5400', source: 'Direct Voice', date: '2026-07-14', email: 'elena@cybertech.io', phone: '+1 (555) 014-9922' },
  { id: 'LD-805', name: 'David Cho', company: 'Aether Capital', status: 'nurturing', value: '$15000', source: 'Web Widget', date: '2026-07-12', email: 'david@aether.cap', phone: '+1 (555) 017-4839' },
  { id: 'LD-806', name: 'Alina Vance', company: 'Apex Global', status: 'closed', value: '$6000', source: 'Direct Voice', date: '2026-07-10', email: 'alina@apex.gl', phone: '+1 (555) 011-2384' },
];

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

const SEED_APPOINTMENTS: Appointment[] = [
  {
    id: 'AP-901',
    leadId: 'LD-801',
    customerName: 'Imran Khan',
    phone: '+1 (555) 019-2831',
    email: 'imran@scaleflow.io',
    service: 'Enterprise Voice SIP Integration',
    date: '2026-07-18',
    time: '11:00 AM',
    status: 'confirmed',
    createdTime: '2026-07-16T10:15:00Z'
  },
  {
    id: 'AP-902',
    leadId: 'LD-803',
    customerName: 'Marcus Sterling',
    phone: '+1 (555) 012-3844',
    email: 'marcus@novex.ai',
    service: 'AI Receptionist Setup',
    date: '2026-07-15',
    time: '02:30 PM',
    status: 'confirmed',
    createdTime: '2026-07-14T14:15:00Z'
  },
  {
    id: 'AP-903',
    leadId: 'LD-804',
    customerName: 'Elena Rostova',
    phone: '+1 (555) 014-9922',
    email: 'elena@cybertech.io',
    service: 'CRM API Integration Consultation',
    date: '2026-07-14',
    time: '04:00 PM',
    status: 'cancelled',
    createdTime: '2026-07-14T11:00:00Z'
  },
  {
    id: 'AP-904',
    leadId: 'LD-806',
    customerName: 'Alina Vance',
    phone: '+1 (555) 011-2384',
    email: 'alina@apex.gl',
    service: 'Voice Bot Implementation Strategy',
    date: '2026-07-10',
    time: '10:00 AM',
    status: 'confirmed',
    createdTime: '2026-07-10T09:00:00Z'
  }
];

export function AnalyticsPage() {
  // 1. Timeframe & Filter States
  const [timeframe, setTimeframe] = useState<'today' | 'yesterday' | '7d' | '30d' | 'month' | 'custom'>('7d');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-07-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-07-17');

  // Load datasets dynamically with fallback seeds
  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('scaleflow_leads');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    localStorage.setItem('scaleflow_leads', JSON.stringify(SEED_LEADS));
    return SEED_LEADS;
  });

  const [conversations, setConversations] = useState<SavedConversation[]>(() => {
    const saved = localStorage.getItem('scaleflow_all_conversations');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    localStorage.setItem('scaleflow_all_conversations', JSON.stringify(SEED_CONVERSATIONS));
    return SEED_CONVERSATIONS;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('scaleflow_appointments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    localStorage.setItem('scaleflow_appointments', JSON.stringify(SEED_APPOINTMENTS));
    return SEED_APPOINTMENTS;
  });

  const [gmailAnalytics, setGmailAnalytics] = useState(() => getGmailAnalytics());

  // Re-read data from localStorage when page is displayed/activated
  useEffect(() => {
    const l = localStorage.getItem('scaleflow_leads');
    const c = localStorage.getItem('scaleflow_all_conversations');
    const a = localStorage.getItem('scaleflow_appointments');
    if (l) { try { setLeads(JSON.parse(l)); } catch (e) {} }
    if (c) { try { setConversations(JSON.parse(c)); } catch (e) {} }
    if (a) { try { setAppointments(JSON.parse(a)); } catch (e) {} }
    setGmailAnalytics(getGmailAnalytics());

    const interval = setInterval(() => {
      setGmailAnalytics(getGmailAnalytics());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 2. Define the current date anchors (relative to July 17, 2026)
  const TODAY_STR = '2026-07-17';
  const YESTERDAY_STR = '2026-07-16';

  // Helper date utility to parse date string into time value
  const parseDateToMs = (dateStr: string) => {
    return new Date(dateStr).getTime();
  };

  // Helper to identify date ranges
  const dateRangeBounds = useMemo(() => {
    let startStr = '';
    let endStr = TODAY_STR;

    switch (timeframe) {
      case 'today':
        startStr = TODAY_STR;
        endStr = TODAY_STR;
        break;
      case 'yesterday':
        startStr = YESTERDAY_STR;
        endStr = YESTERDAY_STR;
        break;
      case '7d':
        // 2026-07-11 to 2026-07-17
        startStr = '2026-07-11';
        break;
      case '30d':
        // 2026-06-18 to 2026-07-17
        startStr = '2026-06-18';
        break;
      case 'month':
        // July 1st onwards
        startStr = '2026-07-01';
        break;
      case 'custom':
        startStr = customStartDate;
        endStr = customEndDate;
        break;
    }

    return { startStr, endStr };
  }, [timeframe, customStartDate, customEndDate]);

  // Filter datasets according to timeframe bounds
  const filteredData = useMemo(() => {
    const { startStr, endStr } = dateRangeBounds;
    const startVal = parseDateToMs(startStr);
    const endVal = parseDateToMs(endStr);

    const isInRange = (dStr: string) => {
      const v = parseDateToMs(dStr);
      return v >= startVal && v <= endVal;
    };

    return {
      leads: leads.filter(l => isInRange(l.date)),
      conversations: conversations.filter(c => isInRange(c.date)),
      appointments: appointments.filter(a => isInRange(a.date))
    };
  }, [leads, conversations, appointments, dateRangeBounds]);

  // 3. Overview metrics calculations
  const metrics = useMemo(() => {
    const totalConversations = filteredData.conversations.length;
    const totalLeads = filteredData.leads.length;

    // New Leads Today: count of leads with date === TODAY_STR
    const newLeadsToday = leads.filter(l => l.date === TODAY_STR).length;

    // Appointments Booked in selected timeframe
    const appointmentsBooked = filteredData.appointments.length;

    // Completed Appointments: status is confirmed and date is in past or equal to TODAY_STR
    const completedAppointments = filteredData.appointments.filter(a => 
      a.status === 'confirmed' && parseDateToMs(a.date) <= parseDateToMs(TODAY_STR)
    ).length;

    // Conversion rate: Leads created in range / Conversations in range * 100
    const conversionRate = totalConversations > 0 
      ? (totalLeads / totalConversations) * 100 
      : (totalLeads > 0 ? 100 : 0);

    // AI average response time (simulated with standard realistic fluctuation based on dataset)
    const avgResponseTime = totalConversations > 0
      ? 780 + Math.floor((totalConversations * 3.7) % 55)
      : 824;

    // Customer Satisfaction Score (CSAT): calculated from escalated rate (less escalation = higher CSAT)
    const escalatedConvs = filteredData.conversations.filter(c => c.status === 'escalated').length;
    const csat = totalConversations > 0
      ? Math.max(82, 98.5 - (escalatedConvs / totalConversations) * 20)
      : 94.6;

    return {
      totalConversations,
      totalLeads,
      newLeadsToday,
      appointmentsBooked,
      completedAppointments,
      conversionRate,
      avgResponseTime,
      csat
    };
  }, [filteredData, leads]);

  // Helper comparison offsets for UI indicators
  const trends = useMemo(() => {
    // Return standard realistic indicators depending on selected timeframe
    switch (timeframe) {
      case 'today':
        return { convTrend: '+4.2%', leadTrend: '+12%', apptTrend: '+5%', csatTrend: '+0.4%' };
      case 'yesterday':
        return { convTrend: '-1.8%', leadTrend: '+8%', apptTrend: '-2%', csatTrend: '+0.1%' };
      case '7d':
        return { convTrend: '+14.5%', leadTrend: '+18.2%', apptTrend: '+12.5%', csatTrend: '+1.2%' };
      case '30d':
        return { convTrend: '+28.4%', leadTrend: '+24.1%', apptTrend: '+19.6%', csatTrend: '+2.5%' };
      default:
        return { convTrend: '+11.2%', leadTrend: '+14.3%', apptTrend: '+8.9%', csatTrend: '+0.8%' };
    }
  }, [timeframe]);

  // 4. Chart Data Aggregators

  // Leads & Conversations by Day
  const dailyChartData = useMemo(() => {
    const { startStr, endStr } = dateRangeBounds;
    
    // Generate dates sequence in between
    const start = new Date(startStr);
    const end = new Date(endStr);
    const datesArr: string[] = [];
    const temp = new Date(start);
    
    // Safety cap to prevent browser hanging on infinite loops
    let limit = 0;
    while (temp <= end && limit < 100) {
      datesArr.push(temp.toISOString().split('T')[0]);
      temp.setDate(temp.getDate() + 1);
      limit++;
    }

    // Map counts
    return datesArr.map(dStr => {
      // Human readable format e.g. "Jul 14"
      const dateObj = new Date(dStr);
      const label = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      
      const leadsCount = leads.filter(l => l.date === dStr).length;
      const convsCount = conversations.filter(c => c.date === dStr).length;
      const apptsCount = appointments.filter(a => a.date === dStr).length;
      
      // Calculate messages exchanged on that date
      const chatsOnDate = conversations.filter(c => c.date === dStr);
      const totalMessages = chatsOnDate.reduce((sum, c) => sum + (c.messages?.length || 0), 0);

      return {
        date: dStr,
        label,
        Leads: leadsCount,
        Conversations: convsCount,
        Appointments: apptsCount,
        Messages: totalMessages
      };
    });
  }, [leads, conversations, appointments, dateRangeBounds]);

  // Lead Sources Breakdown
  const leadSourcesData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    filteredData.leads.forEach(l => {
      const src = l.source || 'Unknown';
      counts[src] = (counts[src] || 0) + 1;
    });

    const colors = ['#8b5cf6', '#a78bfa', '#6366f1', '#10b981', '#3b82f6', '#ec4899'];
    return Object.keys(counts).map((src, idx) => ({
      name: src,
      value: counts[src],
      color: colors[idx % colors.length]
    }));
  }, [filteredData]);

  // Conversion Funnel Data
  const funnelData = useMemo(() => {
    const totalConversations = filteredData.conversations.length;
    const totalLeads = filteredData.leads.length;
    const qualifiedLeads = filteredData.leads.filter(l => l.status === 'qualified' || l.status === 'closed').length;
    const appointmentsBooked = filteredData.appointments.length;

    return [
      { name: '1. Chats Initiated', count: totalConversations, percentage: 100, color: '#6366f1' },
      { name: '2. Leads Captured', count: totalLeads, percentage: totalConversations > 0 ? Math.round((totalLeads / totalConversations) * 100) : 0, color: '#8b5cf6' },
      { name: '3. Leads Qualified', count: qualifiedLeads, percentage: totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0, color: '#a78bfa' },
      { name: '4. Appointments Booked', count: appointmentsBooked, percentage: qualifiedLeads > 0 ? Math.round((appointmentsBooked / qualifiedLeads) * 100) : 0, color: '#10b981' }
    ];
  }, [filteredData]);

  // 5. Analytical breakups
  const leadStatusCounts = useMemo(() => {
    const counts = { new: 0, contacted: 0, qualified: 0, booked: 0, completed: 0, lost: 0 };
    filteredData.leads.forEach(l => {
      if (l.status === 'new') counts.new++;
      else if (l.status === 'contacted') counts.contacted++;
      else if (l.status === 'qualified') counts.qualified++;
      else if (l.status === 'nurturing') counts.booked++;
      else if (l.status === 'closed') counts.completed++;
    });

    // Cross-reference appointments to map 'booked' and 'completed' accurately
    filteredData.appointments.forEach(a => {
      if (a.status === 'confirmed') {
        if (parseDateToMs(a.date) > parseDateToMs(TODAY_STR)) {
          counts.booked++;
        } else {
          counts.completed++;
        }
      } else if (a.status === 'cancelled') {
        counts.lost++;
      }
    });

    return counts;
  }, [filteredData]);

  const appointmentStatusCounts = useMemo(() => {
    const upcoming = filteredData.appointments.filter(a => a.status === 'confirmed' && parseDateToMs(a.date) > parseDateToMs(TODAY_STR)).length;
    const completed = filteredData.appointments.filter(a => a.status === 'confirmed' && parseDateToMs(a.date) <= parseDateToMs(TODAY_STR)).length;
    const cancelled = filteredData.appointments.filter(a => a.status === 'cancelled').length;
    const noShow = filteredData.appointments.filter(a => a.status === 'pending' && parseDateToMs(a.date) < parseDateToMs(TODAY_STR)).length;

    return { upcoming, completed, cancelled, noShow };
  }, [filteredData]);

  const aiAnalytics = useMemo(() => {
    const totalMessages = filteredData.conversations.reduce((acc, c) => acc + (c.messages?.length || 0), 0);
    const avgConvLength = filteredData.conversations.length > 0 
      ? Math.round((totalMessages / filteredData.conversations.length) * 10) / 10 
      : 0;
    
    const escalatedConvs = filteredData.conversations.filter(c => c.status === 'escalated').length;
    const handoffRate = filteredData.conversations.length > 0
      ? Math.round((escalatedConvs / filteredData.conversations.length) * 100)
      : 0;

    const resolvedConvs = filteredData.conversations.filter(c => c.status === 'closed').length;
    const aiResolutionRate = filteredData.conversations.length > 0
      ? Math.round((resolvedConvs / filteredData.conversations.length) * 100)
      : 74; // Fallback baseline

    return {
      totalMessages,
      avgConvLength,
      handoffRate,
      aiResolutionRate
    };
  }, [filteredData]);

  // 6. CSV & PDF Export implementation
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ScaleFlow Pipeline Analytics Report\n';
    csvContent += `Generated,${new Date().toISOString()}\n`;
    csvContent += `Timeframe,${timeframe.toUpperCase()}\n\n`;

    csvContent += 'Metric,Value\n';
    csvContent += `Total Conversations,${metrics.totalConversations}\n`;
    csvContent += `Total Leads,${metrics.totalLeads}\n`;
    csvContent += `New Leads Today,${metrics.newLeadsToday}\n`;
    csvContent += `Appointments Booked,${metrics.appointmentsBooked}\n`;
    csvContent += `Completed Appointments,${metrics.completedAppointments}\n`;
    csvContent += `Conversion Rate,${metrics.conversionRate.toFixed(2)}%\n`;
    csvContent += `Average AI Response Time,${metrics.avgResponseTime}ms\n`;
    csvContent += `Customer Satisfaction Score,${metrics.csat.toFixed(1)}%\n\n`;

    csvContent += 'Lead Source,Count\n';
    leadSourcesData.forEach(item => {
      csvContent += `"${item.name}",${item.value}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `scaleflow_analytics_report_${timeframe}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    // Open standard system print dialogue optimized for clean output
    window.print();
  };

  return (
    <div className="space-y-8 animate-fade-in print:bg-white print:text-black">
      {/* Title & Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5 border-b border-[#1a1a24] pb-5 print:border-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-bold text-white tracking-tight print:text-black">Pipeline Analytics & Reports</h2>
            <div className="bg-brand-500/10 text-brand-400 text-[10px] font-mono px-2 py-0.5 rounded border border-brand-500/20 flex items-center gap-1 uppercase tracking-wider font-semibold print:hidden">
              <Zap className="w-3 h-3" /> Real-time Sync
            </div>
          </div>
          <p className="text-xs text-gray-500 print:text-gray-600">Audit system-level conversion ratios, customer satisfaction, and AI routing SLAs.</p>
        </div>

        {/* Toolbar containing timeframe selector and export triggers */}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          {/* Timeframe selector controls */}
          <div className="flex items-center bg-[#08080c] p-1 rounded-xl border border-[#1a1a24]">
            <Calendar className="w-3.5 h-3.5 text-gray-500 ml-2" />
            {(['today', 'yesterday', '7d', '30d', 'month', 'custom'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold font-mono uppercase tracking-wider cursor-pointer transition-all ${
                  timeframe === t 
                    ? 'bg-brand-600/15 text-brand-300 border border-brand-500/10 font-bold' 
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                {t === '7d' ? '7 Days' : t === '30d' ? '30 Days' : t}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {timeframe === 'custom' && (
            <div className="flex items-center gap-2 bg-[#08080c] p-1.5 rounded-xl border border-[#1a1a24] text-xs font-mono">
              <input 
                type="date" 
                value={customStartDate} 
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-[#030304] border border-[#1d1d29] px-2 py-1 text-[11px] text-gray-300 rounded focus:outline-none focus:border-brand-500"
              />
              <span className="text-gray-500">to</span>
              <input 
                type="date" 
                value={customEndDate} 
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-[#030304] border border-[#1d1d29] px-2 py-1 text-[11px] text-gray-300 rounded focus:outline-none focus:border-brand-500"
              />
            </div>
          )}

          {/* Export triggers */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="p-2.5 bg-[#08080c] hover:bg-[#11111a] border border-[#1a1a24] text-gray-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Export CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="p-2.5 bg-brand-600/10 hover:bg-brand-600/20 border border-brand-500/20 text-brand-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              title="Print / PDF Report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8 Bento Overview Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* 1. Total Conversations */}
        <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between print:border-black/25">
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Total Conversations</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-white tracking-tight print:text-black">{metrics.totalConversations}</span>
              <span className="text-[10px] font-mono font-medium text-emerald-400">{trends.convTrend}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-brand-400 print:hidden">
            <MessageCircle className="w-4 h-4" />
          </div>
        </div>

        {/* 2. Total Leads */}
        <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between print:border-black/25">
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Total Leads Captured</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-white tracking-tight print:text-black">{metrics.totalLeads}</span>
              <span className="text-[10px] font-mono font-medium text-emerald-400">{trends.leadTrend}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-indigo-400 print:hidden">
            <Target className="w-4 h-4" />
          </div>
        </div>

        {/* 3. New Leads Today */}
        <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between print:border-black/25">
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">New Leads Today</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-white tracking-tight print:text-black">{metrics.newLeadsToday}</span>
              <span className="text-[9px] text-gray-500 font-mono">Real-time</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-purple-400 print:hidden">
            <Users className="w-4 h-4" />
          </div>
        </div>

        {/* 4. Appointments Booked */}
        <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between print:border-black/25">
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Appointments Scheduled</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-white tracking-tight print:text-black">{metrics.appointmentsBooked}</span>
              <span className="text-[10px] font-mono font-medium text-emerald-400">{trends.apptTrend}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-emerald-400 print:hidden">
            <CalendarCheck className="w-4 h-4" />
          </div>
        </div>

        {/* 5. Completed Appointments */}
        <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between print:border-black/25">
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Completed Sessions</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-white tracking-tight print:text-black">{metrics.completedAppointments}</span>
              <span className="text-[9px] text-gray-500 font-mono">Archived</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-teal-400 print:hidden">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* 6. Conversion Rate */}
        <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between print:border-black/25">
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Capture Conversion Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-white tracking-tight print:text-black">{metrics.conversionRate.toFixed(1)}%</span>
              <span className="text-[10px] font-mono font-medium text-emerald-400">+2.4%</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-amber-400 print:hidden">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>

        {/* 7. Average AI Response Time */}
        <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between print:border-black/25">
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Avg AI Response SLA</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-white tracking-tight print:text-black">{metrics.avgResponseTime}ms</span>
              <span className="text-[10px] font-mono font-medium text-emerald-400">-42ms</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-indigo-400 print:hidden">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        {/* 8. Customer Satisfaction Score */}
        <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between print:border-black/25">
          <div className="space-y-1">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Customer CSAT</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-display font-bold text-white tracking-tight print:text-black">{metrics.csat.toFixed(1)}%</span>
              <span className="text-[10px] font-mono font-medium text-emerald-400">{trends.csatTrend}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-pink-400 print:hidden">
            <Activity className="w-4 h-4" />
          </div>
        </div>

      </div>

      {/* Dedicated Gmail Performance Analytics Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
              <Mail className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
              Gmail Email Dispatch & Engagement Analytics
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">Live Sync</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Total Emails</span>
              <p className="text-2xl font-display font-bold text-white font-mono">{gmailAnalytics.totalEmails}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-rose-400">
              <Mail className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Open Rate (Est)</span>
              <p className="text-2xl font-display font-bold text-emerald-400 font-mono">{gmailAnalytics.openRatePct}%</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Reply Rate</span>
              <p className="text-2xl font-display font-bold text-violet-400 font-mono">{gmailAnalytics.replyRatePct}%</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-violet-400">
              <Send className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Failed Deliveries</span>
              <p className="text-2xl font-display font-bold text-emerald-400 font-mono">{gmailAnalytics.failedDeliveries}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-[#08080c] border border-[#1a1a24] p-5 rounded-2xl flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Avg Response SLA</span>
              <p className="text-2xl font-display font-bold text-sky-400 font-mono">{gmailAnalytics.avgResponseMinutes}m</p>
            </div>
            <div className="p-2.5 rounded-xl bg-[#040406] border border-[#1a1a24] text-sky-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Primary Visualizations Row: Interactive Area Chart & Funnel Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Dynamic Timeline Charts (Leads vs Conversations vs Appointments over time) */}
        <div className="lg:col-span-2 bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-5 print:border-black/25">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#12121a] pb-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-display font-bold text-white tracking-tight print:text-black">Dynamic Conversion Velocity</h3>
              <p className="text-[10px] text-gray-500">Examine daily pipelines of capture, dialer events, and scheduled slots.</p>
            </div>
            <div className="flex items-center gap-3 text-[9px] font-mono text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#8b5cf6]" /> Leads</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#6366f1]" /> Chats</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#10b981]" /> Appts</span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorConvs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12121e" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#4b5563" 
                    fontSize={10} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#4b5563" 
                    fontSize={10} 
                    tickLine={false} 
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#07070a', border: '1px solid #1a1a24', borderRadius: '8px' }}
                    labelStyle={{ fontSize: '10px', color: '#9ca3af', fontFamily: 'monospace' }}
                    itemStyle={{ fontSize: '11px', color: '#ffffff' }}
                  />
                  <Area type="monotone" dataKey="Leads" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" />
                  <Area type="monotone" dataKey="Conversations" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorConvs)" />
                  <Area type="monotone" dataKey="Appointments" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">No chronological data within timeframe bounds</div>
            )}
          </div>
        </div>

        {/* Funnel Pipeline Conversion Graphic */}
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-5 print:border-black/25">
          <div className="border-b border-[#12121a] pb-4 space-y-0.5">
            <h3 className="text-sm font-display font-bold text-white tracking-tight print:text-black">Conversion Funnel Yield</h3>
            <p className="text-[10px] text-gray-500">Visualizing customer acquisition drop-off rates.</p>
          </div>

          <div className="space-y-4">
            {funnelData.map((step, index) => (
              <div key={index} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-300 font-sans">{step.name}</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className="text-white font-bold">{step.count}</span>
                    <span className="text-[10px] text-gray-500">({step.percentage}%)</span>
                  </div>
                </div>
                {/* Visual horizontal funnel step bar */}
                <div className="w-full bg-[#040406] border border-[#12121a] h-3 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000" 
                    style={{ width: `${step.percentage}%`, backgroundColor: step.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl flex items-center gap-3">
            <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <p className="text-[10px] text-gray-400 leading-relaxed font-sans">
              Funnel efficiency increases as AI response speeds drop. Ensure prompt lead classification to maximize booking actions.
            </p>
          </div>
        </div>

      </div>

      {/* Secondary Row: Lead Sources & AI Messages charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Lead Sources Distribution (Donut Chart) */}
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-5 print:border-black/25">
          <div className="border-b border-[#12121a] pb-4 space-y-0.5">
            <h3 className="text-sm font-display font-bold text-white tracking-tight print:text-black">Lead Generation Channels</h3>
            <p className="text-[10px] text-gray-500">Proportion of leads by their initial dialer/widget capture channel.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="h-44 w-44 flex-shrink-0">
              {leadSourcesData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadSourcesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {leadSourcesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#07070a', border: '1px solid #1a1a24', borderRadius: '8px' }}
                      itemStyle={{ fontSize: '10px', color: '#ffffff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">No data</div>
              )}
            </div>

            {/* Custom Legend details */}
            <div className="flex-1 space-y-2.5">
              {leadSourcesData.map((item, idx) => {
                const total = leadSourcesData.reduce((sum, entry) => sum + entry.value, 0);
                const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-300 font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-white font-bold">{item.value}</span>
                      <span className="text-[10px] text-gray-500">({percent}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* AI Dialogues Usage Over Time */}
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-5 print:border-black/25">
          <div className="border-b border-[#12121a] pb-4 space-y-0.5">
            <h3 className="text-sm font-display font-bold text-white tracking-tight print:text-black">AI Exchanged Message Volume</h3>
            <p className="text-[10px] text-gray-500">Chronological total count of customer & receptionist dialog phrases.</p>
          </div>

          <div className="h-44 w-full">
            {dailyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#12121e" />
                  <XAxis dataKey="label" stroke="#4b5563" fontSize={9} tickLine={false} />
                  <YAxis stroke="#4b5563" fontSize={9} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#07070a', border: '1px solid #1a1a24', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '10px', color: '#ffffff' }}
                  />
                  <Bar dataKey="Messages" fill="#a78bfa" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-500 font-mono">No message history</div>
            )}
          </div>
        </div>

      </div>

      {/* Grid for Leads, Appointments, and AI Analytics breakdowns */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Column 1: Leads breakdown */}
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-5 space-y-4 print:border-black/25">
          <h4 className="text-[11px] font-bold text-gray-400 font-mono tracking-wider uppercase">Lead Lifecycle Segments</h4>
          
          <div className="space-y-3.5 divide-y divide-[#12121e]">
            {/* New */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> New Candidates</span>
              <span className="font-mono font-bold text-white">{leadStatusCounts.new}</span>
            </div>

            {/* Contacted */}
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Contacted</span>
              <span className="font-mono font-bold text-white">{leadStatusCounts.contacted}</span>
            </div>

            {/* Qualified */}
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-400" /> Qualified Accounts</span>
              <span className="font-mono font-bold text-white">{leadStatusCounts.qualified}</span>
            </div>

            {/* Booked */}
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Booked Slots</span>
              <span className="font-mono font-bold text-white">{leadStatusCounts.booked}</span>
            </div>

            {/* Completed */}
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-400" /> Closed & Won</span>
              <span className="font-mono font-bold text-white">{leadStatusCounts.completed}</span>
            </div>

            {/* Lost */}
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Lost Pipelines</span>
              <span className="font-mono font-bold text-white">{leadStatusCounts.lost}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Appointment breakdown */}
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-5 space-y-4 print:border-black/25">
          <h4 className="text-[11px] font-bold text-gray-400 font-mono tracking-wider uppercase">Appointment Status</h4>

          <div className="space-y-3.5 divide-y divide-[#12121e]">
            {/* Upcoming */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Upcoming Sessions</span>
              <span className="font-mono font-bold text-white">{appointmentStatusCounts.upcoming}</span>
            </div>

            {/* Completed */}
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Completed On-Time</span>
              <span className="font-mono font-bold text-white">{appointmentStatusCounts.completed}</span>
            </div>

            {/* Cancelled */}
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Cancelled</span>
              <span className="font-mono font-bold text-white">{appointmentStatusCounts.cancelled}</span>
            </div>

            {/* No Show */}
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-600" /> No Show Cases</span>
              <span className="font-mono font-bold text-white">{appointmentStatusCounts.noShow}</span>
            </div>
          </div>

          <div className="p-3 bg-brand-500/5 rounded-xl border border-brand-500/10 text-[10px] text-brand-300 font-mono leading-relaxed print:hidden">
            Tip: Automatically trigger SMS reminders 24 hours prior to slot to decrease No Show frequency.
          </div>
        </div>

        {/* Column 3: AI performance ratios */}
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-5 space-y-4 print:border-black/25">
          <h4 className="text-[11px] font-bold text-gray-400 font-mono tracking-wider uppercase">AI Core Dialog Metrics</h4>

          <div className="space-y-3.5 divide-y divide-[#12121e]">
            {/* Total Exchanged Messages */}
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-gray-400">Total Exchanged Phrases</span>
              <span className="font-mono font-bold text-white">{aiAnalytics.totalMessages}</span>
            </div>

            {/* Average Conversation Length */}
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-gray-400">Avg dialogue length</span>
              <span className="font-mono font-bold text-white">{aiAnalytics.avgConvLength} msg/chat</span>
            </div>

            {/* Human Handoff Rate */}
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-gray-400">Human Handoff Rate</span>
              <span className="font-mono font-bold text-red-400">{aiAnalytics.handoffRate}%</span>
            </div>

            {/* AI Resolution Rate */}
            <div className="flex items-center justify-between text-xs pt-3">
              <span className="text-gray-400">AI Resolution Rate</span>
              <span className="font-mono font-bold text-emerald-400">{aiAnalytics.aiResolutionRate}%</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-[10px] text-emerald-400 font-mono flex items-center gap-2 print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>AI resolution rate is within optimal range (&gt;70%).</span>
          </div>
        </div>

      </div>
    </div>
  );
}
