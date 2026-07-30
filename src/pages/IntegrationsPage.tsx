/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Mail, 
  MessageSquare, 
  FileSpreadsheet, 
  Webhook, 
  Key, 
  RefreshCw, 
  Check, 
  X, 
  Settings, 
  AlertCircle, 
  ExternalLink, 
  Loader2, 
  Trash2, 
  Edit2, 
  Copy, 
  Plus, 
  Phone, 
  Shield, 
  Activity,
  PlusCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  FileCode,
  Smartphone,
  CheckCircle,
  Clock,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleCalendarDiagnosticModal } from '../components/GoogleCalendarDiagnosticModal';
import { CalendlyDiagnosticModal } from '../components/CalendlyDiagnosticModal';
import { 
  getGoogleCalendarConfig, 
  saveGoogleCalendarConfig, 
  authenticateGoogleCalendar, 
  verifyOAuthAuthentication 
} from '../lib/googleCalendar';
import {
  getCalendlyConfig,
  saveCalendlyConfig,
  verifyCalendlyConnection
} from '../lib/calendly';

// Interfaces
interface IntegrationSetting {
  id: string;
  name: string;
  category: 'productivity' | 'communication' | 'developer';
  enabled: boolean;
  connected: boolean;
  lastSync?: string;
  error?: string;
  details: any;
}

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  contentType: 'application/json' | 'application/x-www-form-urlencoded';
  lastTriggered?: string;
  lastResponse?: string;
}

interface ApiKeyItem {
  id: string;
  name: string;
  token: string;
  created: string;
  lastUsed: string;
  status: 'active' | 'revoked';
}

