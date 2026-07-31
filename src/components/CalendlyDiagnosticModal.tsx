/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Terminal, 
  Trash2, 
  Activity, 
  Play, 
  ExternalLink,
  ShieldCheck,
  Calendar,
  Key,
  Clock,
  Send,
  Zap,
  User,
  Mail,
  Phone
} from 'lucide-react';
import { 
  getCalendlyConfig, 
  saveCalendlyConfig, 
  getCalendlyLogs, 
  clearCalendlyLogs, 
  verifyCalendlyConnection, 
  createCalendlyBooking,
  runCalendlyAutomatedTestSuite,
  CalendlyConfig,
  CalendlyApiLog,
  TestStepResult
} from '../lib/calendly';

interface CalendlyDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CalendlyDiagnosticModal({ isOpen, onClose }: CalendlyDiagnosticModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'test' | 'logs'>('overview');
  const [config, setConfig] = useState<CalendlyConfig>(getCalendlyConfig());
  const [logs, setLogs] = useState<CalendlyApiLog[]>(getCalendlyLogs());
  const [selectedLog, setSelectedLog] = useState<CalendlyApiLog | null>(null);

  // Testing States
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRunningTestSuite, setIsRunningTestSuite] = useState(false);
  const [testSteps, setTestSteps] = useState<TestStepResult[]>([]);
  const [testSuiteSummary, setTestSuiteSummary] = useState<string | null>(null);

  // Quick Manual Test Booking Form State
  const [testName, setTestName] = useState('Sarah Jenkins');
  const [testEmail, setTestEmail] = useState('sarah.jenkins@scaleflow-demo.com');
  const [testPhone, setTestPhone] = useState('+1 (555) 234-5678');
  const [testDate, setTestDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [testTime, setTestTime] = useState('02:00 PM');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(getCalendlyConfig());
      setLogs(getCalendlyLogs());
    }
  }, [isOpen]);

  // Sync state when custom window event fires
  useEffect(() => {
    const handleUpdate = () => {
      setConfig(getCalendlyConfig());
      setLogs(getCalendlyLogs());
    };
    window.addEventListener('scaleflow_calendly_updated', handleUpdate);
    return () => window.removeEventListener('scaleflow_calendly_updated', handleUpdate);
  }, []);

  if (!isOpen) return null;

  const handleVerify = async () => {
    setIsVerifying(true);
    setBookingResult(null);
    try {
      const res = await verifyCalendlyConnection();
      setConfig(getCalendlyConfig());
      setLogs(getCalendlyLogs());
      if (res.valid) {
        setBookingResult({ success: true, message: `Calendly verified successfully! Connected to ${res.bookingUrl}` });
      } else {
        setBookingResult({ success: false, message: `Verification failed: ${res.error}` });
      }
    } catch (e: any) {
      setBookingResult({ success: false, message: `Verification error: ${e.message}` });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRunAutomatedTest = async () => {
    setIsRunningTestSuite(true);
    setTestSuiteSummary(null);
    setTestSteps([]);

    const result = await runCalendlyAutomatedTestSuite((updatedSteps) => {
      setTestSteps(updatedSteps);
    });

    setConfig(getCalendlyConfig());
    setLogs(getCalendlyLogs());
    setIsRunningTestSuite(false);

    if (result.allPassed) {
      setTestSuiteSummary('✅ ALL 7 CALENDLY INTEGRATION TESTS PASSED PERFECTLY!');
    } else {
      setTestSuiteSummary('⚠️ INTEGRATION TEST ISSUES DETECTED. REVIEW FAILED STEP DETAILS BELOW.');
    }
  };

  const handleManualTestBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooking(true);
    setBookingResult(null);

    const res = await createCalendlyBooking({
      customerName: testName,
      email: testEmail,
      phone: testPhone,
      service: 'Diagnostic Test Appointment',
      date: testDate,
      time: testTime
    });

    setConfig(getCalendlyConfig());
    setLogs(getCalendlyLogs());
    setIsBooking(false);

    if (res.success) {
      setBookingResult({
        success: true,
        message: `Booking created! Event ID: ${res.eventId}. Lead auto-saved in pipeline.`
      });
    } else {
      setBookingResult({
        success: false,
        message: `Booking failed: ${res.error}`
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0b0c14] border border-[#1e1e30] rounded-2xl w-full max-w-4xl h-[720px] flex flex-col overflow-hidden shadow-2xl animate-fade-in relative">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0e0f1a] border-b border-[#1b1b2f] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white font-display">Calendly Integration Hub & Diagnostics</h3>
                {config.connected ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> CONNECTED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 font-semibold">
                    <AlertCircle className="w-3 h-3" /> DISCONNECTED
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Audit scheduling links, verify API credentials, run 7-step test suite, and inspect sync logs.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="px-3 py-1.5 bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white bg-white/[0.05] border border-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 bg-[#080910] border-b border-[#181828] flex items-center gap-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'overview' ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Connection Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('test')}
            className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'test' ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>7-Step Test Suite & Booking Test</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'logs' ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>API Logs ({logs.length})</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#07080f]">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Alert Feedback Banner */}
              {bookingResult && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
                  bookingResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' 
                    : 'bg-red-500/10 border-red-500/20 text-red-300'
                }`}>
                  {bookingResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />}
                  <span>{bookingResult.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Account Details Box */}
                <div className="p-4 bg-[#0d0e17] border border-[#1b1c2b] rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-[#181928] pb-2">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-4 h-4 text-brand-400" /> Calendly Account Profile
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">Auto-Synced</span>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Account Owner:</span>
                      <span className="text-white font-semibold">{config.userName || 'ScaleFlow Admin'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-gray-300 font-mono">{config.email || 'imrankhan.scaleflow@gmail.com'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Scheduling URL:</span>
                      <a
                        href={config.bookingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-400 hover:underline font-mono text-[11px] truncate max-w-[180px] flex items-center gap-1"
                      >
                        {config.bookingUrl} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">API PAT Token:</span>
                      <span className="text-gray-300 font-mono">
                        {config.apiKey ? `${config.apiKey.substring(0, 6)}...${config.apiKey.slice(-4)}` : 'Not Provided (URL Mode)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Health & Sync Status Box */}
                <div className="p-4 bg-[#0d0e17] border border-[#1b1c2b] rounded-xl space-y-3">
                  <div className="flex items-center justify-between border-b border-[#181928] pb-2">
                    <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-emerald-400" /> Synchronization Health
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      config.lastSyncStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {config.lastSyncStatus?.toUpperCase() || 'NEVER'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Verified:</span>
                      <span className="text-gray-300 font-mono">
                        {config.lastVerifiedAt ? new Date(config.lastVerifiedAt).toLocaleString() : 'Not verified yet'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">2-Way Lead Auto-Sync:</span>
                      <span className="text-emerald-400 font-semibold">ACTIVE</span>
                    </div>
                    {config.lastError && (
                      <div className="p-2 bg-red-500/10 border border-red-500/20 rounded text-[11px] text-red-300 font-mono break-all">
                        Error: {config.lastError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Instructions Card */}
              <div className="p-4 bg-brand-500/5 border border-brand-500/15 rounded-xl space-y-2 text-xs text-gray-300">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-brand-400" /> How ScaleFlow Calendly Integration Works
                </h4>
                <p className="leading-relaxed text-gray-400">
                  When a prospective lead interacts with the AI Voice Receptionist or Chat Agent and requests an appointment, the AI verifies the connected Calendly integration. The AI collects the lead information, confirms availability, and creates the booking on Calendly. A 2-way sync keeps leads synchronized between Calendly and your ScaleFlow pipeline.
                </p>
              </div>

            </div>
          )}

          {/* TEST SUITE TAB */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              
              {/* 7-Step Test Suite Runner */}
              <div className="p-5 bg-[#0d0e17] border border-[#1b1c2b] rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#181928] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-brand-400" /> Automated 7-Step Integration Verification Suite
                    </h4>
                    <p className="text-xs text-gray-400">Run end-to-end simulation testing connection, booking creation, lead saving, analytics update, and cancellation sync.</p>
                  </div>
                  <button
                    onClick={handleRunAutomatedTest}
                    disabled={isRunningTestSuite}
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-600/20 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
                  >
                    <Play className={`w-3.5 h-3.5 ${isRunningTestSuite ? 'animate-spin' : ''}`} />
                    {isRunningTestSuite ? 'Running Verification...' : 'Run Automated System Test'}
                  </button>
                </div>

                {testSuiteSummary && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold ${
                    testSuiteSummary.includes('PASSED')
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  }`}>
                    {testSuiteSummary}
                  </div>
                )}

                {testSteps.length > 0 && (
                  <div className="space-y-2.5 pt-1">
                    {testSteps.map((s) => (
                      <div
                        key={s.step}
                        className={`p-3 rounded-lg border flex items-start justify-between gap-3 text-xs transition-all ${
                          s.status === 'passed' ? 'bg-emerald-500/5 border-emerald-500/20' :
                          s.status === 'failed' ? 'bg-red-500/5 border-red-500/20' :
                          s.status === 'running' ? 'bg-brand-500/10 border-brand-500/30' : 'bg-[#080912] border-[#181826] opacity-60'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 font-bold ${
                            s.status === 'passed' ? 'bg-emerald-500 text-black' :
                            s.status === 'failed' ? 'bg-red-500 text-white' :
                            s.status === 'running' ? 'bg-brand-500 text-white animate-pulse' : 'bg-gray-800 text-gray-400'
                          }`}>
                            {s.step}
                          </span>
                          <div>
                            <p className="font-bold text-white">{s.title}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">{s.description}</p>
                            {s.details && (
                              <p className="text-[10px] font-mono text-brand-300 mt-1 bg-black/40 p-1.5 rounded border border-white/5">
                                {s.details}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                          s.status === 'passed' ? 'bg-emerald-500/10 text-emerald-400' :
                          s.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                          s.status === 'running' ? 'bg-brand-500/20 text-brand-300 animate-pulse' : 'bg-gray-800 text-gray-500'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Manual Booking Test Form */}
              <div className="p-5 bg-[#0d0e17] border border-[#1b1c2b] rounded-xl space-y-4">
                <h4 className="text-sm font-bold text-white font-display flex items-center gap-2 border-b border-[#181928] pb-2">
                  <Send className="w-4 h-4 text-brand-400" /> Execute Manual Test Booking
                </h4>

                <form onSubmit={handleManualTestBooking} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={testName}
                      onChange={(e) => setTestName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#05060a] border border-[#1c1d2e] rounded-lg text-white placeholder-gray-600 focus:border-brand-500 outline-none transition-colors"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-[#05060a] border border-[#1c1d2e] rounded-lg text-white placeholder-gray-600 focus:border-brand-500 outline-none transition-colors"
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-[#05060a] border border-[#1c1d2e] rounded-lg text-white placeholder-gray-600 focus:border-brand-500 outline-none transition-colors"
                      placeholder="+1 (555) 000-0000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={testDate}
                      onChange={(e) => setTestDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#05060a] border border-[#1c1d2e] rounded-lg text-white placeholder-gray-600 focus:border-brand-500 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Time
                    </label>
                    <input
                      type="time"
                      value={testTime}
                      onChange={(e) => setTestTime(e.target.value)}
                      className="w-full px-3 py-2 bg-[#05060a] border border-[#1c1d2e] rounded-lg text-white placeholder-gray-600 focus:border-brand-500 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isBooking}
                      className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isBooking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {isBooking ? 'Creating Booking...' : 'Create Test Booking'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* LOGS TAB */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white font-display flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-brand-400" /> API Call Audit Trail
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setConfig(getCalendlyConfig());
                      setLogs(getCalendlyLogs());
                    }}
                    className="px-2.5 py-1 bg-[#1a1a2e] hover:bg-[#25253e] text-gray-300 text-[11px] font-medium rounded-lg border border-[#2a2a40] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </button>
                  {logs.length > 0 && (
                    <button
                      onClick={handleClearLogs}
                      className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[11px] font-medium rounded-lg border border-red-500/20 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Logs
                    </button>
                  )}
                </div>
              </div>

              {logs.length === 0 ? (
                <div className="bg-[#12121e] border border-[#1d1d2e] rounded-xl p-8 text-center space-y-2">
                  <Terminal className="w-6 h-6 text-gray-600 mx-auto" />
                  <p className="text-xs text-gray-400">No Calendly API logs recorded yet.</p>
                  <p className="text-[11px] text-gray-500">Run a test or create a booking to capture live logs.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  
                  {/* Log List */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {logs.map((log) => {
                      const isSelected = selectedLog?.id === log.id;
                      return (
                        <div
                          key={log.id}
                          onClick={() => setSelectedLog(log)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-1.5 ${
                            isSelected
                              ? 'bg-brand-500/10 border-brand-500/40 ring-1 ring-brand-500/30'
                              : 'bg-[#10101c] border-[#1d1d2e] hover:border-[#2d2d42]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              log.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {log.success ? 'SUCCESS' : 'FAILED'}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>

                          <div className="text-[11px] font-mono font-bold text-white">
                            {log.type}
                          </div>

                          {log.error && (
                            <p className="text-[10px] font-mono text-red-400 truncate">
                              {log.error}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Log Detail Inspector */}
                  <div className="bg-[#08080f] border border-[#1d1d2e] rounded-xl p-4 space-y-3 max-h-[400px] overflow-y-auto">
                    {selectedLog ? (
                      <div className="space-y-3 text-xs font-mono">
                        <div className="border-b border-[#1d1d2e] pb-2">
                          <span className="text-brand-300 font-bold">{selectedLog.type}</span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Request:</span>
                          <div className="p-2.5 bg-[#0e0e17] border border-[#1a1a2a] rounded text-[11px] text-gray-300 space-y-1">
                            <div>URL: {selectedLog.request?.url || 'N/A'}</div>
                            <div>Method: {selectedLog.request?.method || 'N/A'}</div>
                          </div>
                        </div>

                        {selectedLog.error && (
                          <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-300 text-[11px] rounded">
                            <span className="font-bold block mb-1">Error:</span>
                            {selectedLog.error}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-center text-gray-500 text-xs">
                        Click a log to inspect details
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1e1e30] bg-[#0e0f1a] flex items-center justify-between">
          <span className="text-[10px] font-mono text-gray-500">
            ScaleFlow Calendly Integration Hub v2.0
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1e1e2e] hover:bg-[#28283d] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>

      </div>
    </div>
  );
}
