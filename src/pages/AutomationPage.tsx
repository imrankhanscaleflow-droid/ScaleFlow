/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Settings2, 
  Filter, 
  Play, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  History, 
  ArrowRight, 
  Activity, 
  AlertTriangle, 
  Check, 
  X, 
  Search, 
  Info, 
  ChevronRight, 
  Sliders, 
  Sparkles, 
  Cpu, 
  Terminal, 
  FileText, 
  RefreshCw, 
  Mail, 
  MessageSquare, 
  Phone, 
  Link, 
  User, 
  Database, 
  Tag, 
  UserCheck 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types for the Automation Engine ---
export interface WorkflowCondition {
  id: string;
  field: 'customer_name' | 'service' | 'date' | 'time' | 'status' | 'lead_source' | 'conv_length' | 'ai_confidence';
  operator: 'contains' | 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'is_set';
  value: string;
}

export interface WorkflowAction {
  id: string;
  type: 'send_email' | 'send_whatsapp' | 'send_sms' | 'create_lead' | 'update_lead' | 'book_appt' | 'notify_staff' | 'assign_human' | 'add_tag' | 'run_prompt' | 'call_webhook';
  config: {
    to?: string;
    subject?: string;
    body?: string;
    phone?: string;
    message?: string;
    templateId?: string;
    leadName?: string;
    company?: string;
    email?: string;
    leadStatus?: string;
    fieldToUpdate?: string;
    updateValue?: string;
    apptDate?: string;
    apptTime?: string;
    service?: string;
    staffEmail?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    agentId?: string;
    department?: string;
    tagName?: string;
    promptSystem?: string;
    promptInput?: string;
    webhookUrl?: string;
    webhookMethod?: 'GET' | 'POST' | 'PUT';
  };
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: 'new_lead' | 'new_conv' | 'appt_booked' | 'appt_cancelled' | 'handoff' | 'customer_msg' | 'biz_closed' | 'ai_failed';
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  enabled: boolean;
  lastSyncTime?: string;
  syncErrors?: string;
  createdAt: string;
}

export interface ExecutionLog {
  id: string;
  workflowId: string;
  workflowName: string;
  trigger: string;
  status: 'success' | 'failed';
  timestamp: string;
  details: string;
  error?: string;
}

// --- List Constant Definitions ---
const TRIGGERS_LIST = [
  { id: 'new_lead', name: 'New Lead', desc: 'Fires when a new prospect is logged into CRM' },
  { id: 'new_conv', name: 'New Conversation', desc: 'Fires when an automated dialogue starts' },
  { id: 'appt_booked', name: 'Appointment Booked', desc: 'Fires when a booking session is confirmed' },
  { id: 'appt_cancelled', name: 'Appointment Cancelled', desc: 'Fires when a client cancels or reschedules' },
  { id: 'handoff', name: 'Human Handoff', desc: 'Fires when AI signals support operator required' },
  { id: 'customer_msg', name: 'Customer Message', desc: 'Fires on incoming SMS, Chat, or Voice' },
  { id: 'biz_closed', name: 'Business Closed', desc: 'Fires if customer messages outside service hours' },
  { id: 'ai_failed', name: 'AI Failed to Answer', desc: 'Fires if model confidence drops below fallback threshold' },
];

const CONDITIONS_LIST = [
  { id: 'customer_name', name: 'Customer Name' },
  { id: 'service', name: 'Service of Interest' },
  { id: 'date', name: 'Appointment Date' },
  { id: 'time', name: 'Inquiry Time' },
  { id: 'status', name: 'Pipeline Status' },
  { id: 'lead_source', name: 'Lead Source' },
  { id: 'conv_length', name: 'Conversation Length' },
  { id: 'ai_confidence', name: 'AI Confidence Metric' },
];

const OPERATORS_LIST = [
  { id: 'contains', name: 'Contains' },
  { id: 'equals', name: 'Equals' },
  { id: 'not_equals', name: 'Does Not Equal' },
  { id: 'greater_than', name: 'Greater Than' },
  { id: 'less_than', name: 'Less Than' },
  { id: 'is_set', name: 'Is Configured/Set' },
];

const ACTIONS_LIST = [
  { id: 'send_email', name: 'Send Email', desc: 'Dispatches automated email alert' },
  { id: 'send_whatsapp', name: 'Send WhatsApp', desc: 'Sends templates message via WhatsApp API' },
  { id: 'send_sms', name: 'Send SMS', desc: 'Texts client via standard carrier gateway' },
  { id: 'create_lead', name: 'Create Lead', desc: 'Injects a new prospect card into CRM pipeline' },
  { id: 'update_lead', name: 'Update Lead', desc: 'Modifies fields or statuses of current lead' },
  { id: 'book_appt', name: 'Book Appointment', desc: 'Registers automatic calendar event slot' },
  { id: 'notify_staff', name: 'Notify Staff', desc: 'Sends internal warning to admin team' },
  { id: 'assign_human', name: 'Assign Human', desc: 'Pins a dedicated live agent to conversation' },
  { id: 'add_tag', name: 'Add Tag', desc: 'Attaches tracking labels to contact dossier' },
  { id: 'run_prompt', name: 'Run AI Prompt', desc: 'Executes sub-agent reasoning prompt chain' },
  { id: 'call_webhook', name: 'Call Webhook', desc: 'Triggers HTTP REST payload to external API' },
];

