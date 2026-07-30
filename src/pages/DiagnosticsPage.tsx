/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Calendar, 
  Mail, 
  FileSpreadsheet, 
  Clock, 
  Zap, 
  Database, 
  ShieldCheck, 
  Cpu, 
  Wrench, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink, 
  Search, 
  Play, 
  Layers, 
  Server, 
  UserCheck, 
  Radio, 
  Terminal,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  runAllIntegrationDiagnostics, 
  checkGoogleCalendarHealth, 
  checkGmailHealth, 
  checkGoogleSheetsHealth, 
  checkCalendlyHealth, 
  checkWebhooksHealth, 
  checkCRMHealth, 
  checkAIAPIHealth, 
  checkDatabaseHealth, 
  checkAuthenticationHealth, 
  repairIntegration,
  SystemHealthReport, 
  IntegrationHealthResult,
  DiagnosticLog
} from '../lib/diagnostics';

export function DiagnosticsPage() {
  const [report, setReport] = useState<SystemHealthReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [repairingId, setRepairingId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Run full health report on mount
  useEffect(() => {
    handleRunAllTests();
  }, []);

  const handleRunAllTests = async () => {
    setLoading(true);
    try {
      const newReport = await runAllIntegrationDiagnostics();
      setReport(newReport);
      showToast(`✓ Diagnostic test suite completed. Health score: ${newReport.overallHealthPct}%`, 'success');
    } catch (err: any) {
      showToast(`Error running health checks: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSingle = async (id: string) => {
    setTestingId(id);
    try {
      let singleResult: IntegrationHealthResult;
      switch (id) {
        case 'google_calendar': singleResult = await checkGoogleCalendarHealth(); break;
        case 'gmail': singleResult = await checkGmailHealth(); break;
        case 'google_sheets': singleResult = await checkGoogleSheetsHealth(); break;
        case 'calendly': singleResult = await checkCalendlyHealth(); break;
        case 'webhooks': singleResult = await checkWebhooksHealth(); break;
        case 'crm': singleResult = await checkCRMHealth(); break;
        case 'ai_api': singleResult = await checkAIAPIHealth(); break;
        case 'database': singleResult = await checkDatabaseHealth(); break;
        case 'auth': singleResult = await checkAuthenticationHealth(); break;
        default: throw new Error('Unknown integration ID');
      }

      setReport(prev => {
        if (!prev) return null;
        const updatedResults = prev.results.map(r => r.id === id ? singleResult : r);
        const workingCount = updatedResults.filter(r => r.status === 'working').length;
        const warningCount = updatedResults.filter(r => r.status === 'warning').length;
        const failedCount = updatedResults.filter(r => r.status === 'failed').length;
        const healthScore = updatedResults.reduce((acc, r) => {
          if (r.status === 'working') return acc + 100;
          if (r.status === 'warning') return acc + 60;
          return acc;
        }, 0);
        const overallHealthPct = Math.round(healthScore / updatedResults.length);

        return {
          ...prev,
          workingCount,
          warningCount,
          failedCount,
          overallHealthPct,
          timestamp: new Date().toLocaleString(),
          results: updatedResults
        };
      });

      showToast(`Verified ${singleResult.name}: Status is ${singleResult.status.toUpperCase()}`, singleResult.status === 'working' ? 'success' : 'info');
    } catch (err: any) {
      showToast(`Failed to test ${id}: ${err.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleAutoRepair = async (id: string) => {
    setRepairingId(id);
    try {
      const res = await repairIntegration(id);
      if (res.success) {
        showToast(res.message, 'success');
        await handleTestSingle(id);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      showToast(`Repair exception: ${err.message}`, 'error');
    } finally {
      setRepairingId(null);
    }
  };

  const getIntegrationIcon = (category: string) => {
    const iconClass = "w-5 h-5";
    switch (category) {
      case 'calendar': return <Calendar className={`${iconClass} text-sky-400`} />;
      case 'email': return <Mail className={`${iconClass} text-indigo-400`} />;
      case 'spreadsheet': return <FileSpreadsheet className={`${iconClass} text-emerald-400`} />;
      case 'booking': return <Clock className={`${iconClass} text-violet-400`} />;
      case 'developer': return <Radio className={`${iconClass} text-amber-400`} />;
      case 'crm': return <Layers className={`${iconClass} text-teal-400`} />;
      case 'ai': return <Zap className={`${iconClass} text-rose-400`} />;
      case 'database': return <Server className={`${iconClass} text-blue-400`} />;
      case 'auth': return <ShieldCheck className={`${iconClass} text-emerald-400`} />;
      default: return <Cpu className={`${iconClass} text-gray-400`} />;
    }
  };

  const filteredResults = report?.results.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter || (categoryFilter === 'issues' && r.status !== 'working');
    return matchesSearch && matchesCategory;
  }) || [];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
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

      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-sky-600/15 via-indigo-500/10 to-transparent border border-sky-500/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex-shrink-0 shadow-inner">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-display text-white tracking-tight">Integration Diagnostics & Health Checker</h1>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                Live Verification Engine
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Real-time API reachability, OAuth validation, read/write parity & automated repair.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunAllTests}
          disabled={loading}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-sky-600/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 w-full md:w-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Executing Diagnostic Suite...' : 'Run All 9 Tests Now'}</span>
        </button>
      </div>

      {/* Final System Health Report Card */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="p-5 bg-[#08080c] border border-[#1a1a24] rounded-2xl flex flex-col justify-between">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Overall System Health</p>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-3xl font-extrabold font-mono ${
                report.overallHealthPct >= 90 ? 'text-emerald-400' :
                report.overallHealthPct >= 70 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {report.overallHealthPct}%
              </span>
              <span className="text-xs text-gray-400 font-medium">score</span>
            </div>
            <div className="w-full bg-[#12121a] h-2 rounded-full mt-3 overflow-hidden border border-[#222232]">
              <div 
                className={`h-full transition-all duration-500 ${
                  report.overallHealthPct >= 90 ? 'bg-emerald-400' :
                  report.overallHealthPct >= 70 ? 'bg-amber-400' : 'bg-rose-400'
                }`}
                style={{ width: `${report.overallHealthPct}%` }}
              />
            </div>
          </div>

          <div className="p-5 bg-[#08080c] border border-[#1a1a24] rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Integrations</p>
              <p className="text-2xl font-extrabold font-mono text-white mt-1">{report.totalIntegrations}</p>
            </div>
            <Cpu className="w-6 h-6 text-sky-400 opacity-80" />
          </div>

          <div className="p-5 bg-[#08080c] border border-emerald-500/20 bg-emerald-500/5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">🟢 Working</p>
              <p className="text-2xl font-extrabold font-mono text-emerald-400 mt-1">{report.workingCount}</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>

          <div className="p-5 bg-[#08080c] border border-amber-500/20 bg-amber-500/5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">🟡 Warning</p>
              <p className="text-2xl font-extrabold font-mono text-amber-400 mt-1">{report.warningCount}</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          </div>

          <div className="p-5 bg-[#08080c] border border-rose-500/20 bg-rose-500/5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider">🔴 Failed</p>
              <p className="text-2xl font-extrabold font-mono text-rose-400 mt-1">{report.failedCount}</p>
            </div>
            <XCircle className="w-6 h-6 text-rose-400" />
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-[#08080c] border border-[#1a1a24] rounded-2xl">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search integrations or services..."
            className="w-full bg-[#12121a] border border-[#22222f] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/50"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {['all', 'issues', 'calendar', 'email', 'spreadsheet', 'booking', 'ai', 'database', 'auth'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-[#12121a] text-gray-400 hover:text-white border border-[#22222f]'
              }`}
            >
              {cat === 'issues' ? '⚠️ Issues Only' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Integrations Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResults.map((result) => {
          const isTesting = testingId === result.id;
          const isRepairing = repairingId === result.id;
          const isExpandedLogs = expandedLogId === result.id;

          return (
            <div
              key={result.id}
              className={`p-5 bg-[#08080c] border rounded-2xl space-y-4 transition-all hover:border-[#2a2a3a] ${
                result.status === 'working' ? 'border-[#1a1a24]' :
                result.status === 'warning' ? 'border-amber-500/30 bg-amber-500/2' :
                'border-rose-500/30 bg-rose-500/2'
              }`}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#12121a] border border-[#22222f]">
                    {getIntegrationIcon(result.category)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-display">{result.name}</h3>
                    <p className="text-[11px] font-mono text-gray-400 mt-0.5">Latency: {result.latencyMs}ms</p>
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 border ${
                  result.status === 'working' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                  result.status === 'warning' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                  'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    result.status === 'working' ? 'bg-emerald-400' :
                    result.status === 'warning' ? 'bg-amber-400' : 'bg-rose-400'
                  }`} />
                  {result.status === 'working' ? '🟢 Working' : result.status === 'warning' ? '🟡 Warning' : '🔴 Failed'}
                </span>
              </div>

              {/* Check Criteria Matrix */}
              <div className="grid grid-cols-2 gap-2 p-3 bg-[#0e0e14] border border-[#1a1a24] rounded-xl text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  {result.authValid ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  <span className={result.authValid ? 'text-gray-300' : 'text-rose-400 font-bold'}>Auth Valid</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {result.apiReachable ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  <span className={result.apiReachable ? 'text-gray-300' : 'text-rose-400 font-bold'}>API Reachable</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {result.permissionsGranted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-amber-400" />}
                  <span className={result.permissionsGranted ? 'text-gray-300' : 'text-amber-400'}>Permissions</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {result.readWorks ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                  <span className={result.readWorks ? 'text-gray-300' : 'text-rose-400 font-bold'}>Read Check</span>
                </div>

                <div className="col-span-2 flex items-center gap-1.5 pt-1 border-t border-[#1a1a24]">
                  {result.writeWorks ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-amber-400" />}
                  <span className={result.writeWorks ? 'text-gray-300' : 'text-amber-400'}>Write Parity & Sync</span>
                </div>
              </div>

              {/* Failing Step & API Error Display */}
              {result.errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-start gap-2 text-rose-300 font-semibold font-mono">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
                    <span>{result.errorMessage}</span>
                  </div>
                </div>
              )}

              {/* Error Reason & Suggested Fix */}
              {result.status !== 'working' && result.reason && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start gap-2 text-amber-300 font-semibold">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{result.reason}</span>
                  </div>
                  {result.suggestedFix && (
                    <div className="text-[11px] text-gray-300 bg-[#08080c] p-2 rounded-lg border border-[#222232]">
                      <strong className="text-amber-400">Suggested Fix:</strong> {result.suggestedFix}
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestSingle(result.id)}
                  disabled={isTesting || isRepairing}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#12121a] hover:bg-[#1a1a28] text-gray-200 hover:text-white border border-[#222232] text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing...' : 'Test Now'}</span>
                </button>

                {result.canAutoRepair && result.status !== 'working' && (
                  <button
                    onClick={() => handleAutoRepair(result.id)}
                    disabled={isRepairing || isTesting}
                    className="px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Wrench className={`w-3.5 h-3.5 text-amber-400 ${isRepairing ? 'animate-spin' : ''}`} />
                    <span>{isRepairing ? 'Repairing...' : 'Auto Repair'}</span>
                  </button>
                )}

                <button
                  onClick={() => setExpandedLogId(isExpandedLogs ? null : result.id)}
                  className="px-3 py-2 rounded-xl bg-[#12121a] hover:bg-[#1a1a28] text-gray-400 hover:text-white border border-[#222232] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Terminal className="w-3.5 h-3.5 text-gray-400" />
                  <span>Logs</span>
                  {isExpandedLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Detailed Logs Collapsible Panel */}
              <AnimatePresence>
                {isExpandedLogs && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-[#050508] border border-[#1a1a24] rounded-xl space-y-2 text-[11px] font-mono max-h-48 overflow-y-auto">
                      <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider border-b border-[#12121a] pb-1">
                        Trace Audit Log ({result.logs.length} entries)
                      </p>
                      {result.logs.map((log, idx) => (
                        <div key={idx} className="space-y-0.5 border-b border-[#0e0e14] pb-1.5">
                          <div className="flex items-center justify-between text-gray-400">
                            <span className="text-[10px] text-gray-500">{log.timestamp}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                              log.type === 'request' ? 'bg-sky-500/15 text-sky-400' :
                              log.type === 'response' ? 'bg-emerald-500/15 text-emerald-400' :
                              log.type === 'error' ? 'bg-rose-500/15 text-rose-400' :
                              'bg-amber-500/15 text-amber-400'
                            }`}>
                              {log.type} {log.httpStatus ? `[${log.httpStatus}]` : ''}
                            </span>
                          </div>
                          <p className="text-gray-200 break-all">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
