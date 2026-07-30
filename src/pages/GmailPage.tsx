/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Inbox, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertTriangle, 
  Sparkles, 
  Bot, 
  Search, 
  Filter, 
  Settings, 
  ShieldCheck, 
  Play, 
  User, 
  FileText, 
  Clock, 
  ArrowUpRight, 
  ChevronRight, 
  Check, 
  ExternalLink,
  Plus,
  Trash2,
  Copy,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getGmailConfig, 
  saveGmailConfig, 
  getGmailMessages, 
  sendGmailEmail, 
  getGmailAnalytics, 
  aiAssistEmail, 
  runGmailAutomatedTestSuite,
  isValidEmail,
  DEFAULT_GMAIL_TEMPLATES
} from '../lib/gmail';
import { GmailConfig, GmailMessage, GmailAnalytics, Lead } from '../types';

export function GmailPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'copilot' | 'settings' | 'testing'>('inbox');
  const [config, setConfig] = useState<GmailConfig>(getGmailConfig());
  const [messages, setMessages] = useState<GmailMessage[]>(getGmailMessages());
  const [analytics, setAnalytics] = useState<GmailAnalytics>(getGmailAnalytics());
  const [leads, setLeads] = useState<Lead[]>([]);
  
  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [selectedMsg, setSelectedMsg] = useState<GmailMessage | null>(null);

  // AI Copilot state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailTone, setEmailTone] = useState<'professional' | 'friendly' | 'urgent' | 'persuasive' | 'concise'>('professional');
  const [aiGoalPrompt, setAiGoalPrompt] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);

  // Settings State
  const [editingTemplates, setEditingTemplates] = useState(config.templates);
  const [senderName, setSenderName] = useState(config.senderName);
  const [signature, setSignature] = useState(config.signature);
  const [autoEmails, setAutoEmails] = useState(config.autoEmailsEnabled);
  const [activeTemplateTab, setActiveTemplateTab] = useState<keyof typeof DEFAULT_GMAIL_TEMPLATES>('appointmentConfirmation');

  // Automated Test Suite State
  const [testSuiteRunning, setTestSuiteRunning] = useState(false);
  const [testSteps, setTestSteps] = useState<Array<{ name: string; status: 'pending' | 'running' | 'success' | 'failed'; log: string }>>([
    { name: 'Connect Gmail', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Send a test email', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Receive a test email', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Link email to a lead', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Update analytics', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Verify dashboard updates', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Handle invalid email gracefully', status: 'pending', log: 'Waiting to execute...' }
  ]);
  const [testSummary, setTestSummary] = useState<{ completed: boolean; success: boolean; message: string } | null>(null);

  // Toast feedback state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const refreshData = () => {
      const cfg = getGmailConfig();
      const msgs = getGmailMessages();
      const ana = getGmailAnalytics();
      setConfig(cfg);
      setMessages(msgs);
      setAnalytics(ana);

      const savedLeads = localStorage.getItem('scaleflow_leads');
      if (savedLeads) {
        try { setLeads(JSON.parse(savedLeads)); } catch (e) {}
      }
    };

    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update lead fields when lead selected in AI Copilot
  const handleSelectLeadForCopilot = (leadId: string) => {
    setSelectedLeadId(leadId);
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.email) {
      setRecipientEmail(lead.email);
    }
  };

  // Toggle Gmail Connection
  const handleToggleConnection = () => {
    const updated = saveGmailConfig({ connected: !config.connected });
    setConfig(updated);
    showToast(
      updated.connected ? '✓ Gmail account connected securely!' : '⚠️ Gmail account disconnected.',
      updated.connected ? 'success' : 'info'
    );
  };

  // Handle AI Email Generation
  const handleGenerateAiDraft = async () => {
    if (!aiGoalPrompt.trim() && !selectedMsg) {
      showToast('Please enter an email topic/prompt or select an email to reply to.', 'error');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const res = await aiAssistEmail({
        actionType: selectedMsg ? 'reply' : 'draft',
        prompt: aiGoalPrompt,
        tone: emailTone,
        customerName: leads.find(l => l.id === selectedLeadId)?.name || 'Valued Customer',
        customerEmail: recipientEmail,
        conversationHistory: selectedMsg ? selectedMsg.body : undefined
      });

      if (!emailSubject) {
        setEmailSubject(selectedMsg ? `Re: ${selectedMsg.subject}` : `Follow-up: ScaleFlow AI Solutions`);
      }
      setEmailBody(res.text);
      if (res.suggestedReplies) {
        setSuggestedReplies(res.suggestedReplies);
      }
      showToast('✨ AI Email draft created!', 'success');
    } catch (err: any) {
      showToast('Error generating AI draft: ' + err.message, 'error');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Handle Send Email
  const handleSendEmail = async () => {
    if (!recipientEmail.trim()) {
      showToast('Recipient email is required.', 'error');
      return;
    }

    if (!isValidEmail(recipientEmail)) {
      showToast(`Invalid email format: "${recipientEmail}". Please use a valid email address.`, 'error');
      return;
    }

    if (!emailSubject.trim()) {
      showToast('Please enter an email subject.', 'error');
      return;
    }

    if (!emailBody.trim()) {
      showToast('Please enter email body content.', 'error');
      return;
    }

    setIsSending(true);
    try {
      const res = await sendGmailEmail({
        to: recipientEmail,
        subject: emailSubject,
        body: emailBody,
        leadId: selectedLeadId || null
      });

      if (res.success) {
        showToast(`📧 Email sent successfully to ${recipientEmail}!`, 'success');
        setEmailSubject('');
        setEmailBody('');
        setAiGoalPrompt('');
        setMessages(getGmailMessages());
        setAnalytics(getGmailAnalytics());
        setActiveTab('inbox');
      } else {
        showToast(`❌ Failed to send email: ${res.error}`, 'error');
      }
    } catch (err: any) {
      showToast(`❌ Error: ${err.message}`, 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    const updated = saveGmailConfig({
      senderName,
      signature,
      autoEmailsEnabled: autoEmails,
      templates: editingTemplates
    });
    setConfig(updated);
    showToast('✓ Gmail Settings & Email Templates saved!', 'success');
  };

  // Execute Automated Diagnostic Test Suite
  const handleRunDiagnosticSuite = async () => {
    setTestSuiteRunning(true);
    setTestSummary(null);

    // Reset steps
    setTestSteps([
      { name: 'Connect Gmail', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Send a test email', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Receive a test email', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Link email to a lead', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Update analytics', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Verify dashboard updates', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Handle invalid email gracefully', status: 'pending', log: 'Waiting to execute...' }
    ]);

    const success = await runGmailAutomatedTestSuite((stepIdx, status, log) => {
      setTestSteps(prev => {
        const next = [...prev];
        if (next[stepIdx]) {
          next[stepIdx] = { ...next[stepIdx], status, log };
        }
        return next;
      });
    });

    setTestSuiteRunning(false);
    setTestSummary({
      completed: true,
      success,
      message: success 
        ? ' All 7 Gmail integration diagnostic tests passed perfectly! Integration is fully operational.'
        : '⚠️ Diagnostic suite finished with issues. Check details below.'
    });

    setMessages(getGmailMessages());
    setAnalytics(getGmailAnalytics());
  };

  // Filtered messages
  const filteredMessages = messages.filter(m => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      m.subject.toLowerCase().includes(query) || 
      m.email.toLowerCase().includes(query) || 
      m.body.toLowerCase().includes(query) ||
      (m.leadId && m.leadId.toLowerCase().includes(query));

    const matchesDir = directionFilter === 'all' || m.direction === directionFilter;
    return matchesSearch && matchesDir;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 backdrop-blur-md ${
              toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' :
              toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' :
              'bg-sky-500/10 border-sky-500/30 text-sky-300'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />}
            {toast.type === 'info' && <AlertTriangle className="w-5 h-5 text-sky-400 flex-shrink-0" />}
            <span className="text-xs font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner & OAuth Connection Status */}
      <div className="p-6 bg-gradient-to-r from-red-600/15 via-rose-500/10 to-transparent border border-red-500/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30 flex-shrink-0 shadow-inner">
            <Mail className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-display text-white tracking-tight">Gmail Integration Hub</h1>
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 border ${
                config.connected 
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${config.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {config.connected ? 'Connected via Google OAuth' : 'Disconnected'}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Account: <strong className="text-white font-mono">{config.email}</strong> • Automated Email Notifications & AI Email Copilot Active
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => handleRunDiagnosticSuite()}
            disabled={testSuiteRunning}
            className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Run 7-Step Tests</span>
          </button>
          
          <button
            onClick={handleToggleConnection}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              config.connected
                ? 'bg-[#12121a] hover:bg-rose-500/10 text-rose-300 border-rose-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
            }`}
          >
            {config.connected ? 'Disconnect Gmail' : 'Reconnect Gmail'}
          </button>
        </div>
      </div>

      {/* Gmail Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-[#08080c] border border-[#1a1a24] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sent Today</p>
            <p className="text-lg font-bold font-mono text-white mt-0.5">{analytics.sentToday}</p>
          </div>
          <Send className="w-5 h-5 text-rose-400" />
        </div>

        <div className="p-4 bg-[#08080c] border border-[#1a1a24] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Received Today</p>
            <p className="text-lg font-bold font-mono text-white mt-0.5">{analytics.receivedToday}</p>
          </div>
          <Inbox className="w-5 h-5 text-sky-400" />
        </div>

        <div className="p-4 bg-[#08080c] border border-[#1a1a24] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Unread</p>
            <p className="text-lg font-bold font-mono text-amber-400 mt-0.5">{analytics.unread}</p>
          </div>
          <Clock className="w-5 h-5 text-amber-400" />
        </div>

        <div className="p-4 bg-[#08080c] border border-[#1a1a24] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Failed Deliveries</p>
            <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{analytics.failedDeliveries}</p>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="p-4 bg-[#08080c] border border-[#1a1a24] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Reply Rate</p>
            <p className="text-lg font-bold font-mono text-violet-400 mt-0.5">{analytics.replyRatePct}%</p>
          </div>
          <Zap className="w-5 h-5 text-violet-400" />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#1a1a24] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inbox')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'inbox'
              ? 'border-red-500 text-white bg-red-500/5'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Email Logs & Threads ({filteredMessages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('copilot')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'copilot'
              ? 'border-red-500 text-white bg-red-500/5'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-rose-400" />
          <span>AI Email Copilot</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'border-red-500 text-white bg-red-500/5'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Automation & Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('testing')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'testing'
              ? 'border-red-500 text-white bg-red-500/5'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Play className="w-4 h-4 text-emerald-400" />
          <span>Automated 7-Step Test Suite</span>
        </button>
      </div>

      {/* TAB 1: INBOX & EMAIL THREADS */}
      {activeTab === 'inbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Message List Side Panel */}
          <div className="lg:col-span-5 bg-[#08080c] border border-[#1a1a24] rounded-2xl p-4 space-y-4">
            {/* Search & Filter Bar */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search emails, subjects, or Lead ID..."
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-500 text-[10px] uppercase font-bold pr-1">Type:</span>
                {(['all', 'inbound', 'outbound'] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => setDirectionFilter(dir)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold capitalize transition-all cursor-pointer ${
                      directionFilter === dir 
                        ? 'bg-red-500/20 text-red-300 border border-red-500/40' 
                        : 'bg-[#12121a] text-gray-400 hover:text-white border border-[#22222f]'
                    }`}
                  >
                    {dir}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Cards List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredMessages.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs">
                  No Gmail messages found matching filter.
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isSelected = selectedMsg?.id === msg.id;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedMsg(msg)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isSelected 
                          ? 'bg-red-500/10 border-red-500/40 shadow-lg' 
                          : 'bg-[#0e0e14] border-[#1a1a24] hover:bg-[#14141e]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          msg.direction === 'outbound' 
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/20' 
                            : 'bg-sky-500/15 text-sky-300 border border-sky-500/20'
                        }`}>
                          {msg.direction}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">{msg.timestamp}</span>
                      </div>

                      <p className="text-xs font-bold text-white truncate">{msg.subject}</p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {msg.direction === 'outbound' ? `To: ${msg.recipient}` : `From: ${msg.sender}`}
                      </p>

                      {msg.leadId && (
                        <div className="pt-1 flex items-center gap-1.5 text-[10px] text-amber-400 font-mono">
                          <User className="w-3 h-3" />
                          <span>Linked Lead: {msg.leadId}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Detailed Message Viewer / Reply Console */}
          <div className="lg:col-span-7 bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-6">
            {selectedMsg ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between border-b border-[#1a1a24] pb-4">
                  <div>
                    <h2 className="text-base font-bold text-white font-display">{selectedMsg.subject}</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      {selectedMsg.direction === 'outbound' ? 'To: ' : 'From: '}
                      <strong className="text-white font-mono">{selectedMsg.email}</strong>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setRecipientEmail(selectedMsg.email);
                      setSelectedLeadId(selectedMsg.leadId || '');
                      setEmailSubject(`Re: ${selectedMsg.subject}`);
                      setActiveTab('copilot');
                    }}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-rose-300 border border-red-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Reply with AI</span>
                  </button>
                </div>

                <div className="p-4 bg-[#0e0e14] border border-[#1a1a24] rounded-xl text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {selectedMsg.body}
                </div>

                {selectedMsg.leadId && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-xs text-amber-300">
                    <span className="font-medium">This email is automatically synced with Lead ID: {selectedMsg.leadId}</span>
                    <span className="text-[10px] font-bold uppercase bg-amber-500/20 px-2 py-0.5 rounded">Synced</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center p-8 text-gray-500 space-y-3">
                <Mail className="w-12 h-12 text-gray-600 animate-pulse" />
                <p className="text-xs">Select an email thread from the left panel to inspect details, view lead history, or draft a reply.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AI EMAIL COPILOT */}
      {activeTab === 'copilot' && (
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1a1a24] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white font-display">AI Email Copilot & Composer</h2>
                <p className="text-xs text-gray-400">Generate high-converting emails, draft intelligent responses, and format signatures instantly.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Input Options & Controls */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Select Lead (Optional)</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => handleSelectLeadForCopilot(e.target.value)}
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                >
                  <option value="">-- No Lead Selected --</option>
                  {leads.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.email || 'No Email'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Recipient Email *</label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. sarah.j@gmail.com"
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Select Email Tone</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['professional', 'friendly', 'urgent', 'persuasive', 'concise'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setEmailTone(t)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold capitalize border transition-all cursor-pointer ${
                        emailTone === t 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' 
                          : 'bg-[#12121a] text-gray-400 border-[#22222f] hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">AI Goal / Prompt Instruction</label>
                <textarea
                  value={aiGoalPrompt}
                  onChange={(e) => setAiGoalPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Follow up with Sarah regarding her enterprise onboarding demo and invite her to choose a slot..."
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 resize-none"
                />
              </div>

              <button
                onClick={handleGenerateAiDraft}
                disabled={isGeneratingAi}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingAi ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{isGeneratingAi ? 'Generating AI Email...' : 'Generate AI Draft'}</span>
              </button>
            </div>

            {/* Email Preview & Editor */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Subject Line *</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="e.g. Appointment Confirmed: ScaleFlow Onboarding"
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Email Body Content *</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={10}
                  placeholder="AI-generated draft or manual message text will appear here..."
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl p-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500/50 font-mono resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-gray-500 font-mono">Sender: {config.senderName} ({config.email})</span>
                <button
                  onClick={handleSendEmail}
                  disabled={isSending}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>{isSending ? 'Sending via Gmail...' : 'Send Email via Gmail'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS & AUTOMATION TEMPLATES */}
      {activeTab === 'settings' && (
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1a1a24] pb-4">
            <div>
              <h2 className="text-base font-bold text-white font-display">Gmail Notification Templates & Settings</h2>
              <p className="text-xs text-gray-400">Configure auto-triggered emails for appointments, leads, and human handoffs.</p>
            </div>
            <button
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Save Settings
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-[#0e0e14] border border-[#1a1a24] rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Automatic Email Notifications</p>
                  <p className="text-[11px] text-gray-400">Auto-send emails on bookings, cancellations, and new leads.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoEmails}
                  onChange={(e) => setAutoEmails(e.target.checked)}
                  className="w-4 h-4 accent-red-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Sender Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Email Signature</label>
                <textarea
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  rows={4}
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl p-3 text-xs text-gray-300 font-mono focus:outline-none focus:border-red-500/50 resize-none"
                />
              </div>
            </div>

            {/* Template Selector & Editor */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-300 mb-1">Select Template to Edit</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(DEFAULT_GMAIL_TEMPLATES) as Array<keyof typeof DEFAULT_GMAIL_TEMPLATES>).map(key => (
                  <button
                    key={key}
                    onClick={() => setActiveTemplateTab(key)}
                    className={`p-2 rounded-lg text-[10px] font-bold text-left capitalize border transition-all cursor-pointer ${
                      activeTemplateTab === key 
                        ? 'bg-red-500/20 text-red-300 border-red-500/40' 
                        : 'bg-[#12121a] text-gray-400 border-[#22222f] hover:text-white'
                    }`}
                  >
                    {key.replace(/([A-Z])/g, ' $1')}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Template Subject</label>
                <input
                  type="text"
                  value={editingTemplates[activeTemplateTab]?.subject || ''}
                  onChange={(e) => {
                    const newSub = e.target.value;
                    setEditingTemplates(prev => ({
                      ...prev,
                      [activeTemplateTab]: { ...prev[activeTemplateTab], subject: newSub }
                    }));
                  }}
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Template Body (Variables: &#123;name&#125;, &#123;service&#125;, &#123;date&#125;, &#123;time&#125;)</label>
                <textarea
                  value={editingTemplates[activeTemplateTab]?.body || ''}
                  onChange={(e) => {
                    const newBody = e.target.value;
                    setEditingTemplates(prev => ({
                      ...prev,
                      [activeTemplateTab]: { ...prev[activeTemplateTab], body: newBody }
                    }));
                  }}
                  rows={6}
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl p-3 text-xs text-gray-300 font-mono focus:outline-none focus:border-red-500/50 resize-none leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATED 7-STEP TEST SUITE */}
      {activeTab === 'testing' && (
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1a1a24] pb-4">
            <div>
              <h2 className="text-base font-bold text-white font-display">Automated 7-Step Gmail Verification Test Suite</h2>
              <p className="text-xs text-gray-400">Verifies OAuth connection, test message transmission, lead history linkage, analytics updates, and error handling.</p>
            </div>
            <button
              onClick={handleRunDiagnosticSuite}
              disabled={testSuiteRunning}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {testSuiteRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{testSuiteRunning ? 'Executing Tests...' : 'Run Diagnostics Now'}</span>
            </button>
          </div>

          {testSummary && (
            <div className={`p-4 rounded-xl border flex items-center gap-3 ${
              testSummary.success 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              {testSummary.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-rose-400" />}
              <span className="text-xs font-bold">{testSummary.message}</span>
            </div>
          )}

          <div className="space-y-3">
            {testSteps.map((step, idx) => (
              <div
                key={idx}
                className="p-4 bg-[#0e0e14] border border-[#1a1a24] rounded-xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                    step.status === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                    step.status === 'failed' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                    step.status === 'running' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' :
                    'bg-gray-800 text-gray-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">{step.name}</h3>
                    <p className="text-[11px] font-mono text-gray-400 mt-0.5">{step.log}</p>
                  </div>
                </div>

                <div>
                  {step.status === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                  {step.status === 'failed' && <XCircle className="w-5 h-5 text-rose-400" />}
                  {step.status === 'running' && <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />}
                  {step.status === 'pending' && <span className="text-[10px] font-mono text-gray-600 uppercase">Pending</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