// Seed Workflows
const DEFAULT_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-101',
    name: 'High-Value Lead WhatsApp Route',
    description: 'If a direct lead with value > $5,000 logs in, notify immediately via SMS/WhatsApp and assign head agent.',
    trigger: 'new_lead',
    conditions: [
      { id: 'c-1', field: 'lead_source', operator: 'not_equals', value: 'Web Widget' },
      { id: 'c-2', field: 'ai_confidence', operator: 'greater_than', value: '85' }
    ],
    actions: [
      {
        id: 'a-1',
        type: 'send_whatsapp',
        config: {
          phone: '+1 (555) 019-2831',
          message: 'Alert: High-Value prospect logged! Direct voice triage requested.'
        }
      },
      {
        id: 'a-2',
        type: 'assign_human',
        config: {
          agentId: 'Senior Advisor Team',
          department: 'Executive Sales'
        }
      }
    ],
    enabled: true,
    lastSyncTime: '2026-07-17T05:12:00-07:00',
    createdAt: '2026-07-15T12:00:00-07:00'
  },
  {
    id: 'wf-102',
    name: 'Handoff SMS Escalation',
    description: 'When receptionist requires human intervention, text staff and trigger external webhook to Slack.',
    trigger: 'handoff',
    conditions: [
      { id: 'c-3', field: 'status', operator: 'equals', value: 'new' }
    ],
    actions: [
      {
        id: 'a-3',
        type: 'send_sms',
        config: {
          phone: '+15550198000',
          message: 'ScaleFlow Escalation! Human assistance needed immediately on Voice Node.'
        }
      },
      {
        id: 'a-4',
        type: 'call_webhook',
        config: {
          webhookUrl: 'https://hooks.slack.com/services/T00/B00/X00',
          webhookMethod: 'POST'
        }
      }
    ],
    enabled: true,
    lastSyncTime: '2026-07-17T04:30:15-07:00',
    createdAt: '2026-07-16T09:00:00-07:00'
  },
  {
    id: 'wf-103',
    name: 'Auto-Responder on AI Failure',
    description: 'Send automatic recovery email when AI confidence drops below safety threshold.',
    trigger: 'ai_failed',
    conditions: [
      { id: 'c-4', field: 'ai_confidence', operator: 'less_than', value: '70' }
    ],
    actions: [
      {
        id: 'a-5',
        type: 'send_email',
        config: {
          to: 'support@scaleflow.io',
          subject: 'AI Confidence Fallback Triggered',
          body: 'An inbound voice dialogue was escalated due to low confidence. Please review transcripts.'
        }
      },
      {
        id: 'a-6',
        type: 'add_tag',
        config: {
          tagName: 'Needs Review'
        }
      }
    ],
    enabled: false,
    syncErrors: 'SSL Handshake failure during REST call simulation',
    createdAt: '2026-07-16T15:20:00-07:00'
  }
];

// Seed logs
const DEFAULT_LOGS: ExecutionLog[] = [
  {
    id: 'log-201',
    workflowId: 'wf-101',
    workflowName: 'High-Value Lead WhatsApp Route',
    trigger: 'New Lead',
    status: 'success',
    timestamp: '2026-07-17T05:12:00-07:00',
    details: 'Trigger evaluated matching all conditions. Dispatched WhatsApp payload to +1 (555) 019-2831. Assigned operator [Senior Advisor Team] successfully.'
  },
  {
    id: 'log-202',
    workflowId: 'wf-102',
    workflowName: 'Handoff SMS Escalation',
    trigger: 'Human Handoff',
    status: 'success',
    timestamp: '2026-07-17T04:30:15-07:00',
    details: 'Lead status matched equals "new". Sent SMS notification. Dispatched webhook payload to https://hooks.slack.com/services/T00/B00/X00 with code 200 OK.'
  },
  {
    id: 'log-203',
    workflowId: 'wf-103',
    workflowName: 'Auto-Responder on AI Failure',
    trigger: 'AI Failed to Answer',
    status: 'failed',
    timestamp: '2026-07-16T18:44:11-07:00',
    details: 'Confidence (64) fell below criteria (70). Evaluated conditions: True. Action Send Email succeeded, but REST Webhook integration failed.',
    error: 'SSL Handshake failure during REST call simulation (Code 502)'
  }
];

