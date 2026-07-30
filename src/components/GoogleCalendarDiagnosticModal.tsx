import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Calendar, 
  Key, 
  Send, 
  AlertTriangle, 
  Code, 
  Trash2, 
  ExternalLink,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { 
  getGoogleCalendarConfig, 
  saveGoogleCalendarConfig, 
  getGoogleCalendarLogs, 
  verifyOAuthAuthentication, 
  createGoogleCalendarEvent, 
  clearGoogleCalendarLogs,
  authenticateGoogleCalendar,
  GoogleCalendarApiLog,
  GoogleCalendarConfig
} from '../lib/googleCalendar';
import { Appointment } from '../types';

interface DiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleCalendarDiagnosticModal({ isOpen, onClose }: DiagnosticModalProps) {
  const [config, setConfig] = useState<GoogleCalendarConfig>(getGoogleCalendarConfig());
  const [logs, setLogs] = useState<GoogleCalendarApiLog[]>(getGoogleCalendarLogs());
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isTestingCreate, setIsTestingCreate] = useState(false);
  const [selectedLog, setSelectedLog] = useState<GoogleCalendarApiLog | null>(null);
  const [customCalendarId, setCustomCalendarId] = useState(config.calendarId || 'primary');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshData();
    }
  }, [isOpen]);

  const refreshData = () => {
    const currentConfig = getGoogleCalendarConfig();
    setConfig(currentConfig);
    setCustomCalendarId(currentConfig.calendarId || 'primary');
    setLogs(getGoogleCalendarLogs());
  };

  if (!isOpen) return null;

  const handleOAuthLogin = async () => {
    setIsAuthenticating(true);
    setActionSuccessMsg(null);
    try {
      const res = await authenticateGoogleCalendar();
      setActionSuccessMsg(`OAuth Login successful as ${res.email}! Token saved.`);
      refreshData();
    } catch (err: any) {
      setActionSuccessMsg(`OAuth Notice: ${err.message || 'Authentication session updated'}`);
      refreshData();
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerifyAuth = async () => {
    setIsVerifying(true);
    setActionSuccessMsg(null);
    try {
      const res = await verifyOAuthAuthentication();
      if (res.valid) {
        setActionSuccessMsg(`OAuth Token & Calendar ID '${res.calendarId}' verified successfully!`);
      }
      refreshData();
    } catch (err: any) {
      console.error('Verification error:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveCalendarId = (e: React.FormEvent) => {
    e.preventDefault();
    saveGoogleCalendarConfig({ calendarId: customCalendarId });
    setActionSuccessMsg(`Calendar ID updated to '${customCalendarId}'`);
    refreshData();
  };

  const handleTestCreateEvent = async () => {
    setIsTestingCreate(true);
    setActionSuccessMsg(null);
    const testAppointment: Appointment = {
      id: `TEST-APPT-${Math.floor(1000 + Math.random() * 9000)}`,
      leadId: `LD-TEST-${Math.floor(100 + Math.random() * 900)}`,
      customerName: 'Diagnostic Test Guest',
      phone: '+1 (555) 019-2831',
      email: config.email || 'imrankhan.scaleflow@gmail.com',
      service: 'Diagnostic Calendar API Verification',
      date: new Date().toISOString().split('T')[0],
      time: '02:00 PM',
      status: 'confirmed',
      createdTime: new Date().toISOString()
    };

    try {
      const res = await createGoogleCalendarEvent(testAppointment);
      if (res.success) {
        setActionSuccessMsg(`Test Event successfully created in Google Calendar! Event ID: ${res.eventId}`);
      }
      refreshData();
    } catch (err: any) {
      console.error('Test event creation error:', err);
    } finally {
      setIsTestingCreate(false);
    }
  };

  const handleClearLogs = () => {
    clearGoogleCalendarLogs();
    setLogs([]);
    setSelectedLog(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0c0c14] border border-[#1f1f30] rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f1f30] flex items-center justify-between bg-[#10101c]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                Google Calendar Integration Diagnostics & Request Inspector
              </h3>
              <p className="text-[11px] text-gray-400">
                Audit OAuth tokens, API calls, Calendar IDs, and live request/response payloads
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Success Alert */}
        {actionSuccessMsg && (
          <div className="px-6 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between">
            <span className="flex items-center gap-2 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              {actionSuccessMsg}
            </span>
            <button onClick={() => setActionSuccessMsg(null)} className="text-gray-400 hover:text-white text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Cards: Status & Diagnostic Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: OAuth Token Status */}
            <div className="bg-[#12121e] border border-[#1d1d2e] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">
                  1. OAuth Authentication
                </span>
                {config.accessToken ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Token Active
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> No Token
                  </span>
                )}
              </div>

              <div className="space-y-1 text-xs">
                <div className="text-gray-300 font-mono truncate" title={config.email}>
                  Account: <span className="text-brand-300 font-semibold">{config.email || 'Not connected'}</span>
                </div>
                <div className="text-gray-500 text-[10px]">
                  Verified: {config.lastVerifiedAt ? new Date(config.lastVerifiedAt).toLocaleTimeString() : 'Never'}
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  onClick={handleOAuthLogin}
                  disabled={isAuthenticating}
                  className="w-full py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isAuthenticating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                  {config.accessToken ? 'Re-authenticate OAuth' : 'Authenticate with Google'}
                </button>
                
                <button
                  onClick={handleVerifyAuth}
                  disabled={isVerifying || !config.accessToken}
                  className="w-full py-1.5 bg-[#1a1a2e] hover:bg-[#25253e] disabled:opacity-40 text-gray-200 text-[11px] font-medium rounded-lg border border-[#2a2a40] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isVerifying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                  Verify Token Validity
                </button>
              </div>
            </div>

            {/* Card 2: Calendar ID Verification */}
            <div className="bg-[#12121e] border border-[#1d1d2e] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">
                  2. Calendar Target
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  ID: {config.calendarId}
                </span>
              </div>

              <form onSubmit={handleSaveCalendarId} className="space-y-2">
                <label className="block text-[10px] text-gray-400 font-mono">Target Calendar ID:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customCalendarId}
                    onChange={(e) => setCustomCalendarId(e.target.value)}
                    placeholder="e.g. primary or email@domain.com"
                    className="flex-1 px-2.5 py-1.5 bg-[#08080f] border border-[#202030] rounded-lg text-xs text-white font-mono focus:border-brand-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </form>

              <div className="text-[10px] text-gray-500 leading-relaxed pt-1">
                Note: Use <code className="text-brand-300">primary</code> to target the default Google Calendar for the authenticated account.
              </div>
            </div>

            {/* Card 3: Live Test & Sync Execution */}
            <div className="bg-[#12121e] border border-[#1d1d2e] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider font-semibold">
                  3. Execution & Testing
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  config.lastSyncStatus === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : config.lastSyncStatus === 'failed'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                }`}>
                  Sync: {config.lastSyncStatus?.toUpperCase()}
                </span>
              </div>

              <div className="text-xs text-gray-300">
                Trigger a live Google Calendar event creation call with request/response capture:
              </div>

              <button
                onClick={handleTestCreateEvent}
                disabled={isTestingCreate || !config.accessToken}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-900/20"
              >
                {isTestingCreate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Trigger Test Event Creation API Call
              </button>
            </div>

          </div>

          {/* Last Error Display if any */}
          {config.lastError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl space-y-1">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Latest Failure Error Details:
              </div>
              <p className="text-xs font-mono text-red-300 bg-[#160a0a] p-2.5 rounded-lg border border-red-500/20 overflow-x-auto break-all">
                {config.lastError}
              </p>
            </div>
          )}

          {/* Request / Response Log Inspector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-brand-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  API Request & Response Audit Logs ({logs.length})
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={refreshData}
                  className="px-2.5 py-1 bg-[#161625] hover:bg-[#202035] text-gray-300 text-[11px] font-medium rounded-lg border border-[#252538] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Refresh Logs
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
                <Clock className="w-6 h-6 text-gray-600 mx-auto" />
                <p className="text-xs text-gray-400">No Google Calendar API logs recorded yet.</p>
                <p className="text-[11px] text-gray-500">Run a test event creation or book an appointment to capture live logs.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Log List */}
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
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

                        <div className="flex items-center justify-between text-[11px] font-mono">
                          <span className="text-white font-bold">{log.type}</span>
                          <span className="text-gray-400">{log.request.method}</span>
                        </div>

                        {log.response?.status && (
                          <div className="text-[10px] font-mono text-gray-400 flex items-center justify-between pt-1 border-t border-[#1a1a2a]">
                            <span>HTTP Status: <strong className={log.response.status < 300 ? 'text-emerald-400' : 'text-red-400'}>{log.response.status} {log.response.statusText}</strong></span>
                            <span>Calendar ID: <span className="text-brand-300">{log.request.calendarId}</span></span>
                          </div>
                        )}

                        {log.error && (
                          <p className="text-[10px] font-mono text-red-400 truncate pt-1">
                            Error: {log.error}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Log Inspector Detail */}
                <div className="bg-[#08080f] border border-[#1d1d2e] rounded-xl p-4 space-y-3 max-h-[350px] overflow-y-auto">
                  {selectedLog ? (
                    <div className="space-y-3 text-xs font-mono">
                      <div className="flex items-center justify-between border-b border-[#1d1d2e] pb-2">
                        <span className="text-brand-300 font-bold">{selectedLog.type}</span>
                        <span className="text-[10px] text-gray-500">{selectedLog.timestamp}</span>
                      </div>

                      {/* Request Section */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          REQUEST OUTGOING PAYLOAD:
                        </span>
                        <div className="p-2.5 bg-[#0e0e17] border border-[#1a1a2a] rounded-lg space-y-1 text-[11px]">
                          <div><span className="text-gray-500">Method:</span> <span className="text-emerald-400">{selectedLog.request.method}</span></div>
                          <div><span className="text-gray-500">URL:</span> <span className="text-gray-300 break-all">{selectedLog.request.url}</span></div>
                          <div><span className="text-gray-500">Calendar ID:</span> <span className="text-brand-300">{selectedLog.request.calendarId}</span></div>
                          <div><span className="text-gray-500">Auth Header:</span> <span className="text-gray-400">{selectedLog.request.headers.Authorization}</span></div>
                          {selectedLog.request.body && (
                            <div className="mt-2 pt-2 border-t border-[#1a1a2a]">
                              <span className="text-gray-500 block mb-1">Body JSON:</span>
                              <pre className="text-[10px] text-emerald-300/90 whitespace-pre-wrap overflow-x-auto bg-[#050508] p-2 rounded">
                                {JSON.stringify(selectedLog.request.body, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Response Section */}
                      <div className="space-y-1 pt-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          RESPONSE INCOMING PAYLOAD:
                        </span>
                        {selectedLog.response ? (
                          <div className="p-2.5 bg-[#0e0e17] border border-[#1a1a2a] rounded-lg space-y-1 text-[11px]">
                            <div><span className="text-gray-500">Status Code:</span> <span className={selectedLog.response.status < 300 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{selectedLog.response.status} {selectedLog.response.statusText}</span></div>
                            <div className="mt-2 pt-2 border-t border-[#1a1a2a]">
                              <span className="text-gray-500 block mb-1">Response JSON Body:</span>
                              <pre className="text-[10px] text-indigo-300/90 whitespace-pre-wrap overflow-x-auto bg-[#050508] p-2 rounded">
                                {JSON.stringify(selectedLog.response.body, null, 2)}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] rounded-lg">
                            No response received (Network error or request halted before response).
                          </div>
                        )}
                      </div>

                      {/* Error if present */}
                      {selectedLog.error && (
                        <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg space-y-1">
                          <span className="font-bold text-red-400 text-[10px] block">EXACT ERROR MESSAGE:</span>
                          <p className="text-[11px] break-all">{selectedLog.error}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-center p-8 text-gray-500 text-xs">
                      Click any log entry on the left to inspect its detailed request and response payload.
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#1f1f30] bg-[#10101c] flex items-center justify-between">
          <span className="text-[10px] font-mono text-gray-500">
            ScaleFlow Google Calendar API Integration Engine v2.4
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