export function IntegrationsPage() {
  // --- Workspace Multi-tenant Identification ---
  const [businessId, setBusinessId] = useState('fallback');
  const [toasts, setToasts] = useState<{ id: string; text: string; type?: 'success' | 'error' }[]>([]);

  const addToast = (text: string, type: 'success' | 'error' = 'success') => {
    const id = `toast-${Date.now()}`;
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    const savedSession = localStorage.getItem('scaleflow_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.businessId) {
          setBusinessId(parsed.businessId);
        }
      } catch (e) {}
    }
  }, []);

  // --- Filter Category ---
  const [activeCategory, setActiveCategory] = useState<'all' | 'productivity' | 'communication' | 'developer'>('all');

  // --- Active Configuration Modal State ---
  const [configuringId, setConfiguringId] = useState<string | null>(null);

  // --- Mock Sycing States ---
  const [syncingId, setSyncingId] = useState<string | null>(null);

  // --- Integration Base Settings State ---
  const [integrations, setIntegrations] = useState<IntegrationSetting[]>(() => {
    return [
      {
        id: 'google-calendar',
        name: 'Google Calendar',
        category: 'productivity',
        enabled: false,
        connected: false,
        lastSync: 'Never synced',
        details: {
          email: '',
          twoWaySync: true,
          scopes: ['https://www.googleapis.com/auth/calendar.events']
        }
      },
      {
        id: 'calendly',
        name: 'Calendly',
        category: 'productivity',
        enabled: false,
        connected: false,
        lastSync: 'Never synced',
        details: {
          bookingLink: '',
          autoBook: true,
          apiKey: ''
        }
      },
      {
        id: 'gmail',
        name: 'Gmail',
        category: 'communication',
        enabled: false,
        connected: false,
        lastSync: 'Never synced',
        details: {
          email: '',
          sendConfirmation: true,
          sendReminders: true,
          smtpServer: 'smtp.gmail.com',
          smtpPort: '465'
        }
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp Business API',
        category: 'communication',
        enabled: false,
        connected: false,
        lastSync: 'Never synced',
        details: {
          phoneNumberId: '',
          wabaId: '',
          accessToken: '',
          whatsappNumber: '',
          sendConfirmations: true,
          sendReminders: true,
          sendFollowups: false
        }
      },
      {
        id: 'sms',
        name: 'Twilio SMS Gateway',
        category: 'communication',
        enabled: false,
        connected: false,
        lastSync: 'Never synced',
        details: {
          accountSid: '',
          authToken: '',
          fromNumber: '',
          sendReminders: true,
          sendVerification: true
        }
      },
      {
        id: 'google-sheets',
        name: 'Google Sheets',
        category: 'productivity',
        enabled: false,
        connected: false,
        lastSync: 'Never synced',
        details: {
          spreadsheetId: '',
          spreadsheetUrl: '',
          exportLeads: true,
          exportConversations: true,
          exportAppointments: true
        }
      }
    ];
  });

  // --- Webhooks CRUD State ---
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookItem | null>(null);
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookContentType, setWebhookContentType] = useState<'application/json' | 'application/x-www-form-urlencoded'>('application/json');
  const [webhookEvents, setWebhookEvents] = useState<string[]>(['leads.created']);
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testResponseLog, setTestResponseLog] = useState<{ id: string; log: string } | null>(null);

  // --- API Keys State ---
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [revealKeyId, setRevealKeyId] = useState<string | null>(null);

  // --- Load Isolated Data on Mount or when Business ID Swapped ---
  useEffect(() => {
    if (businessId === 'fallback') return;

    // Load integration configurations
    const savedIntegrations = localStorage.getItem(`scaleflow_integrations_${businessId}`);
    if (savedIntegrations) {
      try {
        setIntegrations(JSON.parse(savedIntegrations));
      } catch (e) {}
    } else {
      // Pull and update active bookingLink / whatsapp from general profile if available
      const savedSession = localStorage.getItem('scaleflow_session');
      if (savedSession) {
        try {
          const parsed = JSON.parse(savedSession);
          if (parsed.businessProfile) {
            const profile = parsed.businessProfile;
            setIntegrations(prev => prev.map(item => {
              if (item.id === 'calendly') {
                return {
                  ...item,
                  details: {
                    ...item.details,
                    bookingLink: profile.bookingLink || ''
                  }
                };
              }
              if (item.id === 'whatsapp') {
                return {
                  ...item,
                  details: {
                    ...item.details,
                    whatsappNumber: profile.whatsappNumber || ''
                  }
                };
              }
              return item;
            }));
          }
        } catch (e) {}
      }
    }

    // Load Webhooks
    const savedWebhooks = localStorage.getItem(`scaleflow_webhooks_${businessId}`);
    if (savedWebhooks) {
      try {
        setWebhooks(JSON.parse(savedWebhooks));
      } catch (e) {}
    } else {
      // Default Webhook
      const defaultWebhook: WebhookItem = {
        id: `wh-${Date.now()}`,
        name: 'CRM Sync Webhook',
        url: 'https://api.yourcrm.com/v1/leads/webhook',
        events: ['leads.created', 'appointments.booked'],
        status: 'active',
        contentType: 'application/json',
        lastTriggered: 'Never triggered'
      };
      setWebhooks([defaultWebhook]);
      localStorage.setItem(`scaleflow_webhooks_${businessId}`, JSON.stringify([defaultWebhook]));
    }

    // Load API Keys
    const savedApiKeys = localStorage.getItem(`scaleflow_apikeys_${businessId}`);
    if (savedApiKeys) {
      try {
        setApiKeys(JSON.parse(savedApiKeys));
      } catch (e) {}
    } else {
      // Default pre-seeded API Key for demo
      const defaultKey: ApiKeyItem = {
        id: `key-${Date.now()}`,
        name: 'Production Server Token',
        token: `sf_live_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 10)}`,
        created: new Date().toLocaleDateString(),
        lastUsed: new Date().toLocaleDateString(),
        status: 'active'
      };
      setApiKeys([defaultKey]);
      localStorage.setItem(`scaleflow_apikeys_${businessId}`, JSON.stringify([defaultKey]));
    }

  }, [businessId]);

  // --- Save Integration Settings into LocalStorage ---
  const saveIntegrations = (updated: IntegrationSetting[]) => {
    setIntegrations(updated);
    if (businessId !== 'fallback') {
      localStorage.setItem(`scaleflow_integrations_${businessId}`, JSON.stringify(updated));
    }
  };

  // --- Enable/Disable Toggle Trigger ---
  const handleToggleIntegration = (id: string) => {
    const updated = integrations.map(item => {
      if (item.id === id) {
        const nextEnabled = !item.enabled;
        addToast(`${item.name} integration ${nextEnabled ? 'enabled' : 'disabled'}.`);
        return {
          ...item,
          enabled: nextEnabled,
          // Auto-connect if simple or fallback required
          connected: nextEnabled ? item.connected : item.connected
        };
      }
      return item;
    });
    saveIntegrations(updated);
  };

  // --- Interactive Sync Feature ---
  const handleSyncNow = (id: string) => {
    const integration = integrations.find(item => item.id === id);
    if (!integration || !integration.connected) {
      addToast(`Please connect the ${integration?.name || 'integration'} before syncing.`, 'error');
      return;
    }

    setSyncingId(id);
    addToast(`Triggering dynamic synchronization pipeline for ${integration.name}...`);

    setTimeout(() => {
      const isSuccess = Math.random() > 0.05; // 95% success rate for real feel
      const nowString = new Date().toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const updated = integrations.map(item => {
        if (item.id === id) {
          return {
            ...item,
            lastSync: nowString,
            error: isSuccess ? undefined : 'SSL Peer handshake timeout (Error 524).'
          };
        }
        return item;
      });

      saveIntegrations(updated);
      setSyncingId(null);

      if (isSuccess) {
        addToast(`Successfully synchronized all active assets for ${integration.name}!`);
      } else {
        addToast(`Sync error detected on ${integration.name}. Check details.`, 'error');
      }
    }, 1500);
  };

  // --- Interactive Connect/Disconnect account modal triggers ---
  const handleOpenConfigure = (id: string) => {
    setConfiguringId(id);
  };

  const handleSaveConfiguration = (id: string, updatedDetails: any) => {
    const updated = integrations.map(item => {
      if (item.id === id) {
        return {
          ...item,
          connected: true,
          enabled: true,
          details: updatedDetails,
          lastSync: 'Sync pending...'
        };
      }
      return item;
    });
    saveIntegrations(updated);
    setConfiguringId(null);
    addToast(`${integrations.find(i => i.id === id)?.name} connected and configured successfully!`);
  };

  const handleDisconnect = (id: string) => {
    const updated = integrations.map(item => {
      if (item.id === id) {
        return {
          ...item,
          connected: false,
          enabled: false,
          lastSync: 'Never synced',
          error: undefined
        };
      }
      return item;
    });
    saveIntegrations(updated);
    setConfiguringId(null);
    addToast(`Account credentials removed for ${integrations.find(i => i.id === id)?.name}.`);
  };

  // --- Webhooks Actions ---
  const handleOpenWebhookCreate = () => {
    setEditingWebhook(null);
    setWebhookName('');
    setWebhookUrl('');
    setWebhookContentType('application/json');
    setWebhookEvents(['leads.created']);
    setShowWebhookForm(true);
  };

  const handleOpenWebhookEdit = (wh: WebhookItem) => {
    setEditingWebhook(wh);
    setWebhookName(wh.name);
    setWebhookUrl(wh.url);
    setWebhookContentType(wh.contentType);
    setWebhookEvents(wh.events);
    setShowWebhookForm(true);
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookName || !webhookUrl) {
      addToast('Please fill out all mandatory webhook fields.', 'error');
      return;
    }

    try {
      new URL(webhookUrl);
    } catch (_) {
      addToast('Invalid payload endpoint URL format.', 'error');
      return;
    }

    let updatedWebhooks: WebhookItem[];

    if (editingWebhook) {
      updatedWebhooks = webhooks.map(wh => {
        if (wh.id === editingWebhook.id) {
          return {
            ...wh,
            name: webhookName,
            url: webhookUrl,
            contentType: webhookContentType,
            events: webhookEvents
          };
        }
        return wh;
      });
      addToast('Webhook updated successfully.');
    } else {
      const newWh: WebhookItem = {
        id: `wh-${Date.now()}`,
        name: webhookName,
        url: webhookUrl,
        events: webhookEvents,
        status: 'active',
        contentType: webhookContentType,
        lastTriggered: 'Never triggered'
      };
      updatedWebhooks = [...webhooks, newWh];
      addToast('New subscription webhook registered.');
    }

    setWebhooks(updatedWebhooks);
    localStorage.setItem(`scaleflow_webhooks_${businessId}`, JSON.stringify(updatedWebhooks));
    setShowWebhookForm(false);
  };

  const handleDeleteWebhook = (id: string) => {
    const updated = webhooks.filter(wh => wh.id !== id);
    setWebhooks(updated);
    localStorage.setItem(`scaleflow_webhooks_${businessId}`, JSON.stringify(updated));
    addToast('Webhook deleted from pipeline.');
    if (testResponseLog && testResponseLog.id === id) {
      setTestResponseLog(null);
    }
  };

  const handleToggleWebhookStatus = (id: string) => {
    const updated = webhooks.map(wh => {
      if (wh.id === id) {
        const nextStatus = wh.status === 'active' ? 'inactive' : 'active';
        addToast(`Webhook subscription ${nextStatus === 'active' ? 'activated' : 'paused'}.`);
        return { ...wh, status: nextStatus as 'active' | 'inactive' };
      }
      return wh;
    });
    setWebhooks(updated);
    localStorage.setItem(`scaleflow_webhooks_${businessId}`, JSON.stringify(updated));
  };

  const handleTestWebhook = (wh: WebhookItem) => {
    setTestingWebhookId(wh.id);
    addToast(`Dispatching synthetic trigger payload to ${wh.name}...`);

    setTimeout(() => {
      const mockSuccess = !wh.url.includes('invalid') && Math.random() > 0.05;
      const now = new Date().toLocaleTimeString();
      const code = mockSuccess ? '200 OK' : '502 Bad Gateway';

      const payload = {
        event: wh.events[0] || 'leads.created',
        timestamp: Date.now(),
        business_id: businessId,
        data: {
          lead_id: 'LD-801',
          name: 'Sarah Jenkins',
          email: 'sjenkins@techops.io',
          phone: '+15550212344',
          status: 'qualified',
          value: '$8,500'
        }
      };

      const logText = `[${now}] Trigger Sent.\nEndpoint: ${wh.url}\nPayload Content-Type: ${wh.contentType}\nResponse Status: ${code}\n\nPayload:\n${JSON.stringify(payload, null, 2)}\n\nResponse Headers:\n{\n  "date": "${new Date().toUTCString()}",\n  "content-type": "application/json",\n  "server": "nginx/1.24.0"\n}`;

      setTestResponseLog({ id: wh.id, log: logText });
      setTestingWebhookId(null);

      const updated = webhooks.map(w => {
        if (w.id === wh.id) {
          return {
            ...w,
            lastTriggered: new Date().toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            lastResponse: code
          };
        }
        return w;
      });
      setWebhooks(updated);
      localStorage.setItem(`scaleflow_webhooks_${businessId}`, JSON.stringify(updated));

      if (mockSuccess) {
        addToast(`Webhook delivery successful: ${code}`);
      } else {
        addToast(`Webhook delivery failed: ${code}`, 'error');
      }
    }, 1200);
  };

  const handleToggleWebhookEvent = (ev: string) => {
    if (webhookEvents.includes(ev)) {
      if (webhookEvents.length > 1) {
        setWebhookEvents(prev => prev.filter(e => e !== ev));
      } else {
        addToast('At least one trigger event is mandatory.', 'error');
      }
    } else {
      setWebhookEvents(prev => [...prev, ev]);
    }
  };

  // --- API Keys Actions ---
  const handleGenerateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      addToast('Please provide a key label or name.', 'error');
      return;
    }

    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randToken = '';
    for (let i = 0; i < 24; i++) {
      randToken += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const token = `sf_live_${randToken}`;

    const newKey: ApiKeyItem = {
      id: `key-${Date.now()}`,
      name: newKeyName,
      token,
      created: new Date().toLocaleDateString(),
      lastUsed: 'Never used',
      status: 'active'
    };

    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    localStorage.setItem(`scaleflow_apikeys_${businessId}`, JSON.stringify(updated));
    setNewKeyName('');
    setShowKeyForm(false);
    addToast('Developer API token provisioned securely.');
  };

  const handleRevokeApiKey = (id: string) => {
    const updated = apiKeys.map(key => {
      if (key.id === id) {
        return { ...key, status: 'revoked' as const };
      }
      return key;
    });
    setApiKeys(updated);
    localStorage.setItem(`scaleflow_apikeys_${businessId}`, JSON.stringify(updated));
    addToast('API Key revoked. All requests using this token will be denied.', 'error');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Token copied to secure clipboard!');
  };

  // --- Filtered Grid List ---
  const filteredIntegrations = integrations.filter(item => {
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  return (
    <div className="flex-1 overflow-y-auto bg-[#040406] p-4 sm:p-6 lg:p-8 space-y-8 relative selection:bg-brand-500/30 selection:text-white">
      {/* Dynamic Floating Toast System */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`p-3.5 rounded-xl border shadow-xl flex items-center justify-between gap-3 pointer-events-auto ${
                toast.type === 'error'
                  ? 'bg-red-500/10 border-red-500/25 text-red-200'
                  : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-medium">
                {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                <span>{toast.text}</span>
              </div>
              <button 
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-gray-400 hover:text-white transition-colors p-0.5 rounded cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header Profile Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#13131c] pb-6">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-brand-400 uppercase tracking-widest mb-1.5">
            <Shield className="w-3.5 h-3.5 text-brand-500" />
            Isolated Tenant Platform
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
            Integrations Center
          </h1>
          <p className="text-xs text-gray-500 font-sans mt-1">
            Connect external scheduling tools, mail relays, SMS gateways, database spreadsheets, or fetch API credentials.
          </p>
        </div>

        {/* Sync All Button */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-[10px] text-gray-500 font-mono text-right hidden sm:block">
            ACTIVE WORKSPACE:<br />
            <span className="text-gray-400 font-bold">{businessId.substring(0, 12)}...</span>
          </div>
        </div>
      </div>

      {/* Categories Horizontal Selector / Filter bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#08080c] border border-[#14141e] p-2 rounded-xl">
        <div className="flex flex-wrap gap-1">
          {(['all', 'productivity', 'communication', 'developer'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer capitalize ${
                activeCategory === cat
                  ? 'bg-brand-600/15 border border-brand-500/20 text-brand-300'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#12121c] border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="text-[10px] text-gray-500 flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-brand-500 animate-pulse" />
          Real-time webhook queue: <span className="text-emerald-400 font-bold font-mono">ONLINE</span>
        </div>
      </div>

      {/* Core Integrations Grid (Productivity & Communication Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map(integration => {
          const isConnected = integration.connected;
          const isEnabled = integration.enabled;
          
          return (
            <motion.div
              key={integration.id}
              layoutId={`card-${integration.id}`}
              className={`bg-[#08080c] border border-[#14141e] rounded-xl flex flex-col p-5 hover:border-[#1e1e2d] transition-all relative overflow-hidden`}
            >
              {/* Background Accent Subtle Glow if Connected */}
              {isConnected && isEnabled && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-2xl pointer-events-none" />
              )}

              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg border ${
                    isConnected && isEnabled 
                      ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' 
                      : 'bg-gray-800/10 border-gray-800/30 text-gray-400'
                  }`}>
                    {integration.id === 'google-calendar' && <Calendar className="w-5 h-5" />}
                    {integration.id === 'calendly' && <Clock className="w-5 h-5" />}
                    {integration.id === 'gmail' && <Mail className="w-5 h-5" />}
                    {integration.id === 'whatsapp' && <Phone className="w-5 h-5" />}
                    {integration.id === 'sms' && <Smartphone className="w-5 h-5" />}
                    {integration.id === 'google-sheets' && <FileSpreadsheet className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {integration.name}
                    </h3>
                    <span className="text-[10px] text-gray-500 uppercase font-mono">
                      {integration.category}
                    </span>
                  </div>
                </div>

                {/* Main Toggle (Disable / Enable) */}
                <button
                  onClick={() => handleToggleIntegration(integration.id)}
                  className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                    isEnabled ? 'bg-brand-600' : 'bg-gray-800'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${
                    isEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Status Indicators */}
              <div className="space-y-2 mb-6 text-xs border-t border-[#12121a] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Connection Status</span>
                  {isConnected ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      Connected
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-500/10 border border-gray-500/25 text-gray-400 font-bold">
                      Not Connected
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Last Synced</span>
                  <span className="text-gray-300 font-mono text-[10px]">
                    {integration.lastSync}
                  </span>
                </div>

                {integration.error && (
                  <div className="p-2 bg-red-500/5 border border-red-500/10 rounded-lg text-[10px] text-red-400 flex items-start gap-1.5 mt-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{integration.error}</span>
                  </div>
                )}
              </div>

              {/* Interactive Footer Actions */}
              <div className="mt-auto flex items-center gap-2">
                <button
                  onClick={() => handleOpenConfigure(integration.id)}
                  className="flex-1 py-1.5 bg-[#0e0e14] hover:bg-[#14141e] border border-[#1c1c2b] text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configure
                </button>

                {isConnected && (
                  <button
                    onClick={() => handleSyncNow(integration.id)}
                    disabled={syncingId === integration.id || !isEnabled}
                    className="p-1.5 bg-[#0e0e14] hover:bg-[#14141e] disabled:opacity-40 border border-[#1c1c2b] text-gray-400 hover:text-white rounded-lg transition-all cursor-pointer"
                    title="Synchronize now"
                  >
                    {syncingId === integration.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Developer Sub-Panel Grid: Webhooks & API Keys */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-[#13131c] pt-8">
        
        {/* WEBHOOKS PANEL */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Webhook className="w-5 h-5 text-brand-400" />
                Outgoing Webhooks
              </h2>
              <p className="text-xs text-gray-500">
                Trigger payloads on lead creations, appointments, and dialogue completions.
              </p>
            </div>
            <button
              onClick={handleOpenWebhookCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white rounded-lg border border-brand-500/20 shadow-md transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Endpoint
            </button>
          </div>

          <div className="bg-[#08080c] border border-[#14141e] rounded-xl overflow-hidden">
            {webhooks.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 space-y-1">
                <Webhook className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p>No active outgoing webhooks registered.</p>
                <p className="text-gray-600">Securely feed active lead acquisitions back into your custom CRM system.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#13131c]">
                {webhooks.map(wh => (
                  <div key={wh.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{wh.name}</span>
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            wh.status === 'active' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                          }`}>
                            {wh.status}
                          </span>
                        </div>
                        <div className="text-xs font-mono text-gray-500 truncate max-w-[280px] sm:max-w-md mt-1">
                          {wh.url}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleWebhookStatus(wh.id)}
                          className="p-1.5 hover:bg-[#12121c] rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                          title={wh.status === 'active' ? 'Pause webhook' : 'Activate webhook'}
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenWebhookEdit(wh)}
                          className="p-1.5 hover:bg-[#12121c] rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                          title="Edit endpoint parameters"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleTestWebhook(wh)}
                          disabled={testingWebhookId === wh.id}
                          className="p-1.5 hover:bg-[#12121c] rounded text-brand-400 hover:text-brand-300 transition-colors disabled:opacity-45 cursor-pointer"
                          title="Trigger mock payload test"
                        >
                          {testingWebhookId === wh.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Activity className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(wh.id)}
                          className="p-1.5 hover:bg-[#12121c] rounded text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                          title="Delete webhook"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] text-gray-500 uppercase font-mono mr-1">Events:</span>
                      {wh.events.map(ev => (
                        <span key={ev} className="px-2 py-0.5 rounded bg-[#101018] border border-[#1e1e2d] text-[10px] font-mono text-gray-400">
                          {ev}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-[#12121a]/60 pt-2 font-mono">
                      <span>Last Triggered: {wh.lastTriggered}</span>
                      {wh.lastResponse && (
                        <span className={`font-bold ${wh.lastResponse.startsWith('200') ? 'text-emerald-400' : 'text-red-400'}`}>
                          Last Response: {wh.lastResponse}
                        </span>
                      )}
                    </div>

                    {/* Test Console Log Output Block */}
                    {testResponseLog && testResponseLog.id === wh.id && (
                      <div className="mt-3 bg-[#030305] border border-[#1d1d29] rounded-lg p-3.5 font-mono text-[11px] text-gray-300 space-y-2">
                        <div className="flex items-center justify-between border-b border-[#13131e] pb-1.5 text-[10px] font-bold text-gray-500 uppercase">
                          <span>Payload Dispatch Simulator</span>
                          <button 
                            onClick={() => setTestResponseLog(null)}
                            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Dismiss Console
                          </button>
                        </div>
                        <pre className="max-h-[160px] overflow-y-auto whitespace-pre-wrap leading-relaxed text-gray-400">
                          {testResponseLog.log}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* API KEYS / SECURITY CREDS PANEL */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-brand-400" />
                Developer Access Tokens
              </h2>
              <p className="text-xs text-gray-500">
                Generate keys to safely query leads and feed them back into external services.
              </p>
            </div>
            <button
              onClick={() => setShowKeyForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0e0e14] hover:bg-[#14141e] text-xs font-semibold text-white rounded-lg border border-[#1c1c2b] transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-brand-400" />
              New Token
            </button>
          </div>

          <div className="bg-[#08080c] border border-[#14141e] rounded-xl overflow-hidden p-4 space-y-4">
            
            {/* New API Key generator mini-form */}
            <AnimatePresence>
              {showKeyForm && (
                <motion.form
                  onSubmit={handleGenerateApiKey}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#030305] border border-[#1c1c2c] p-4.5 rounded-lg space-y-3.5 overflow-hidden"
                >
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Generate Developer Credentials</h3>
                  <div className="space-y-2">
                    <label className="block text-[10px] text-gray-400 font-sans">Token Identifier Label</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g. Zapier Production, CRM Sync Key"
                        className="flex-1 px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        required
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-xs font-bold text-white rounded cursor-pointer"
                      >
                        Generate
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowKeyForm(false)}
                        className="px-3.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-400 rounded cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {apiKeys.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500 space-y-1">
                <Key className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p>No active API keys created.</p>
                <p className="text-gray-600">Integrate ScaleFlow lead generation nodes directly into code projects.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {apiKeys.map(key => {
                  const isRevoked = key.status === 'revoked';
                  const isRevealed = revealKeyId === key.id;

                  return (
                    <div 
                      key={key.id}
                      className={`p-3.5 border rounded-lg space-y-2.5 ${
                        isRevoked 
                          ? 'bg-red-500/5 border-red-500/10' 
                          : 'bg-[#030305] border-[#13131c]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div>
                          <span className={`font-bold ${isRevoked ? 'text-gray-500 line-through' : 'text-white'}`}>
                            {key.name}
                          </span>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            Created: {key.created} • Last Used: {key.lastUsed}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isRevoked ? (
                            <span className="text-[10px] font-mono bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-bold">
                              REVOKED
                            </span>
                          ) : (
                            <>
                              <button
                                onClick={() => setRevealKeyId(isRevealed ? null : key.id)}
                                className="p-1.5 bg-gray-800/20 hover:bg-gray-800/50 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                                title={isRevealed ? 'Mask key' : 'Reveal API key'}
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleCopyText(key.token)}
                                className="p-1.5 bg-gray-800/20 hover:bg-gray-800/50 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                                title="Copy full API Token"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleRevokeApiKey(key.id)}
                                className="px-2 py-1 text-[10px] font-bold bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 rounded transition-colors cursor-pointer"
                                title="Revoke developer access forever"
                              >
                                Revoke
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Display Key Token Masked / Plain */}
                      <div className="bg-[#050508] border border-[#13131f] p-2.5 rounded font-mono text-xs flex items-center justify-between text-gray-300">
                        <span className="tracking-wide">
                          {isRevoked 
                            ? '••••••••••••••••••••••••••••••••' 
                            : isRevealed 
                              ? key.token 
                              : `${key.token.substring(0, 10)}••••••••••••••••••••`
                          }
                        </span>
                        {!isRevoked && (
                          <span className="text-[9px] text-gray-500 select-none uppercase font-bold">
                            Live Token
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* DETAILED INTERACTIVE CONNECTION MODAL OVERLAYS */}
      <AnimatePresence>
        {configuringId !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black cursor-pointer"
              onClick={() => setConfiguringId(null)}
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#08080c] border border-[#1a1a24] rounded-2xl shadow-2xl z-10 p-6 overflow-hidden space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-[#13131e] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-500/10 border border-brand-500/30 text-brand-400 rounded-lg">
                    {configuringId === 'google-calendar' && <Calendar className="w-5 h-5" />}
                    {configuringId === 'calendly' && <Clock className="w-5 h-5" />}
                    {configuringId === 'gmail' && <Mail className="w-5 h-5" />}
                    {configuringId === 'whatsapp' && <Phone className="w-5 h-5" />}
                    {configuringId === 'sms' && <Smartphone className="w-5 h-5" />}
                    {configuringId === 'google-sheets' && <FileSpreadsheet className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-base">
                      Configure {integrations.find(i => i.id === configuringId)?.name}
                    </h3>
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                      Workspace Tenant Pipeline
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setConfiguringId(null)}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-[#12121c] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Core Form Body */}
              <div className="space-y-4">
                
                {/* 1. GOOGLE CALENDAR FORM */}
                {configuringId === 'google-calendar' && (
                  <GoogleCalendarForm 
                    details={integrations.find(i => i.id === 'google-calendar')?.details}
                    onSave={(details) => handleSaveConfiguration('google-calendar', details)}
                    onDisconnect={() => handleDisconnect('google-calendar')}
                    isConnected={integrations.find(i => i.id === 'google-calendar')?.connected || false}
                  />
                )}

                {/* 2. CALENDLY FORM */}
                {configuringId === 'calendly' && (
                  <CalendlyForm 
                    details={integrations.find(i => i.id === 'calendly')?.details}
                    onSave={(details) => handleSaveConfiguration('calendly', details)}
                    onDisconnect={() => handleDisconnect('calendly')}
                    isConnected={integrations.find(i => i.id === 'calendly')?.connected || false}
                  />
                )}

                {/* 3. GMAIL FORM */}
                {configuringId === 'gmail' && (
                  <GmailForm 
                    details={integrations.find(i => i.id === 'gmail')?.details}
                    onSave={(details) => handleSaveConfiguration('gmail', details)}
                    onDisconnect={() => handleDisconnect('gmail')}
                    isConnected={integrations.find(i => i.id === 'gmail')?.connected || false}
                  />
                )}

                {/* 4. WHATSAPP FORM */}
                {configuringId === 'whatsapp' && (
                  <WhatsAppForm 
                    details={integrations.find(i => i.id === 'whatsapp')?.details}
                    onSave={(details) => handleSaveConfiguration('whatsapp', details)}
                    onDisconnect={() => handleDisconnect('whatsapp')}
                    isConnected={integrations.find(i => i.id === 'whatsapp')?.connected || false}
                  />
                )}

                {/* 5. SMS TWILIO FORM */}
                {configuringId === 'sms' && (
                  <SMSForm 
                    details={integrations.find(i => i.id === 'sms')?.details}
                    onSave={(details) => handleSaveConfiguration('sms', details)}
                    onDisconnect={() => handleDisconnect('sms')}
                    isConnected={integrations.find(i => i.id === 'sms')?.connected || false}
                  />
                )}

                {/* 6. GOOGLE SHEETS FORM */}
                {configuringId === 'google-sheets' && (
                  <GoogleSheetsForm 
                    details={integrations.find(i => i.id === 'google-sheets')?.details}
                    onSave={(details) => handleSaveConfiguration('google-sheets', details)}
                    onDisconnect={() => handleDisconnect('google-sheets')}
                    isConnected={integrations.find(i => i.id === 'google-sheets')?.connected || false}
                  />
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WEBHOOK EDIT/CREATE DIALOG OVERLAY */}
      <AnimatePresence>
        {showWebhookForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black cursor-pointer"
              onClick={() => setShowWebhookForm(false)}
            />

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#08080c] border border-[#1a1a24] rounded-2xl shadow-2xl z-10 p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-[#13131e] pb-3">
                <h3 className="font-display font-bold text-white text-base">
                  {editingWebhook ? 'Edit Webhook Endpoint' : 'Register Webhook Subscription'}
                </h3>
                <button
                  onClick={() => setShowWebhookForm(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-[#12121c] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveWebhook} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Webhook Label/Name
                  </label>
                  <input
                    type="text"
                    value={webhookName}
                    onChange={(e) => setWebhookName(e.target.value)}
                    placeholder="e.g. Lead Forwarder, Production Hook"
                    className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Payload Destination URL
                  </label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://api.yourcrm.com/v1/webhook-receiver"
                    className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Payload Content-Type
                  </label>
                  <select
                    value={webhookContentType}
                    onChange={(e) => setWebhookContentType(e.target.value as any)}
                    className="block w-full px-3 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-300 focus:outline-none"
                  >
                    <option value="application/json">application/json</option>
                    <option value="application/x-www-form-urlencoded">application/x-www-form-urlencoded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Trigger Pipeline Events
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'leads.created', label: 'Leads Created' },
                      { id: 'appointments.booked', label: 'Appointments Booked' },
                      { id: 'conversations.closed', label: 'Conversations Closed' }
                    ].map(ev => {
                      const isActive = webhookEvents.includes(ev.id);
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => handleToggleWebhookEvent(ev.id)}
                          className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                            isActive
                              ? 'bg-brand-500/10 border-brand-500/20 text-brand-300'
                              : 'bg-[#040406] border-[#1d1d29] text-gray-400 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[8px] font-bold ${
                              isActive ? 'bg-brand-600 border-brand-500 text-white' : 'border-gray-700'
                            }`}>
                              {isActive && '✓'}
                            </div>
                            <span>{ev.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#13131e] flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
                  >
                    {editingWebhook ? 'Update Subscription' : 'Create Webhook'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWebhookForm(false)}
                    className="flex-1 py-2 bg-[#0e0e14] border border-[#1c1c2b] text-xs font-semibold text-gray-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// -------------------------------------------------------------
// SECURE INTEGRATION SUB-COMPONENTS (FORM HANDLERS)
// -------------------------------------------------------------

// 1. Google Calendar Modal configuration form
function GoogleCalendarForm({ details, onSave, onDisconnect, isConnected }: {
  details: any;
  onSave: (details: any) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}) {
  const [gcalConfig, setGcalConfig] = useState(getGoogleCalendarConfig());
  const [email, setEmail] = useState(details?.email || gcalConfig.email || 'imrankhan.scaleflow@gmail.com');
  const [calendarId, setCalendarId] = useState(gcalConfig.calendarId || 'primary');
  const [twoWaySync, setTwoWaySync] = useState(details?.twoWaySync !== false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{ success: boolean; msg: string } | null>(null);
  const [isDiagOpen, setIsDiagOpen] = useState(false);

  const handleOAuthConnect = async () => {
    setIsAuthenticating(true);
    setVerifyStatus(null);
    try {
      const res = await authenticateGoogleCalendar();
      setEmail(res.email);
      setGcalConfig(getGoogleCalendarConfig());
      setVerifyStatus({ success: true, msg: `Authenticated as ${res.email}` });
    } catch (err: any) {
      setVerifyStatus({ success: false, msg: err.message || 'OAuth authentication failed' });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyStatus(null);
    try {
      const res = await verifyOAuthAuthentication();
      if (res.valid) {
        setVerifyStatus({ success: true, msg: `Token and Calendar ID '${res.calendarId}' are valid!` });
      } else {
        setVerifyStatus({ success: false, msg: res.error || 'OAuth token or Calendar ID verification failed.' });
      }
    } catch (err: any) {
      setVerifyStatus({ success: false, msg: err.message || 'Verification error' });
    } finally {
      setIsVerifying(false);
      setGcalConfig(getGoogleCalendarConfig());
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveGoogleCalendarConfig({ email, calendarId, twoWaySync, connected: true });
    onSave({ email, calendarId, twoWaySync });
  };

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl space-y-1.5 text-xs text-gray-400">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-brand-300 font-bold uppercase text-[9px] tracking-wider">
              <Shield className="w-3.5 h-3.5 text-brand-400" />
              Google Calendar OAuth 2.0 Gateway
            </div>
            <button
              type="button"
              onClick={() => setIsDiagOpen(true)}
              className="text-[10px] text-brand-400 hover:text-brand-300 font-mono font-semibold underline cursor-pointer"
            >
              Open API Log Inspector
            </button>
          </div>
          <p className="leading-relaxed">
            ScaleFlow executes Google Calendar API calls directly using scope <code className="text-emerald-400">calendar.events</code>.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Connected Account (Google Email)
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Authenticate Gmail / G-Suite Account"
                className="flex-1 px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
                required
              />
              <button
                type="button"
                onClick={handleOAuthConnect}
                disabled={isAuthenticating}
                className="px-3 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/40 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                {isAuthenticating ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    OAuth Login
                  </>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Target Calendar ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                placeholder="e.g. primary"
                className="flex-1 px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white font-mono"
                required
              />
              <button
                type="button"
                onClick={handleVerify}
                disabled={isVerifying || !gcalConfig.accessToken}
                className="px-3 bg-[#1e1e2e] hover:bg-[#2a2a3e] disabled:opacity-40 text-xs font-semibold text-gray-200 border border-[#2a2a40] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-emerald-400" />}
                Verify Connection
              </button>
            </div>
            <span className="text-[10px] text-gray-500 mt-0.5 block">Use 'primary' for main account calendar.</span>
          </div>

          {verifyStatus && (
            <div className={`p-2 rounded-lg text-xs font-mono flex items-center gap-2 ${
              verifyStatus.success 
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' 
                : 'bg-red-500/10 border border-red-500/20 text-red-300'
            }`}>
              {verifyStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
              <span className="break-all">{verifyStatus.msg}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs py-1">
            <div className="space-y-0.5">
              <span className="block font-bold text-gray-300">Two-way synchronization</span>
              <span className="block text-[10px] text-gray-500">Auto-create Google Calendar events upon appointment confirmation.</span>
            </div>
            <button
              type="button"
              onClick={() => setTwoWaySync(!twoWaySync)}
              className={`w-9 h-4.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                twoWaySync ? 'bg-brand-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                twoWaySync ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-[#13131e] flex gap-2.5">
          <button
            type="submit"
            disabled={!email}
            className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-xs font-semibold text-white rounded-lg transition-all cursor-pointer"
          >
            Save Configuration
          </button>
          <button
            type="button"
            onClick={() => setIsDiagOpen(true)}
            className="px-3 py-2 bg-[#1e1e2d] hover:bg-[#28283d] text-brand-300 text-xs font-semibold rounded-lg border border-[#2a2a40] transition-colors cursor-pointer flex items-center gap-1"
          >
            <Activity className="w-3.5 h-3.5" /> Diagnostics
          </button>
          {isConnected && (
            <button
              type="button"
              onClick={onDisconnect}
              className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          )}
        </div>
      </form>

      <GoogleCalendarDiagnosticModal
        isOpen={isDiagOpen}
        onClose={() => {
          setIsDiagOpen(false);
          setGcalConfig(getGoogleCalendarConfig());
        }}
      />
    </>
  );
}

// 2. Calendly Configuration form
function CalendlyForm({ details, onSave, onDisconnect, isConnected }: {
  details: any;
  onSave: (details: any) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}) {
  const [bookingLink, setBookingLink] = useState(details?.bookingLink || 'https://calendly.com/scaleflow-meeting');
  const [apiKey, setApiKey] = useState(details?.apiKey || '');
  const [autoBook, setAutoBook] = useState(details?.autoBook !== false);
  const [isDiagOpen, setIsDiagOpen] = useState(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    saveCalendlyConfig({
      connected: true,
      bookingUrl: bookingLink,
      apiKey: apiKey,
      twoWaySync: autoBook
    });
    await verifyCalendlyConnection();
    onSave({ bookingLink, apiKey, autoBook });
  };

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-4">
        <div className="p-3 bg-[#0d0d16] border border-[#1b1b2f] rounded-xl space-y-1.5 text-xs text-gray-400">
          <p className="leading-relaxed">
            Connect your official Calendly scheduling link and optional Personal Access Token (PAT). When AI Receptionists detect booking intent, appointments and leads are synced seamlessly into your pipeline.
          </p>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Calendly Event/Booking Link
            </label>
            <input
              type="text"
              value={bookingLink}
              onChange={(e) => setBookingLink(e.target.value)}
              placeholder="e.g. https://calendly.com/your-username/meeting"
              className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Calendly Personal Access Token (PAT / API Key)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. cal_pat_... (Optional for direct API sync)"
              className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white font-mono"
            />
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <div className="space-y-0.5">
              <span className="block font-bold text-gray-300">Automatically book appointments</span>
              <span className="block text-[10px] text-gray-500">Allow AI agents to log appointments directly onto Calendly hooks.</span>
            </div>
            <button
              type="button"
              onClick={() => setAutoBook(!autoBook)}
              className={`w-9 h-4.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
                autoBook ? 'bg-brand-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
                autoBook ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        <div className="pt-3 flex items-center justify-between gap-2 border-t border-[#13131e]">
          <button
            type="button"
            onClick={() => setIsDiagOpen(true)}
            className="px-3 py-2 bg-[#121320] hover:bg-[#1a1b2d] text-brand-300 text-xs font-semibold rounded-lg border border-[#23243a] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5 text-brand-400" />
            Run Integration Tests & Diagnostic Logs
          </button>

          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                type="button"
                onClick={() => {
                  saveCalendlyConfig({ connected: false });
                  onDisconnect();
                }}
                className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            )}
            <button
              type="submit"
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer shadow-lg shadow-brand-600/20"
            >
              Save & Connect
            </button>
          </div>
        </div>
      </form>

      <CalendlyDiagnosticModal
        isOpen={isDiagOpen}
        onClose={() => setIsDiagOpen(false)}
      />
    </>
  );
}

// 3. Gmail Configuration Form
function GmailForm({ details, onSave, onDisconnect, isConnected }: {
  details: any;
  onSave: (details: any) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}) {
  const [email, setEmail] = useState(details?.email || '');
  const [sendConfirmation, setSendConfirmation] = useState(details?.sendConfirmation !== false);
  const [sendReminders, setSendReminders] = useState(details?.sendReminders !== false);
  const [isSimulatingOauth, setIsSimulatingOauth] = useState(false);

  const handleOAuthConnect = () => {
    setIsSimulatingOauth(true);
    setTimeout(() => {
      setEmail('imrankhan.scaleflow@gmail.com');
      setIsSimulatingOauth(false);
    }, 1200);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ email, sendConfirmation, sendReminders });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-xs text-gray-400 leading-relaxed">
        Enable automatic outbound email notifications. ScaleFlow can dispatch appointment summaries, SMS verification links, or qualify triggers.
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Gmail Outbound Mail Sender
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Connect Outbound Relay Account"
              className="flex-1 px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
              readOnly
              required
            />
            <button
              type="button"
              onClick={handleOAuthConnect}
              disabled={isSimulatingOauth}
              className="px-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              {isSimulatingOauth ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Connect'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs py-1">
          <div className="space-y-0.5">
            <span className="block font-bold text-gray-300">Send confirmation emails</span>
            <span className="block text-[10px] text-gray-500">Dispatch structured summaries immediately after a lead registers.</span>
          </div>
          <button
            type="button"
            onClick={() => setSendConfirmation(!sendConfirmation)}
            className={`w-9 h-4.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
              sendConfirmation ? 'bg-brand-600' : 'bg-gray-800'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
              sendConfirmation ? 'translate-x-4.5' : 'translate-x-0'
            }`} />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs py-1">
          <div className="space-y-0.5">
            <span className="block font-bold text-gray-300">Send reminder emails</span>
            <span className="block text-[10px] text-gray-500">Send automatic 24-hour lead reminders before scheduled dates.</span>
          </div>
          <button
            type="button"
            onClick={() => setSendReminders(!sendReminders)}
            className={`w-9 h-4.5 rounded-full p-0.5 transition-colors duration-200 focus:outline-none cursor-pointer ${
              sendReminders ? 'bg-brand-600' : 'bg-gray-800'
            }`}
          >
            <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform duration-200 ${
              sendReminders ? 'translate-x-4.5' : 'translate-x-0'
            }`} />
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-[#13131e] flex gap-2.5">
        <button
          type="submit"
          disabled={!email}
          className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
        >
          Save Email Setup
        </button>
        {isConnected && (
          <button
            type="button"
            onClick={onDisconnect}
            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        )}
      </div>
    </form>
  );
}

// 4. WhatsApp Business API configuration form
function WhatsAppForm({ details, onSave, onDisconnect, isConnected }: {
  details: any;
  onSave: (details: any) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}) {
  const [phoneNumberId, setPhoneNumberId] = useState(details?.phoneNumberId || '');
  const [wabaId, setWabaId] = useState(details?.wabaId || '');
  const [accessToken, setAccessToken] = useState(details?.accessToken || '');
  const [whatsappNumber, setWhatsappNumber] = useState(details?.whatsappNumber || '');
  const [sendConfirmations, setSendConfirmations] = useState(details?.sendConfirmations !== false);
  const [sendReminders, setSendReminders] = useState(details?.sendReminders !== false);
  const [sendFollowups, setSendFollowups] = useState(details?.sendFollowups === true);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      phoneNumberId, 
      wabaId, 
      accessToken, 
      whatsappNumber, 
      sendConfirmations, 
      sendReminders, 
      sendFollowups 
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
      <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl text-xs text-gray-400 leading-relaxed">
        Configure Meta Cloud WhatsApp Business API parameters. Deliver structured template reminders and qualifying triggers.
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            WhatsApp Connected Business Phone
          </label>
          <input
            type="text"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
            placeholder="+1 (555) 019-2831"
            className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Meta Phone Number ID
          </label>
          <input
            type="text"
            value={phoneNumberId}
            onChange={(e) => setPhoneNumberId(e.target.value)}
            placeholder="15-digit Meta Phone ID"
            className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            WhatsApp Business Account ID
          </label>
          <input
            type="text"
            value={wabaId}
            onChange={(e) => setWabaId(e.target.value)}
            placeholder="15-digit WABA ID"
            className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Meta Access Token (System User)
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="EAAB..."
            className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white font-mono"
            required
          />
        </div>

        <div className="border-t border-[#13131e] pt-3 space-y-2">
          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-1">
            Dispatch Rules
          </label>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-gray-300">Appointment confirmations</span>
            <button
              type="button"
              onClick={() => setSendConfirmations(!sendConfirmations)}
              className={`w-9 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                sendConfirmations ? 'bg-brand-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                sendConfirmations ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-gray-300">Delinquent / Pending reminders</span>
            <button
              type="button"
              onClick={() => setSendReminders(!sendReminders)}
              className={`w-9 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                sendReminders ? 'bg-brand-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                sendReminders ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-gray-300">Outbound follow-up campaigns</span>
            <button
              type="button"
              onClick={() => setSendFollowups(!sendFollowups)}
              className={`w-9 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                sendFollowups ? 'bg-brand-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                sendFollowups ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#13131e] flex gap-2.5">
        <button
          type="submit"
          className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
        >
          Save API Setup
        </button>
        {isConnected && (
          <button
            type="button"
            onClick={onDisconnect}
            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        )}
      </div>
    </form>
  );
}

// 5. SMS twilio Gateway Form
function SMSForm({ details, onSave, onDisconnect, isConnected }: {
  details: any;
  onSave: (details: any) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}) {
  const [accountSid, setAccountSid] = useState(details?.accountSid || '');
  const [authToken, setAuthToken] = useState(details?.authToken || '');
  const [fromNumber, setFromNumber] = useState(details?.fromNumber || '');
  const [sendReminders, setSendReminders] = useState(details?.sendReminders !== false);
  const [sendVerification, setSendVerification] = useState(details?.sendVerification !== false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ accountSid, authToken, fromNumber, sendReminders, sendVerification });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl text-xs text-gray-400 leading-relaxed">
        Connect Twilio Outbound SMS Gateway node to instantly dispatch automated meeting SMS reminders and passcode validation tokens.
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Twilio Account SID
          </label>
          <input
            type="text"
            value={accountSid}
            onChange={(e) => setAccountSid(e.target.value)}
            placeholder="AC..."
            className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Twilio Secret Auth Token
          </label>
          <input
            type="password"
            value={authToken}
            onChange={(e) => setAuthToken(e.target.value)}
            placeholder="Auth token signature"
            className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Assigned Sender SMS Phone Number
          </label>
          <input
            type="text"
            value={fromNumber}
            onChange={(e) => setFromNumber(e.target.value)}
            placeholder="+1 (555) 012-3456"
            className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
            required
          />
        </div>

        <div className="border-t border-[#13131e] pt-3 space-y-2">
          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-1">
            SMS Channels Setup
          </label>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-gray-300">Appointment alerts</span>
            <button
              type="button"
              onClick={() => setSendReminders(!sendReminders)}
              className={`w-9 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                sendReminders ? 'bg-brand-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                sendReminders ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-gray-300">Verification Passcode messages</span>
            <button
              type="button"
              onClick={() => setSendVerification(!sendVerification)}
              className={`w-9 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                sendVerification ? 'bg-brand-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                sendVerification ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#13131e] flex gap-2.5">
        <button
          type="submit"
          className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
        >
          Save Gateway
        </button>
        {isConnected && (
          <button
            type="button"
            onClick={onDisconnect}
            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        )}
      </div>
    </form>
  );
}

// 6. Google Sheets export settings configuration
function GoogleSheetsForm({ details, onSave, onDisconnect, isConnected }: {
  details: any;
  onSave: (details: any) => void;
  onDisconnect: () => void;
  isConnected: boolean;
}) {
  const [spreadsheetId, setSpreadsheetId] = useState(details?.spreadsheetId || '');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState(details?.spreadsheetUrl || '');
  const [exportLeads, setExportLeads] = useState(details?.exportLeads !== false);
  const [exportConversations, setExportConversations] = useState(details?.exportConversations !== false);
  const [exportAppointments, setExportAppointments] = useState(details?.exportAppointments !== false);
  const [isProvisioning, setIsProvisioning] = useState(false);

  const handleOAuthConnect = () => {
    setIsProvisioning(true);
    setTimeout(() => {
      const generatedId = `sheet_id_${Math.random().toString(36).substring(2, 12)}`;
      setSpreadsheetId(generatedId);
      setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${generatedId}/edit`);
      setIsProvisioning(false);
    }, 1500);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ spreadsheetId, spreadsheetUrl, exportLeads, exportConversations, exportAppointments });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="p-3 bg-brand-500/5 border border-brand-500/10 rounded-xl text-xs text-gray-400 leading-relaxed">
        Map lead queues, active speech transcripts, and booked consultations into a dedicated Google Spreadsheet for analytics.
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
            Mapped Google Spreadsheet
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={spreadsheetUrl}
              onChange={(e) => setSpreadsheetUrl(e.target.value)}
              placeholder="Provision Google Sheets Pipeline"
              className="flex-1 px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
              readOnly
              required
            />
            <button
              type="button"
              onClick={handleOAuthConnect}
              disabled={isProvisioning}
              className="px-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              {isProvisioning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Map'
              )}
            </button>
          </div>
          {spreadsheetId && (
            <span className="text-[9px] font-mono text-gray-500 mt-1 block truncate">
              Spreadsheet ID: {spreadsheetId}
            </span>
          )}
        </div>

        <div className="border-t border-[#13131e] pt-3 space-y-2">
          <label className="block text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-1">
            Synchronized Targets
          </label>

          <div className="flex items-center justify-between text-xs py-1">
            <div className="space-y-0.5">
              <span className="block font-bold text-gray-300">Automatically export Leads</span>
              <span className="block text-[10px] text-gray-500">Insert row when a caller is verified and qualified.</span>
            </div>
            <button
              type="button"
              onClick={() => setExportLeads(!exportLeads)}
              className={`w-9 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                exportLeads ? 'bg-brand-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                exportLeads ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <div className="space-y-0.5">
              <span className="block font-bold text-gray-300">Automatically export Conversations</span>
              <span className="block text-[10px] text-gray-500">Log finished dialog scripts and receptionist recordings.</span>
            </div>
            <button
              type="button"
              onClick={() => setExportConversations(!exportConversations)}
              className={`w-9 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                exportConversations ? 'bg-brand-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                exportConversations ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <div className="space-y-0.5">
              <span className="block font-bold text-gray-300">Automatically export Appointments</span>
              <span className="block text-[10px] text-gray-500">Synchronize locked calendar slots into row coordinates.</span>
            </div>
            <button
              type="button"
              onClick={() => setExportAppointments(!exportAppointments)}
              className={`w-9 h-4.5 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer ${
                exportAppointments ? 'bg-brand-600' : 'bg-gray-800'
              }`}
            >
              <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                exportAppointments ? 'translate-x-4.5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-[#13131e] flex gap-2.5">
        <button
          type="submit"
          className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-xs font-semibold text-white rounded-lg transition-colors cursor-pointer"
        >
          Save Sheets Configuration
        </button>
        {isConnected && (
          <button
            type="button"
            onClick={onDisconnect}
            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Disconnect
          </button>
        )}
      </div>
    </form>
  );
}