export function AutomationPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(() => {
    const saved = localStorage.getItem('scaleflow_workflows');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_WORKFLOWS;
      }
    }
    return DEFAULT_WORKFLOWS;
  });

  const [logs, setLogs] = useState<ExecutionLog[]>(() => {
    const saved = localStorage.getItem('scaleflow_automation_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_LOGS;
      }
    }
    return DEFAULT_LOGS;
  });

  // Save changes
  useEffect(() => {
    localStorage.setItem('scaleflow_workflows', JSON.stringify(workflows));
  }, [workflows]);

  useEffect(() => {
    localStorage.setItem('scaleflow_automation_logs', JSON.stringify(logs));
  }, [logs]);

  // Toast Alerts State
  const [toasts, setToasts] = useState<{ id: string; text: string; type: 'success' | 'error' | 'info' }[]>([]);
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // State Management for Builder Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  // Form Fields
  const [wfName, setWfName] = useState('');
  const [wfDesc, setWfDesc] = useState('');
  const [wfTrigger, setWfTrigger] = useState<'new_lead' | 'new_conv' | 'appt_booked' | 'appt_cancelled' | 'handoff' | 'customer_msg' | 'biz_closed' | 'ai_failed'>('new_lead');
  const [wfConditions, setWfConditions] = useState<WorkflowCondition[]>([]);
  const [wfActions, setWfActions] = useState<WorkflowAction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Open creation modal
  const openCreateModal = () => {
    setEditingWorkflow(null);
    setWfName('');
    setWfDesc('');
    setWfTrigger('new_lead');
    setWfConditions([]);
    setWfActions([
      {
        id: `act-${Date.now()}`,
        type: 'send_email',
        config: {
          to: 'admin@scaleflow.io',
          subject: 'Workflow Automated Alert',
          body: 'Hello Team, this event is auto-triggered.'
        }
      }
    ]);
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (wf: Workflow) => {
    setEditingWorkflow(wf);
    setWfName(wf.name);
    setWfDesc(wf.description);
    setWfTrigger(wf.trigger);
    setWfConditions(wf.conditions);
    setWfActions(wf.actions);
    setIsModalOpen(true);
  };

  // Duplicate workflow
  const handleDuplicate = (wf: Workflow) => {
    const duplicated: Workflow = {
      ...wf,
      id: `wf-${Math.floor(100 + Math.random() * 900)}`,
      name: `${wf.name} - Copy`,
      createdAt: new Date().toISOString(),
      enabled: false // Default to disabled to avoid unwanted triggers
    };
    setWorkflows(prev => [duplicated, ...prev]);
    showToast(`Duplicated "${wf.name}" successfully.`, 'success');
  };

  // Delete workflow
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete the "${name}" workflow?`)) {
      setWorkflows(prev => prev.filter(w => w.id !== id));
      showToast(`Workflow "${name}" deleted.`, 'info');
    }
  };

  // Toggle active state
  const handleToggleEnabled = (id: string, name: string, currentState: boolean) => {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, enabled: !currentState } : w));
    showToast(`"${name}" has been ${!currentState ? 'enabled' : 'disabled'}.`, !currentState ? 'success' : 'info');
  };

  // Add Condition Block
  const addCondition = () => {
    const newCond: WorkflowCondition = {
      id: `cond-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      field: 'customer_name',
      operator: 'contains',
      value: ''
    };
    setWfConditions(prev => [...prev, newCond]);
  };

  // Remove Condition Block
  const removeCondition = (id: string) => {
    setWfConditions(prev => prev.filter(c => c.id !== id));
  };

  // Update Condition Field
  const updateCondition = (id: string, updates: Partial<WorkflowCondition>) => {
    setWfConditions(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  // Add Action Block
  const addAction = () => {
    const newAct: WorkflowAction = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'send_email',
      config: {
        to: '',
        subject: 'Event notification',
        body: 'The automation workflow completed successfully.'
      }
    };
    setWfActions(prev => [...prev, newAct]);
  };

  // Remove Action Block
  const removeAction = (id: string) => {
    if (wfActions.length <= 1) {
      showToast('A workflow must execute at least 1 action.', 'error');
      return;
    }
    setWfActions(prev => prev.filter(a => a.id !== id));
  };

  // Update Action Block
  const updateAction = (id: string, type: WorkflowAction['type'], configUpdates: any) => {
    setWfActions(prev => prev.map(a => {
      if (a.id === id) {
        // If type changed, reset or merge config
        const finalType = type || a.type;
        return {
          ...a,
          type: finalType,
          config: {
            ...a.config,
            ...configUpdates
          }
        };
      }
      return a;
    }));
  };

  // Submit and Save Workflow
  const handleSaveWorkflow = (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!wfName.trim()) {
      showToast('Workflow name is required.', 'error');
      return;
    }

    if (wfActions.length === 0) {
      showToast('You must add at least one execution action.', 'error');
      return;
    }

    // Validate Action Inputs
    for (let i = 0; i < wfActions.length; i++) {
      const act = wfActions[i];
      if (act.type === 'send_email') {
        if (!act.config.to || !act.config.subject) {
          showToast(`Action #${i + 1} (Send Email) requires a destination and subject.`, 'error');
          return;
        }
      } else if (act.type === 'send_sms' || act.type === 'send_whatsapp') {
        if (!act.config.phone || !act.config.message) {
          showToast(`Action #${i + 1} (${act.type === 'send_sms' ? 'Send SMS' : 'WhatsApp'}) requires a phone number and message.`, 'error');
          return;
        }
      } else if (act.type === 'call_webhook') {
        if (!act.config.webhookUrl) {
          showToast(`Action #${i + 1} (Call Webhook) requires an API Endpoint URL.`, 'error');
          return;
        }
      }
    }

    const savedWorkflow: Workflow = {
      id: editingWorkflow?.id || `wf-${Math.floor(100 + Math.random() * 900)}`,
      name: wfName.trim(),
      description: wfDesc.trim() || 'Custom workflow trigger configured on CRM metrics.',
      trigger: wfTrigger,
      conditions: wfConditions,
      actions: wfActions,
      enabled: editingWorkflow ? editingWorkflow.enabled : true,
      lastSyncTime: editingWorkflow?.lastSyncTime,
      syncErrors: editingWorkflow?.syncErrors,
      createdAt: editingWorkflow?.createdAt || new Date().toISOString()
    };

    if (editingWorkflow) {
      setWorkflows(prev => prev.map(w => w.id === savedWorkflow.id ? savedWorkflow : w));
      showToast(`Workflow "${savedWorkflow.name}" updated successfully.`, 'success');
    } else {
      setWorkflows(prev => [savedWorkflow, ...prev]);
      showToast(`Workflow "${savedWorkflow.name}" created successfully!`, 'success');
    }

    setIsModalOpen(false);
  };

  // Simulate Workflow Run (Test trigger)
  const handleSimulateRun = (wf: Workflow) => {
    showToast(`Initiating simulation run for: "${wf.name}"`, 'info');
    
    setTimeout(() => {
      const randSuccess = Math.random() > 0.15; // 85% success rate
      const timestamp = new Date().toISOString();
      const triggerName = TRIGGERS_LIST.find(t => t.id === wf.trigger)?.name || wf.trigger;
      
      const newLog: ExecutionLog = {
        id: `log-${Date.now()}`,
        workflowId: wf.id,
        workflowName: wf.name,
        trigger: triggerName,
        status: randSuccess ? 'success' : 'failed',
        timestamp,
        details: randSuccess 
          ? `[Simulator] Trigger conditions matching successful. Processed ${wf.actions.length} action item(s) sequentially: [${wf.actions.map(a => a.type.toUpperCase()).join(' -> ')}]. Output response: 200 OK.`
          : `[Simulator] Executing target pipeline sequence failed on final webhook/rest delivery stack.`,
        error: randSuccess ? undefined : 'Service Unavailable: Gateway Timeout on API Node (Code 504)'
      };

      // Append Log
      setLogs(prev => [newLog, ...prev]);

      // Update last sync details on the workflow card
      setWorkflows(prev => prev.map(w => {
        if (w.id === wf.id) {
          return {
            ...w,
            lastSyncTime: timestamp,
            syncErrors: randSuccess ? undefined : 'Gateway Timeout on API Node (Code 504)'
          };
        }
        return w;
      }));

      if (randSuccess) {
        showToast(`Simulation completed: "${wf.name}" executed successfully!`, 'success');
      } else {
        showToast(`Simulation failed: "${wf.name}" encountered a Gateway Timeout error.`, 'error');
      }
    }, 1200);
  };

  // Clear Execution Log History
  const handleClearLogs = () => {
    if (window.confirm('Delete all execution history logs? This cannot be undone.')) {
      setLogs([]);
      showToast('Execution history logs cleared.', 'info');
    }
  };

  // Filter workflows
  const filteredWorkflows = workflows.filter(w => {
    const q = searchQuery.toLowerCase();
    return w.name.toLowerCase().includes(q) || 
           w.description.toLowerCase().includes(q) || 
           w.trigger.toLowerCase().includes(q);
  });

  // Helpers to get trigger & action labels
  const getTriggerLabel = (id: string) => {
    return TRIGGERS_LIST.find(t => t.id === id)?.name || id;
  };

  const getActionLabel = (id: string) => {
    return ACTIONS_LIST.find(a => a.id === id)?.name || id;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#050507] p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Header Widget */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#13131c] pb-6">
        <div>
          <div className="flex items-center gap-2 text-brand-400 font-sans font-semibold text-[11px] uppercase tracking-wider mb-1">
            <Zap className="w-3.5 h-3.5" />
            <span>AI Orchestration Hub</span>
          </div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">Automation Engine</h2>
          <p className="text-xs text-gray-400 mt-1">
            Build and manage multi-step workflows triggered by CRM lead updates, real-time appointments, or chatbot handoffs.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-brand-600/10 hover:shadow-brand-600/25 transition-all border border-brand-500/10 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Workflow
        </button>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#08080c] border border-[#1a1a24] rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/10">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-sans font-semibold text-gray-500 uppercase tracking-wider">Total Workflows</div>
            <div className="text-lg font-bold text-white font-sans mt-0.5">{workflows.length}</div>
          </div>
        </div>

        <div className="bg-[#08080c] border border-[#1a1a24] rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-sans font-semibold text-gray-500 uppercase tracking-wider">Active Pipelines</div>
            <div className="text-lg font-bold text-white font-sans mt-0.5">
              {workflows.filter(w => w.enabled).length}
            </div>
          </div>
        </div>

        <div className="bg-[#08080c] border border-[#1a1a24] rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/10">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-sans font-semibold text-gray-500 uppercase tracking-wider">Executions Today</div>
            <div className="text-lg font-bold text-white font-sans mt-0.5">
              {logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length} Runs
            </div>
          </div>
        </div>

        <div className="bg-[#08080c] border border-[#1a1a24] rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/10">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-sans font-semibold text-gray-500 uppercase tracking-wider">Active Warnings</div>
            <div className="text-lg font-bold text-white font-sans mt-0.5">
              {workflows.filter(w => w.syncErrors).length} Nodes
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Builder Workflows vs Simulator & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Pipelines list (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-display font-semibold text-white tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-400" />
              Automated Pipelines
            </h3>
            
            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#08080c] border border-[#1a1a24] rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>
          </div>

          {/* Workflow Cards */}
          <div className="space-y-4">
            {filteredWorkflows.length === 0 ? (
              <div className="bg-[#08080c] border border-[#1a1a24] rounded-xl p-10 text-center flex flex-col items-center justify-center">
                <Sliders className="w-8 h-8 text-gray-600 mb-3" />
                <p className="text-xs text-gray-400 font-medium">No automation pipelines found matching your query.</p>
                <button
                  onClick={openCreateModal}
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 text-[11px] font-medium text-brand-400 rounded-lg transition-colors cursor-pointer border border-brand-500/20"
                >
                  Create custom workflow
                </button>
              </div>
            ) : (
              filteredWorkflows.map((wf) => (
                <div 
                  key={wf.id}
                  className={`bg-[#08080c] border rounded-xl overflow-hidden shadow-md transition-all ${
                    wf.enabled ? 'border-[#1a1a24]' : 'border-[#13131c] opacity-80'
                  }`}
                >
                  {/* Card Header Area */}
                  <div className="p-4 sm:p-5 border-b border-[#12121a]/80 bg-[#050508]/40 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-semibold text-white tracking-tight">{wf.name}</h4>
                        <span className={`text-[9px] font-sans font-semibold px-2 py-0.5 rounded-full ${
                          wf.enabled 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/10'
                        }`}>
                          {wf.enabled ? 'ACTIVE' : 'PAUSED'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed">{wf.description}</p>
                    </div>

                    {/* Active Enable/Disable Toggle */}
                    <button
                      onClick={() => handleToggleEnabled(wf.id, wf.name, wf.enabled)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        wf.enabled ? 'bg-brand-500' : 'bg-gray-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          wf.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Flow Map Visualizer */}
                  <div className="p-4 sm:p-5 bg-[#08080c] space-y-3.5">
                    
                    {/* Trigger Row */}
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1 text-[10px] font-sans font-semibold text-gray-500 uppercase w-20 flex-shrink-0">
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Trigger</span>
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-xs font-medium text-white bg-[#0e0e16] border border-[#1d1d29] px-2.5 py-1 rounded-lg font-sans">
                          {getTriggerLabel(wf.trigger)}
                        </span>
                        <span className="text-[10px] text-gray-500 font-sans">
                          {TRIGGERS_LIST.find(t => t.id === wf.trigger)?.desc}
                        </span>
                      </div>
                    </div>

                    {/* Conditions Row (If configured) */}
                    {wf.conditions.length > 0 && (
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-1 text-[10px] font-sans font-semibold text-gray-500 uppercase w-20 flex-shrink-0">
                          <Filter className="w-3 h-3 text-sky-400" />
                          <span>Criteria</span>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-1.5 items-center">
                          {wf.conditions.map((c, idx) => (
                            <span 
                              key={c.id} 
                              className="text-[10px] text-sky-300 font-sans font-medium bg-sky-950/40 border border-sky-500/20 px-2 py-0.5 rounded-md"
                            >
                              {CONDITIONS_LIST.find(item => item.id === c.field)?.name || c.field}{' '}
                              <span className="text-sky-400 font-bold">
                                {c.operator === 'contains' ? 'contains' : c.operator === 'equals' ? 'equals' : 'does not equal'}
                              </span>{' '}
                              <span className="font-mono text-[9px]">"{c.value || '*'}"</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="flex items-start gap-2.5">
                      <div className="flex items-center gap-1 text-[10px] font-sans font-semibold text-gray-500 uppercase w-20 flex-shrink-0 mt-1">
                        <ArrowRight className="w-3 h-3 text-emerald-400" />
                        <span>Actions</span>
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        {wf.actions.map((act, idx) => (
                          <div 
                            key={act.id} 
                            className="flex items-center justify-between text-xs text-gray-300 bg-[#040406]/60 border border-[#13131c] px-3 py-1.5 rounded-lg"
                          >
                            <span className="font-semibold flex items-center gap-1.5 text-gray-200 font-sans">
                              <span className="text-[9px] font-sans font-semibold text-gray-500 bg-[#12121a] px-1.5 py-0.5 rounded">
                                {idx + 1}
                              </span>
                              {getActionLabel(act.type)}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500 truncate max-w-[200px] sm:max-w-xs">
                              {act.type === 'send_sms' || act.type === 'send_whatsapp' 
                                ? act.config.message 
                                : act.type === 'send_email' 
                                  ? `to: ${act.config.to}` 
                                  : act.type === 'call_webhook' 
                                    ? act.config.webhookUrl 
                                    : 'Configured payload'
                              }
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sync Error and Sync Alerts */}
                    {wf.syncErrors && (
                      <div className="flex items-center gap-2 p-2 bg-red-950/20 border border-red-500/10 rounded-lg text-[10px] text-red-400 mt-2 font-sans font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        <span>Warning: {wf.syncErrors}</span>
                      </div>
                    )}

                    {/* Last run indicator */}
                    {wf.lastSyncTime && (
                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-sans font-medium mt-2 pt-2 border-t border-[#12121a]/60">
                        <span>Last Execution Run</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(wf.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    )}

                  </div>

                  {/* Card Controls Footer */}
                  <div className="px-4 py-2.5 bg-[#050508]/60 border-t border-[#12121a]/80 flex items-center justify-between flex-wrap gap-2">
                    <button
                      onClick={() => handleSimulateRun(wf)}
                      disabled={!wf.enabled}
                      className="flex items-center gap-1 px-2.5 py-1 bg-brand-500/10 hover:bg-brand-500/15 disabled:opacity-50 disabled:cursor-not-allowed text-[10px] font-semibold text-brand-300 rounded-md transition-colors border border-brand-500/10 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      Test Simulation
                    </button>

                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        onClick={() => openEditModal(wf)}
                        className="p-1.5 hover:bg-[#12121a] text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Edit Pipeline"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(wf)}
                        className="p-1.5 hover:bg-[#12121a] text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                        title="Duplicate Flow"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(wf.id, wf.name)}
                        className="p-1.5 hover:bg-red-950/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete Workflow"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Monitor & Logs (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-semibold text-white tracking-tight flex items-center gap-2">
              <History className="w-4 h-4 text-brand-400" />
              Live Execution Logs
            </h3>
            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-[10px] text-gray-500 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer"
              >
                Clear History
              </button>
            )}
          </div>

          <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#13131c] pb-3 text-xs text-gray-400 font-semibold justify-between">
              <span>Pipeline Logs Feed</span>
              <span className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-sans font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Listen
              </span>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="text-center py-10 flex flex-col items-center justify-center">
                  <Terminal className="w-8 h-8 text-gray-600 mb-3" />
                  <p className="text-xs text-gray-400 font-sans">No recent execution logs.</p>
                  <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] leading-relaxed mx-auto font-sans">
                    Click "Test Simulation" on any active workflow to watch trace logs fire.
                  </p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="text-xs space-y-1.5 border-b border-[#12121a]/80 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-gray-200 block truncate max-w-[180px] sm:max-w-xs font-sans">
                        {log.workflowName}
                      </span>
                      <span className={`text-[9px] font-sans font-semibold uppercase px-1.5 py-0.2 rounded ${
                        log.status === 'success' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {log.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-gray-500 font-sans font-semibold">
                      <span>Trigger: {log.trigger}</span>
                      <span>
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-400 bg-[#040406] border border-[#13131c] p-2 rounded-lg font-mono leading-relaxed whitespace-pre-wrap">
                      {log.details}
                    </p>

                    {log.error && (
                      <div className="text-[9px] text-red-400 bg-red-950/20 border border-red-500/10 p-1.5 rounded-md flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                        <span className="truncate">{log.error}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>

      {/* DETAILED WORKFLOW BUILDER MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0" 
              onClick={() => setIsModalOpen(false)} 
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-[#08080c] border border-[#1a1a24] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-[#12121a] flex items-center justify-between bg-[#040406]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-brand-500/10 text-brand-400">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-display font-bold text-white tracking-tight">
                    {editingWorkflow ? 'Configure Pipeline' : 'Initiate Automation Pipeline'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#12121a] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Content Area */}
              <form onSubmit={handleSaveWorkflow} className="flex-1 overflow-y-auto p-6 space-y-5">
                
                {/* Name & Desc */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-sans font-semibold uppercase tracking-wider text-gray-400">Workflow Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lead SLA Warning"
                      value={wfName}
                      onChange={(e) => setWfName(e.target.value)}
                      className="block w-full px-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-sans font-semibold uppercase tracking-wider text-gray-400">Description</label>
                    <input
                      type="text"
                      placeholder="e.g. Triggers escalations on CRM delay"
                      value={wfDesc}
                      onChange={(e) => setWfDesc(e.target.value)}
                      className="block w-full px-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans"
                    />
                  </div>
                </div>

                {/* Trigger Section */}
                <div className="p-4 bg-[#040406] border border-[#181822] rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-display font-semibold text-white">1. Select Event Trigger</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-sans font-semibold uppercase text-gray-500 tracking-wider">Automation Trigger</label>
                      <select
                        value={wfTrigger}
                        onChange={(e) => setWfTrigger(e.target.value as any)}
                        className="block w-full px-3 py-2 bg-[#08080c] border border-[#1d1d29] rounded-lg text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-brand-500 font-sans cursor-pointer"
                      >
                        {TRIGGERS_LIST.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="bg-[#08080c] border border-[#13131c] p-2.5 rounded-lg flex items-start gap-2">
                      <Info className="w-3.5 h-3.5 text-brand-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-gray-400 leading-normal font-sans">
                        {TRIGGERS_LIST.find(t => t.id === wfTrigger)?.desc}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Conditions Block */}
                <div className="p-4 bg-[#040406] border border-[#181822] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-sky-400" />
                      <span className="text-xs font-display font-semibold text-white">2. Set Pipeline Conditions (Optional)</span>
                    </div>
                    <button
                      type="button"
                      onClick={addCondition}
                      className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer font-sans"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Criteria
                    </button>
                  </div>

                  {wfConditions.length === 0 ? (
                    <div className="text-center py-3 text-[10px] text-gray-500 border border-dashed border-[#181822] rounded-lg font-sans">
                      No criteria added. This workflow will always execute on trigger events.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {wfConditions.map((cond, index) => (
                        <div key={cond.id} className="flex items-center gap-2 flex-wrap sm:flex-nowrap bg-[#08080c] p-2 border border-[#151520] rounded-lg">
                          <select
                            value={cond.field}
                            onChange={(e) => updateCondition(cond.id, { field: e.target.value as any })}
                            className="bg-[#040406] border border-[#1d1d29] rounded-md px-2 py-1 text-[11px] text-gray-300 focus:outline-none font-sans cursor-pointer"
                          >
                            {CONDITIONS_LIST.map(item => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>

                          <select
                            value={cond.operator}
                            onChange={(e) => updateCondition(cond.id, { operator: e.target.value as any })}
                            className="bg-[#040406] border border-[#1d1d29] rounded-md px-2 py-1 text-[11px] text-gray-300 focus:outline-none font-sans cursor-pointer"
                          >
                            {OPERATORS_LIST.map(item => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>

                          {cond.operator !== 'is_set' && (
                            <input
                              type="text"
                              placeholder="Criteria value..."
                              value={cond.value}
                              onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                              className="flex-1 bg-[#040406] border border-[#1d1d29] rounded-md px-2 py-1 text-[11px] text-gray-300 focus:outline-none min-w-[100px] font-sans"
                            />
                          )}

                          <button
                            type="button"
                            onClick={() => removeCondition(cond.id)}
                            className="p-1 hover:bg-[#12121a] text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions Block */}
                <div className="p-4 bg-[#040406] border border-[#181822] rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-display font-semibold text-white">3. Configure Execution Actions</span>
                    </div>
                    <button
                      type="button"
                      onClick={addAction}
                      className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 cursor-pointer font-sans"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Step Action
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {wfActions.map((act, index) => (
                      <div key={act.id} className="bg-[#08080c] border border-[#151520] rounded-xl p-4.5 space-y-3 relative">
                        {/* Title Row */}
                        <div className="flex items-center justify-between border-b border-[#13131c] pb-2">
                          <span className="text-[11px] font-sans text-brand-400 font-semibold">
                            Action Step #{index + 1}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            <select
                              value={act.type}
                              onChange={(e) => updateAction(act.id, e.target.value as any, {})}
                              className="bg-[#040406] border border-[#1d1d29] rounded-md px-2.5 py-1 text-[11px] text-gray-300 focus:outline-none font-sans cursor-pointer"
                            >
                              {ACTIONS_LIST.map(opt => (
                                <option key={opt.id} value={opt.id}>{opt.name}</option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => removeAction(act.id)}
                              className="p-1 hover:bg-[#12121a] text-gray-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                              title="Remove Step"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Action Sub-form dynamically based on action type */}
                        {act.type === 'send_email' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="col-span-2 space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">Recipient Email(s)</label>
                              <input
                                type="text"
                                placeholder="e.g. admin@scaleflow.io"
                                value={act.config.to || ''}
                                onChange={(e) => updateAction(act.id, 'send_email', { to: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none font-sans"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">Subject Line</label>
                              <input
                                type="text"
                                placeholder="Lead Notification"
                                value={act.config.subject || ''}
                                onChange={(e) => updateAction(act.id, 'send_email', { subject: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none font-sans"
                              />
                            </div>
                            <div className="col-span-2 space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">Email Body</label>
                              <textarea
                                rows={2}
                                placeholder="Enter email body markup..."
                                value={act.config.body || ''}
                                onChange={(e) => updateAction(act.id, 'send_email', { body: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none resize-none font-sans"
                              />
                            </div>
                          </div>
                        )}

                        {(act.type === 'send_sms' || act.type === 'send_whatsapp') && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">Phone Number</label>
                              <input
                                type="text"
                                placeholder="e.g. +15550192831"
                                value={act.config.phone || ''}
                                onChange={(e) => updateAction(act.id, act.type, { phone: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none font-sans"
                              />
                            </div>
                            {act.type === 'send_whatsapp' && (
                              <div className="space-y-1">
                                <label className="text-[9px] text-gray-400 font-sans font-semibold">WhatsApp Template Name (Optional)</label>
                                <input
                                  type="text"
                                  placeholder="e.g. lead_sla_alert"
                                  value={act.config.templateId || ''}
                                  onChange={(e) => updateAction(act.id, 'send_whatsapp', { templateId: e.target.value })}
                                  className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none font-sans"
                                />
                              </div>
                            )}
                            <div className="col-span-2 space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">Message Text</label>
                              <textarea
                                rows={2}
                                placeholder="ScaleFlow automated alert details..."
                                value={act.config.message || ''}
                                onChange={(e) => updateAction(act.id, act.type, { message: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none resize-none font-sans"
                              />
                            </div>
                          </div>
                        )}

                        {act.type === 'create_lead' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">Prospect Name</label>
                              <input
                                type="text"
                                placeholder="ScaleFlow automated contact"
                                value={act.config.leadName || ''}
                                onChange={(e) => updateAction(act.id, 'create_lead', { leadName: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none font-sans"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">Company</label>
                              <input
                                type="text"
                                placeholder="System Generated"
                                value={act.config.company || ''}
                                onChange={(e) => updateAction(act.id, 'create_lead', { company: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none font-sans"
                              />
                            </div>
                          </div>
                        )}

                        {act.type === 'call_webhook' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="col-span-2 space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">Target Webhook URL *</label>
                              <input
                                type="url"
                                required
                                placeholder="https://hooks.slack.com/services/..."
                                value={act.config.webhookUrl || ''}
                                onChange={(e) => updateAction(act.id, 'call_webhook', { webhookUrl: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">HTTP Method</label>
                              <select
                                value={act.config.webhookMethod || 'POST'}
                                onChange={(e) => updateAction(act.id, 'call_webhook', { webhookMethod: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none font-sans cursor-pointer"
                              >
                                <option value="POST">POST (JSON Payload)</option>
                                <option value="GET">GET (Query String)</option>
                                <option value="PUT">PUT (Update resource)</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {act.type === 'run_prompt' && (
                          <div className="grid grid-cols-1 gap-3 text-xs">
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">System Prompt Instructions</label>
                              <textarea
                                rows={2}
                                placeholder="e.g. Evaluate if the following inquiry is positive or requesting pricing..."
                                value={act.config.promptSystem || ''}
                                onChange={(e) => updateAction(act.id, 'run_prompt', { promptSystem: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none resize-none font-sans"
                              />
                            </div>
                          </div>
                        )}

                        {act.type === 'assign_human' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">Agent ID or Pool Group</label>
                              <input
                                type="text"
                                placeholder="e.g. Sales Team Lead"
                                value={act.config.agentId || ''}
                                onChange={(e) => updateAction(act.id, 'assign_human', { agentId: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none font-sans"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">Department Allocation</label>
                              <input
                                type="text"
                                placeholder="e.g. Client Success"
                                value={act.config.department || ''}
                                onChange={(e) => updateAction(act.id, 'assign_human', { department: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none font-sans"
                              />
                            </div>
                          </div>
                        )}

                        {act.type === 'add_tag' && (
                          <div className="grid grid-cols-1 gap-3 text-xs">
                            <div className="space-y-1">
                              <label className="text-[9px] text-gray-400 font-sans font-semibold">CRM Tag Label Name</label>
                              <input
                                type="text"
                                placeholder="e.g. Hot Lead"
                                value={act.config.tagName || ''}
                                onChange={(e) => updateAction(act.id, 'add_tag', { tagName: e.target.value })}
                                className="w-full bg-[#040406] border border-[#1d1d29] rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none font-sans"
                              />
                            </div>
                          </div>
                        )}

                        {/* Fallback for unconfigured inputs */}
                        {!['send_email', 'send_sms', 'send_whatsapp', 'create_lead', 'call_webhook', 'run_prompt', 'assign_human', 'add_tag'].includes(act.type) && (
                          <p className="text-[10px] text-gray-500 font-sans bg-[#040406] p-2.5 rounded-lg border border-[#13131c]">
                            Action will compile with automatic system parameters. No secondary fields required.
                          </p>
                        )}

                      </div>
                    ))}
                  </div>
                </div>

              </form>

              {/* Modal Actions Footer */}
              <div className="px-6 py-4 border-t border-[#12121a] bg-[#040406] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  Discard Changes
                </button>
                <button
                  onClick={handleSaveWorkflow}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white rounded-xl transition-all border border-brand-500/10 cursor-pointer"
                >
                  {editingWorkflow ? 'Update Pipeline' : 'Deploy Pipeline'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOAST SYSTEM PORTAL */}
      <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium pointer-events-auto max-w-sm animate-slide-in-right ${
              toast.type === 'error'
                ? 'bg-red-950/90 border-red-500/30 text-red-200'
                : toast.type === 'info'
                  ? 'bg-indigo-950/90 border-indigo-500/30 text-indigo-200'
                  : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-200'
            }`}
          >
            {toast.type === 'error' ? (
              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            )}
            <p className="flex-1">{toast.text}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
