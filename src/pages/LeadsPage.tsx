/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Lead } from '../types';
import { syncLeadToGoogleSheets } from '../lib/googleSheets';
import { 
  Target, 
  Search, 
  Download, 
  Plus, 
  ArrowUpRight, 
  Trash2,
  X,
  Bot,
  User,
  Calendar,
  Mail,
  Phone,
  MessageSquare,
  Check,
  Building2,
  Clock
} from 'lucide-react';

export function LeadsPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // --- Local Toasts notification state ---
  const [toasts, setToasts] = useState<{ id: string; text: string; type: 'success' | 'error' }[]>([]);

  const addToast = (text: string, type: 'success' | 'error' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // --- Manual Lead Creation modal state ---
  const [showAddModal, setShowAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formStatus, setFormStatus] = useState<'new' | 'contacted' | 'qualified' | 'nurturing' | 'closed'>('new');
  const [formService, setFormService] = useState('');
  const [formMessage, setFormMessage] = useState('');

  const [appointments] = useState<any[]>(() => {
    const saved = localStorage.getItem('scaleflow_appointments');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {}
    }
    return [];
  });

  const activeLinkedAppt = selectedLead ? appointments.find(a => a.leadId === selectedLead.id) : null;

  const initialLeads: Lead[] = [
    { id: 'LD-801', name: 'Imran Khan', company: 'ScaleFlow Group', status: 'qualified', value: '$8,500/mo', source: 'Direct Voice', date: '2026-07-16', email: 'imrankhan.scaleflow@gmail.com', phone: '+15550192831' },
    { id: 'LD-802', name: 'Sarah Jenkins', company: 'Vertex Systems', status: 'new', value: '$3,200/mo', source: 'Web Widget', date: '2026-07-15' },
    { id: 'LD-803', name: 'Marcus Sterling', company: 'Novex AI', status: 'contacted', value: '$12,000/mo', source: 'SMS Inbound', date: '2026-07-14' },
    { id: 'LD-804', name: 'Elena Rostova', company: 'CyberTech Lab', status: 'qualified', value: '$5,400/mo', source: 'Direct Voice', date: '2026-07-14' },
    { id: 'LD-805', name: 'David Cho', company: 'Aether Capital', status: 'nurturing', value: '$15,000/mo', source: 'Web Widget', date: '2026-07-12' },
    { id: 'LD-806', name: 'Alina Vance', company: 'Apex Global', status: 'closed', value: '$6,000/mo', source: 'Direct Voice', date: '2026-07-10' },
  ];

  const [leads, setLeads] = useState<Lead[]>(() => {
    const saved = localStorage.getItem('scaleflow_leads');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Error parsing saved leads:", err);
      }
    }
    return initialLeads;
  });

  // Export Filtered Leads to CSV
  const handleExportCSV = () => {
    if (filteredLeads.length === 0) {
      addToast('No leads available to export.', 'error');
      return;
    }
    const headers = ['ID', 'Name', 'Company', 'Status', 'Estimated Value', 'Source', 'Date Logged', 'Email', 'Phone', 'Service', 'Message'];
    const rows = filteredLeads.map(l => [
      l.id,
      l.name,
      l.company,
      l.status,
      l.value,
      l.source,
      l.date,
      l.email || '',
      l.phone || '',
      l.service || '',
      (l.message || '').replace(/"/g, '""')
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `scaleflow_leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Leads exported to CSV successfully!', 'success');
  };

  // Submit and Validate Manual Lead Creation
  const handleCreateLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate mandatory fields
    if (!formName.trim() || !formCompany.trim()) {
      addToast('Name and Company fields are strictly required.', 'error');
      return;
    }

    // 2. Validate email format
    if (formEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formEmail.trim())) {
        addToast('Invalid email address format.', 'error');
        return;
      }
    }

    // 3. Validate phone format (simple digits check if provided)
    if (formPhone.trim()) {
      const cleanPhone = formPhone.replace(/[^0-9+]/g, '');
      if (cleanPhone.length < 7) {
        addToast('Invalid phone number format.', 'error');
        return;
      }
    }

    // 4. Validate and format Contract Value
    let formattedValue = formValue.trim();
    if (!formattedValue) {
      formattedValue = '$0/mo';
    } else {
      if (!formattedValue.startsWith('$')) {
        formattedValue = '$' + formattedValue;
      }
      if (!formattedValue.endsWith('/mo') && !formattedValue.toLowerCase().endsWith('total')) {
        formattedValue = formattedValue + '/mo';
      }
    }

    // 5. Check duplicate lead (prevent duplicate email/phone)
    const isDuplicate = leads.some(l => {
      const matchesEmail = formEmail.trim() && l.email && l.email.toLowerCase() === formEmail.trim().toLowerCase();
      const matchesPhone = formPhone.trim() && l.phone && l.phone.replace(/[^0-9]/g, '') === formPhone.replace(/[^0-9]/g, '');
      return matchesEmail || matchesPhone;
    });

    if (isDuplicate) {
      addToast('A lead with this email or phone number already exists in CRM.', 'error');
      return;
    }

    // 6. Assemble new lead
    const newLead: Lead = {
      id: `LD-${Math.floor(100 + Math.random() * 900)}`,
      name: formName.trim(),
      company: formCompany.trim(),
      email: formEmail.trim() || undefined,
      phone: formPhone.trim() || undefined,
      value: formattedValue,
      status: formStatus,
      source: 'Manual Insertion',
      date: new Date().toISOString().split('T')[0],
      service: formService.trim() || undefined,
      message: formMessage.trim() || undefined,
      conversation: []
    };

    const updatedLeads = [newLead, ...leads];
    saveLeads(updatedLeads);
    syncLeadToGoogleSheets(newLead, 'create');
    addToast(`Lead ${newLead.name} captured & synced to Google Sheets!`, 'success');

    // 7. Reset Form
    setFormName('');
    setFormCompany('');
    setFormEmail('');
    setFormPhone('');
    setFormValue('');
    setFormStatus('new');
    setFormService('');
    setFormMessage('');
    setShowAddModal(false);
  };

  // Auto-select lead when navigating from other modules
  React.useEffect(() => {
    const requestedLeadId = localStorage.getItem('scaleflow_selected_lead_id');
    if (requestedLeadId) {
      const match = leads.find(l => l.id === requestedLeadId);
      if (match) {
        setSelectedLead(match);
      }
      localStorage.removeItem('scaleflow_selected_lead_id');
    }
  }, [leads]);

  // Sync leads back to localStorage when deleted/updated
  const saveLeads = (updatedLeads: Lead[]) => {
    setLeads(updatedLeads);
    localStorage.setItem('scaleflow_leads', JSON.stringify(updatedLeads));
  };

  const handleDeleteLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this lead?")) {
      const target = leads.find(l => l.id === id);
      const updated = leads.filter(l => l.id !== id);
      saveLeads(updated);
      if (target) {
        syncLeadToGoogleSheets(target, 'delete');
      }
      if (selectedLead?.id === id) {
        setSelectedLead(null);
      }
    }
  };

  // Client-side quick filter and search logic
  const filteredLeads = leads.filter(lead => {
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.phone && lead.phone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.service && lead.service.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'contacted': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'qualified': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'nurturing': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'closed': return 'bg-gray-500/10 text-gray-400 border border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#1a1a24] pb-5">
        <div className="space-y-1">
          <h2 className="text-xl font-display font-bold text-white tracking-tight">Leads Qualification Pipeline</h2>
          <p className="text-xs text-gray-500">Classify incoming customer events, manage estimated contract sizes, and view source traces.</p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#08080c] hover:bg-[#12121a] text-xs font-semibold text-gray-300 hover:text-white rounded-lg border border-[#1d1d29] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white rounded-lg transition-colors border border-brand-500/10 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Lead
          </button>
        </div>
      </div>

      {/* Filter Options Controls row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#08080c]/60 border border-white/[0.04] p-4 rounded-xl backdrop-blur-md">
        {/* Left Side: Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {['all', 'new', 'contacted', 'qualified', 'nurturing', 'closed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider font-sans cursor-pointer border transition-all duration-150 ${
                filterStatus === status 
                  ? 'bg-white/[0.08] text-white border-white/[0.08] shadow-sm' 
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Right Side: Simple Search Input widget */}
        <div className="relative w-full sm:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2 bg-[#040406]/60 border border-white/[0.06] rounded-xl text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-brand-500/50 focus:ring-1 focus:ring-brand-500/20 transition-all"
          />
        </div>
      </div>

      {/* Leads Table Container */}
      <div className="bg-[#08080c]/60 border border-white/[0.04] rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#151520] text-left">
            <thead className="bg-[#040406]">
              <tr>
                <th scope="col" className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Lead Info</th>
                <th scope="col" className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Estimated Value</th>
                <th scope="col" className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Acquisition Source</th>
                <th scope="col" className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider">Date Logged</th>
                <th scope="col" className="px-6 py-4 text-xs font-medium text-gray-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#151520] bg-transparent">
              {filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#0c0c12]/50 transition-colors">
                    {/* Info */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#12121c] border border-[#222232] flex items-center justify-center font-semibold text-brand-400 text-xs">
                          {lead.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{lead.name}</div>
                          <div className="text-xs text-gray-500 font-sans">{lead.company}</div>
                        </div>
                      </div>
                    </td>

                    {/* Value */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-white font-mono">{lead.value}</div>
                      <div className="text-[10px] text-gray-500 font-sans">Contract Value</div>
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-sans font-semibold ${getStatusStyle(lead.status)}`}>
                        {lead.status.toUpperCase()}
                      </span>
                    </td>

                    {/* Source */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-300 font-sans">{lead.source}</div>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500 font-sans font-medium">{lead.date}</div>
                    </td>

                    {/* Quick action link */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => setSelectedLead(lead)}
                          className="text-brand-400 hover:text-brand-300 transition-colors inline-flex items-center gap-0.5 cursor-pointer"
                        >
                          Audit
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteLead(lead.id, e)}
                          className="text-gray-500 hover:text-red-400 transition-colors p-1"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-sm">No leads match your active filters or search terms.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEAD AUDIT SIDE SHEET OVERLAY MODAL */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
          {/* Overlay Click-Away */}
          <div className="absolute inset-0" onClick={() => setSelectedLead(null)} />

          {/* Sheet Container */}
          <div className="relative w-full max-w-2xl bg-[#08080c] border-l border-[#1a1a24] h-full flex flex-col shadow-2xl animate-slide-in-right">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#151520] flex items-center justify-between bg-[#040406]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-600/15 border border-brand-500/20 flex items-center justify-center font-bold text-brand-400 text-sm">
                  {selectedLead.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-white tracking-tight">{selectedLead.name}</h3>
                  <p className="text-xs text-gray-500 font-sans">Lead Audit / ID: <span className="font-mono">{selectedLead.id}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#12121a] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Parameter Badges / Quick stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3.5 bg-[#040406] border border-[#13131b] rounded-xl">
                  <span className="text-[10px] text-gray-500 font-sans font-semibold uppercase block">Estimated Value</span>
                  <span className="text-xs font-bold text-white font-mono">{selectedLead.value}</span>
                </div>
                <div className="p-3.5 bg-[#040406] border border-[#13131b] rounded-xl">
                  <span className="text-[10px] text-gray-500 font-sans font-semibold uppercase block">Pipeline Status</span>
                  <span className="inline-block mt-0.5">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-sans font-semibold ${getStatusStyle(selectedLead.status)}`}>
                      {selectedLead.status.toUpperCase()}
                    </span>
                  </span>
                </div>
                <div className="p-3.5 bg-[#040406] border border-[#13131b] rounded-xl">
                  <span className="text-[10px] text-gray-500 font-sans font-semibold uppercase block">Creation Date</span>
                  <span className="text-xs font-semibold text-gray-300 font-sans font-medium">{selectedLead.date}</span>
                </div>
              </div>

              {/* Extracted Profile Details */}
              <div className="bg-[#040406] border border-[#12121a] rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-display font-bold text-white tracking-tight border-b border-[#12121a] pb-2 flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  Captured Qualification Profile
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                  
                  {/* Phone */}
                  <div className="space-y-1">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" /> Phone Number:
                    </span>
                    <p className="text-white font-sans font-medium bg-[#08080c] px-3 py-2 rounded-lg border border-[#12121a]">
                      {selectedLead.phone || 'N/A (Captured from Voice Carrier)'}
                    </p>
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> Email Address:
                    </span>
                    <p className="text-white font-sans font-medium bg-[#08080c] px-3 py-2 rounded-lg border border-[#12121a]">
                      {selectedLead.email || 'N/A'}
                    </p>
                  </div>

                  {/* Requested Service */}
                  <div className="space-y-1">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> Service of Interest:
                    </span>
                    <p className="text-white font-sans font-medium bg-[#08080c] px-3 py-2 rounded-lg border border-[#12121a]">
                      {selectedLead.service || 'N/A'}
                    </p>
                  </div>

                  {/* Date/Time Preference */}
                  <div className="space-y-1">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Appointment Booking Prefs:
                    </span>
                    <div className="text-indigo-400 font-semibold font-sans bg-[#0c0c12]/50 px-3 py-2 rounded-lg border border-[#1b1b2f] flex justify-between items-center">
                      <span>
                        {selectedLead.appointmentDate 
                          ? `${selectedLead.appointmentDate}${selectedLead.appointmentTime ? ` @ ${selectedLead.appointmentTime}` : ''}`
                          : 'No appointment preferences registered'}
                      </span>
                      {activeLinkedAppt && (
                        <span className={`text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded border leading-none ${
                          activeLinkedAppt.status === 'cancelled'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {activeLinkedAppt.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Full question/message */}
                  <div className="md:col-span-2 space-y-1">
                    <span className="text-gray-500 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> Customer Question / Request Details:
                    </span>
                    <p className="text-gray-300 bg-[#08080c] px-3 py-2.5 rounded-lg border border-[#12121a] leading-relaxed">
                      {selectedLead.message || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Saved Conversation Transcript */}
              <div className="space-y-3">
                <h4 className="text-xs font-display font-bold text-white tracking-tight flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-brand-400" />
                  Linked Conversational Transcript Trace
                </h4>

                <div className="bg-[#040406] border border-[#12121a] rounded-2xl p-4 max-h-[300px] overflow-y-auto space-y-4">
                  {selectedLead.conversation && selectedLead.conversation.length > 0 ? (
                    selectedLead.conversation.map((msg, idx) => (
                      <div 
                        key={msg.id || idx}
                        className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                      >
                        {/* Avatar */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] ${
                          msg.sender === 'user' 
                            ? 'bg-[#12121c] border border-[#222232] text-brand-400' 
                            : msg.sender === 'system'
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-brand-600/15 border border-brand-500/20 text-brand-300'
                        }`}>
                          {msg.sender === 'user' ? <User className="w-3 h-3" /> : msg.sender === 'system' ? <Check className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                        </div>

                        {/* Bubble */}
                        <div className={`p-3 rounded-xl text-xs space-y-1 ${
                          msg.sender === 'user'
                            ? 'bg-[#121220] border border-[#1f1f35] text-white rounded-tr-none'
                            : msg.sender === 'system'
                            ? 'bg-emerald-500/5 border border-emerald-500/10 text-emerald-300 rounded-tl-none font-sans font-semibold text-[10px]'
                            : 'bg-[#08080c] border border-[#1a1a24] text-gray-300 rounded-tl-none leading-relaxed'
                        }`}>
                          <p>{msg.text}</p>
                          <span className="block text-[9px] text-gray-500 text-right font-mono">{msg.timestamp}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-500 font-sans text-[11px] flex flex-col items-center justify-center gap-1">
                      <Clock className="w-5 h-5 text-gray-600" />
                      No linked transcript active for this static CRM entry.
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MANUAL ADD LEAD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
          <div className="absolute inset-0" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-w-lg bg-[#08080c] border border-[#1a1a24] rounded-2xl overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#151520] flex items-center justify-between bg-[#040406]">
              <div className="flex items-center gap-2 text-brand-400">
                <Plus className="w-4 h-4" />
                <h3 className="text-sm font-display font-bold text-white tracking-tight">Create Qualification Lead</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#12121a] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Scroll Area */}
            <form onSubmit={handleCreateLeadSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Name */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-gray-400">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Imran Khan"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="block w-full px-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Company */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-gray-400">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ScaleFlow Inc."
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    className="block w-full px-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-gray-400">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. imran@scaleflow.io"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="block w-full px-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-gray-400">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +1 (555) 019-2831"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="block w-full px-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Estimated Value */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-gray-400">Estimated Value</label>
                  <input
                    type="text"
                    placeholder="e.g. 5000"
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    className="block w-full px-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Pipeline Status */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-gray-400">Pipeline Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="block w-full px-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  >
                    <option value="new">NEW</option>
                    <option value="contacted">CONTACTED</option>
                    <option value="qualified">QUALIFIED</option>
                    <option value="nurturing">NURTURING</option>
                    <option value="closed">CLOSED</option>
                  </select>
                </div>

                {/* Service of Interest */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-gray-400">Service of Interest</label>
                  <input
                    type="text"
                    placeholder="e.g. Enterprise Voice SIP Integration"
                    value={formService}
                    onChange={(e) => setFormService(e.target.value)}
                    className="block w-full px-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Question / Notes */}
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[11px] font-sans font-semibold uppercase tracking-wider text-gray-400">Inquiry Notes / Request Details</label>
                  <textarea
                    rows={3}
                    placeholder="Describe any custom inquiry parameters, specific features required, or meeting requests..."
                    value={formMessage}
                    onChange={(e) => setFormMessage(e.target.value)}
                    className="block w-full px-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#12121a]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-transparent text-xs font-semibold text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white rounded-lg transition-colors border border-brand-500/10 cursor-pointer"
                >
                  Confirm Creation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM PORTAL */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium pointer-events-auto max-w-sm animate-slide-in-right ${
              toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/30 text-red-200'
                : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <X className="w-4 h-4 text-red-400 flex-shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <p className="flex-1">{toast.text}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
