/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  AlertTriangle, 
  Settings, 
  Play, 
  User, 
  Clock, 
  ExternalLink,
  Plus,
  Trash2,
  Database,
  Table,
  Zap,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Check,
  ListFilter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getGoogleSheetsConfig, 
  saveGoogleSheetsConfig, 
  getGoogleSheetsAnalytics, 
  getGoogleSheetsSyncLogs,
  getGoogleSheetsRows,
  syncAllLeadsToGoogleSheets,
  createNewSpreadsheet,
  runGoogleSheetsAutomatedTestSuite,
  DEFAULT_SHEET_COLUMNS,
  SheetRowData
} from '../lib/googleSheets';
import { GoogleSheetsConfig, GoogleSheetsAnalytics, GoogleSheetsSyncLog, Lead } from '../types';

export function SheetsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'rows' | 'settings' | 'testing'>('overview');
  const [config, setConfig] = useState<GoogleSheetsConfig>(getGoogleSheetsConfig());
  const [analytics, setAnalytics] = useState<GoogleSheetsAnalytics>(getGoogleSheetsAnalytics());
  const [logs, setLogs] = useState<GoogleSheetsSyncLog[]>(getGoogleSheetsSyncLogs());
  const [sheetRows, setSheetRows] = useState<SheetRowData[]>(getGoogleSheetsRows());
  const [leads, setLeads] = useState<Lead[]>([]);

  // Search & Filter for rows
  const [rowSearchTerm, setRowSearchTerm] = useState('');

  // Settings form state
  const [spreadsheetId, setSpreadsheetId] = useState(config.spreadsheetId);
  const [spreadsheetName, setSpreadsheetName] = useState(config.spreadsheetName);
  const [worksheetName, setWorksheetName] = useState(config.worksheetName);
  const [autoSync, setAutoSync] = useState(config.autoSyncEnabled);
  const [logConvs, setLogConvs] = useState(config.logConversationsEnabled);

  // Bulk sync state
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);

  // Test suite state
  const [testSuiteRunning, setTestSuiteRunning] = useState(false);
  const [testSteps, setTestSteps] = useState<Array<{ name: string; status: 'pending' | 'running' | 'success' | 'failed'; log: string }>>([
    { name: 'Connect Google Sheets', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Create a new spreadsheet if needed', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Add a test lead', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Update the test lead', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Verify the correct row updates', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Delete the test record if required', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Display successful synchronization', status: 'pending', log: 'Waiting to execute...' },
    { name: 'Update dashboard statistics', status: 'pending', log: 'Waiting to execute...' }
  ]);
  const [testSummary, setTestSummary] = useState<{ completed: boolean; success: boolean; message: string } | null>(null);

  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const refreshData = () => {
      const cfg = getGoogleSheetsConfig();
      const ana = getGoogleSheetsAnalytics();
      const lg = getGoogleSheetsSyncLogs();
      const rw = getGoogleSheetsRows();
      setConfig(cfg);
      setAnalytics(ana);
      setLogs(lg);
      setSheetRows(rw);

      const savedLeads = localStorage.getItem('scaleflow_leads');
      if (savedLeads) {
        try { setLeads(JSON.parse(savedLeads)); } catch (e) {}
      }
    };

    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, []);

  // Toggle OAuth Connection
  const handleToggleConnection = () => {
    const updated = saveGoogleSheetsConfig({ connected: !config.connected });
    setConfig(updated);
    showToast(
      updated.connected ? '✓ Google Sheets API connected securely via OAuth!' : '⚠️ Google Sheets integration disconnected.',
      updated.connected ? 'success' : 'info'
    );
  };

  // Create new spreadsheet
  const handleCreateNewSheet = async () => {
    setIsCreatingSheet(true);
    try {
      const res = await createNewSpreadsheet(`ScaleFlow CRM Master Sync (${new Date().toLocaleDateString()})`);
      setConfig(getGoogleSheetsConfig());
      setSpreadsheetId(res.spreadsheetId);
      setSpreadsheetName(`ScaleFlow CRM Master Sync (${new Date().toLocaleDateString()})`);
      showToast(`✨ Created new Google Spreadsheet! ID: ${res.spreadsheetId.slice(0, 12)}...`, 'success');
    } catch (e: any) {
      showToast(`Error creating spreadsheet: ${e.message}`, 'error');
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Manual Bulk Sync
  const handleManualBulkSync = async () => {
    if (leads.length === 0) {
      showToast('No leads found to synchronize.', 'info');
      return;
    }

    setIsBulkSyncing(true);
    try {
      const res = await syncAllLeadsToGoogleSheets(leads);
      setSheetRows(getGoogleSheetsRows());
      setLogs(getGoogleSheetsSyncLogs());
      setAnalytics(getGoogleSheetsAnalytics());
      showToast(`✓ Synchronized ${res.synced} leads to Google Sheets in ${res.timeMs}ms!`, 'success');
    } catch (e: any) {
      showToast(`Sync error: ${e.message}`, 'error');
    } finally {
      setIsBulkSyncing(false);
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    const updated = saveGoogleSheetsConfig({
      spreadsheetId,
      spreadsheetName,
      worksheetName,
      autoSyncEnabled: autoSync,
      logConversationsEnabled: logConvs
    });
    setConfig(updated);
    showToast('✓ Google Sheets configuration & field mappings saved!', 'success');
  };

  // Run 8-Step Automated Diagnostic Test Suite
  const handleRunDiagnosticSuite = async () => {
    setTestSuiteRunning(true);
    setTestSummary(null);

    setTestSteps([
      { name: 'Connect Google Sheets', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Create a new spreadsheet if needed', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Add a test lead', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Update the test lead', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Verify the correct row updates', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Delete the test record if required', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Display successful synchronization', status: 'pending', log: 'Waiting to execute...' },
      { name: 'Update dashboard statistics', status: 'pending', log: 'Waiting to execute...' }
    ]);

    const success = await runGoogleSheetsAutomatedTestSuite((stepIdx, status, log) => {
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
        ? ' All 8 Google Sheets automated synchronization tests passed! Row insertion, updates, and metrics verified.'
        : '⚠️ Diagnostic suite encountered errors during step execution.'
    });

    setSheetRows(getGoogleSheetsRows());
    setAnalytics(getGoogleSheetsAnalytics());
    setLogs(getGoogleSheetsSyncLogs());
  };

  // Filtered rows for Sheet viewer
  const filteredRows = sheetRows.filter(r => {
    if (!rowSearchTerm) return true;
    const q = rowSearchTerm.toLowerCase();
    return (
      r.leadId.toLowerCase().includes(q) ||
      (r.data['Name'] && r.data['Name'].toLowerCase().includes(q)) ||
      (r.data['Email'] && r.data['Email'].toLowerCase().includes(q)) ||
      (r.data['Status'] && r.data['Status'].toLowerCase().includes(q)) ||
      (r.data['Service Requested'] && r.data['Service Requested'].toLowerCase().includes(q))
    );
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

      {/* Header Banner & Connection Status */}
      <div className="p-6 bg-gradient-to-r from-emerald-600/15 via-teal-500/10 to-transparent border border-emerald-500/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex-shrink-0 shadow-inner">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-display text-white tracking-tight">Google Sheets Integration</h1>
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
              Account: <strong className="text-white font-mono">{config.accountEmail}</strong> • Active Sheet: <strong className="text-emerald-300">{config.spreadsheetName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <a
            href={config.spreadsheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-[#12121a] hover:bg-[#1a1a26] text-gray-300 hover:text-white border border-[#222232] text-xs font-bold flex items-center gap-2 transition-all"
          >
            <ExternalLink className="w-4 h-4 text-emerald-400" />
            <span>Open in Google Sheets</span>
          </a>

          <button
            onClick={() => handleRunDiagnosticSuite()}
            disabled={testSuiteRunning}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Run 8-Step Test</span>
          </button>
          
          <button
            onClick={handleToggleConnection}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              config.connected
                ? 'bg-[#12121a] hover:bg-rose-500/10 text-rose-300 border-rose-500/30'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500'
            }`}
          >
            {config.connected ? 'Disconnect Sheets' : 'Reconnect OAuth'}
          </button>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-[#08080c] border border-[#1a1a24] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Synced Leads</p>
            <p className="text-lg font-bold font-mono text-white mt-0.5">{analytics.totalSyncedLeads}</p>
          </div>
          <Database className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="p-4 bg-[#08080c] border border-[#1a1a24] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Successful Syncs</p>
            <p className="text-lg font-bold font-mono text-emerald-400 mt-0.5">{analytics.successfulSyncs}</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="p-4 bg-[#08080c] border border-[#1a1a24] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sync Failures</p>
            <p className="text-lg font-bold font-mono text-rose-400 mt-0.5">{analytics.failedSyncs}</p>
          </div>
          <XCircle className="w-5 h-5 text-rose-400" />
        </div>

        <div className="p-4 bg-[#08080c] border border-[#1a1a24] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Pending Queue</p>
            <p className="text-lg font-bold font-mono text-amber-400 mt-0.5">{analytics.pendingQueueCount}</p>
          </div>
          <Clock className="w-5 h-5 text-amber-400" />
        </div>

        <div className="p-4 bg-[#08080c] border border-[#1a1a24] rounded-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Avg Latency</p>
            <p className="text-lg font-bold font-mono text-violet-400 mt-0.5">{analytics.avgSyncTimeMs}ms</p>
          </div>
          <Zap className="w-5 h-5 text-violet-400" />
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-[#1a1a24] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-white bg-emerald-500/5'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Sync Overview & Audit Logs ({logs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rows')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'rows'
              ? 'border-emerald-500 text-white bg-emerald-500/5'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Table className="w-4 h-4 text-emerald-400" />
          <span>Live Sheet Viewer ({filteredRows.length} Rows)</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'settings'
              ? 'border-emerald-500 text-white bg-emerald-500/5'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Sheet & Column Field Mapping</span>
        </button>

        <button
          onClick={() => setActiveTab('testing')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'testing'
              ? 'border-emerald-500 text-white bg-emerald-500/5'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Play className="w-4 h-4 text-emerald-400" />
          <span>Automated 8-Step Test Suite</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & LOGS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="p-4 bg-[#08080c] border border-[#1a1a24] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white font-display">Instant Synchronization Controls</h2>
              <p className="text-xs text-gray-400">Trigger manual sync of historical CRM leads or create a new dedicated Google Spreadsheet.</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleCreateNewSheet}
                disabled={isCreatingSheet}
                className="px-4 py-2 rounded-xl bg-[#12121a] hover:bg-[#1c1c28] text-gray-300 hover:text-white border border-[#222232] text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isCreatingSheet ? <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> : <Plus className="w-4 h-4 text-emerald-400" />}
                <span>Create New Spreadsheet</span>
              </button>

              <button
                onClick={handleManualBulkSync}
                disabled={isBulkSyncing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isBulkSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Sync All {leads.length} Leads Now</span>
              </button>
            </div>
          </div>

          {/* Sync Audit History Log Table */}
          <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Live Synchronization Audit History</span>
              </h2>
              <span className="text-xs text-gray-500 font-mono">Last sync: {config.lastSyncTime}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#1a1a24] text-gray-500 text-[10px] uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4">Time</th>
                    <th className="py-3 px-4">Lead ID</th>
                    <th className="py-3 px-4">Lead Name</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#12121a]">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500 text-xs">
                        No synchronization history recorded yet.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#0e0e14] transition-colors font-mono">
                        <td className="py-3 px-4 text-gray-400">{log.timestamp}</td>
                        <td className="py-3 px-4 text-emerald-400 font-bold">{log.leadId}</td>
                        <td className="py-3 px-4 text-white font-sans font-medium">{log.leadName}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            log.action === 'create' ? 'bg-emerald-500/15 text-emerald-300' :
                            log.action === 'update' ? 'bg-sky-500/15 text-sky-300' :
                            log.action === 'delete' ? 'bg-rose-500/15 text-rose-300' :
                            'bg-violet-500/15 text-violet-300'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 w-fit ${
                            log.status === 'success' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                            log.status === 'retrying' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse' :
                            'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {log.status === 'success' && <CheckCircle2 className="w-3 h-3" />}
                            {log.status === 'failed' && <XCircle className="w-3 h-3" />}
                            <span>{log.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-400">{log.durationMs}ms</td>
                        <td className="py-3 px-4 text-gray-300 font-sans truncate max-w-xs">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: LIVE SHEET VIEWER */}
      {activeTab === 'rows' && (
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#1a1a24] pb-4">
            <div>
              <h2 className="text-base font-bold text-white font-display">Live Google Sheet Matrix</h2>
              <p className="text-xs text-gray-400">Direct 1:1 view of all synchronized rows in sheet worksheet: <strong className="text-emerald-300">{config.worksheetName}</strong></p>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" />
              <input
                type="text"
                value={rowSearchTerm}
                onChange={(e) => setRowSearchTerm(e.target.value)}
                placeholder="Search sheet rows..."
                className="w-full bg-[#12121a] border border-[#22222f] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-[#1a1a24] rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#0e0e14] border-b border-[#1a1a24] text-gray-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-3 px-3">Row #</th>
                  <th className="py-3 px-3">Lead ID</th>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Phone</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">City</th>
                  <th className="py-3 px-3">Service Requested</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Appt Date</th>
                  <th className="py-3 px-3">Updated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#12121a]">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-gray-500 text-xs">
                      No matching rows in Google Sheet matrix.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((r) => (
                    <tr key={r.rowIndex} className="hover:bg-[#0e0e14] transition-colors">
                      <td className="py-2.5 px-3 font-mono text-emerald-400 font-bold">#{r.rowIndex}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-300">{r.leadId}</td>
                      <td className="py-2.5 px-3 font-bold text-white">{r.data['Name'] || 'N/A'}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-400">{r.data['Phone Number'] || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-gray-300 font-mono">{r.data['Email'] || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-gray-400">{r.data['City'] || 'N/A'}</td>
                      <td className="py-2.5 px-3 text-emerald-300 font-medium">{r.data['Service Requested'] || 'N/A'}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                          {r.data['Status']}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-gray-400">{r.data['Appointment Date']} {r.data['Appointment Time']}</td>
                      <td className="py-2.5 px-3 font-mono text-gray-500 text-[10px]">{r.lastUpdated}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS & COLUMN MAPPINGS */}
      {activeTab === 'settings' && (
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1a1a24] pb-4">
            <div>
              <h2 className="text-base font-bold text-white font-display">Google Sheets Configuration & Field Mapping</h2>
              <p className="text-xs text-gray-400">Map ScaleFlow lead attributes to Google Sheets columns and set automation behavior.</p>
            </div>
            <button
              onClick={handleSaveSettings}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              Save Configuration
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Spreadsheet Name</label>
                <input
                  type="text"
                  value={spreadsheetName}
                  onChange={(e) => setSpreadsheetName(e.target.value)}
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Spreadsheet ID</label>
                <input
                  type="text"
                  value={spreadsheetId}
                  onChange={(e) => setSpreadsheetId(e.target.value)}
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">Worksheet / Tab Name</label>
                <input
                  type="text"
                  value={worksheetName}
                  onChange={(e) => setWorksheetName(e.target.value)}
                  className="w-full bg-[#12121a] border border-[#22222f] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              <div className="p-4 bg-[#0e0e14] border border-[#1a1a24] rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">Automatic Lead Syncing</p>
                  <p className="text-[11px] text-gray-400">Sync new leads & status updates to Google Sheets instantly.</p>
                </div>
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="p-4 bg-[#0e0e14] border border-[#1a1a24] rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white">AI Conversation Transcript Logging</p>
                  <p className="text-[11px] text-gray-400">Include conversation summary, sentiment, and duration columns.</p>
                </div>
                <input
                  type="checkbox"
                  checked={logConvs}
                  onChange={(e) => setLogConvs(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Column Mapping Column */}
            <div className="space-y-4">
              <label className="block text-xs font-bold text-gray-300 mb-1">Default Column Schema (15 Standard + 5 AI Columns)</label>
              <div className="bg-[#0e0e14] border border-[#1a1a24] rounded-xl p-4 max-h-[350px] overflow-y-auto space-y-2">
                {DEFAULT_SHEET_COLUMNS.map((col, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[#12121a] border border-[#22222f] text-xs">
                    <span className="font-mono text-emerald-400 font-bold">Col {String.fromCharCode(65 + (idx % 26))}:</span>
                    <span className="text-white font-medium">{col}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500 bg-[#08080c] px-2 py-0.5 rounded">Active</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUTOMATED TEST SUITE */}
      {activeTab === 'testing' && (
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1a1a24] pb-4">
            <div>
              <h2 className="text-base font-bold text-white font-display">Automated 8-Step Google Sheets Verification Test Suite</h2>
              <p className="text-xs text-gray-400">Requirement 10: Tests OAuth connection, row creation, updating without duplication, row deletion, audit logging, and stats update.</p>
            </div>
            <button
              onClick={handleRunDiagnosticSuite}
              disabled={testSuiteRunning}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {testSuiteRunning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{testSuiteRunning ? 'Executing 8 Tests...' : 'Run Diagnostics Now'}</span>
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
