/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Route = 
  | 'landing' 
  | 'login' 
  | 'dashboard' 
  | 'receptionist' 
  | 'leads' 
  | 'conversations' 
  | 'analytics'
  | 'integrations'
  | 'automation'
  | 'team'
  | 'handoffs'
  | 'gmail'
  | 'sheets'
  | 'diagnostics';

export type TeamRole = 'Owner' | 'Admin' | 'Manager' | 'Receptionist' | 'Sales' | 'Support' | 'Viewer';

export interface RolePermissions {
  leads: boolean;
  conversations: boolean;
  appointments: boolean;
  analytics: boolean;
  billing: boolean;
  settings: boolean;
  aiConfiguration: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: 'active' | 'suspended' | 'invited';
  joinedAt?: string;
  permissions: RolePermissions;
  avatarUrl?: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  userRole: TeamRole;
  action: 'Login' | 'Logout' | 'Lead edits' | 'Appointment changes' | 'AI configuration changes' | 'User actions';
  details: string;
  ipAddress?: string;
}

export interface UserSession {
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  businessId?: string;
  expiresAt?: number;
}

export interface MenuItem {
  id: Route;
  label: string;
  iconName: string;
  badge?: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  status: 'new' | 'contacted' | 'qualified' | 'nurturing' | 'closed';
  value: string;
  source: string;
  date: string;
  phone?: string;
  email?: string;
  service?: string;
  message?: string;
  conversationId?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  conversation?: { id: string; sender: 'user' | 'agent' | 'system'; text: string; timestamp: string }[];
}

export interface Conversation {
  id: string;
  contactName: string;
  lastMessage: string;
  timestamp: string;
  unread: boolean;
  channel: 'sms' | 'voice' | 'chat';
  status: 'active' | 'resolved' | 'snoozed';
}

export interface SavedConversation {
  id: string;
  leadId: string | null;
  customerName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  lastMessage: string;
  status: 'open' | 'closed' | 'escalated';
  messages: { id: string; sender: 'user' | 'agent' | 'system'; text: string; timestamp: string }[];
  notes?: string;
  archived?: boolean;
}

export interface Appointment {
  id: string;          // Appointment ID
  leadId: string;      // Lead ID
  customerName: string; // Customer Name
  phone: string;       // Phone
  email: string;       // Email
  service: string;     // Service
  date: string;        // Date
  time: string;        // Time
  status: 'confirmed' | 'cancelled' | 'pending'; // Status
  createdTime: string; // Created Time
  googleCalendarEventId?: string;
  googleCalendarHtmlLink?: string;
  googleCalendarSyncError?: string;
}

export interface Ticket {
  id: string;
  leadId: string | null;
  customerName: string;
  phone: string;
  email: string;
  conversation: { id: string; sender: 'user' | 'agent' | 'system'; text: string; timestamp: string }[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  createdTime: string;
  status: 'open' | 'resolved' | 'pending';
}

export interface GmailMessage {
  id: string;
  leadId?: string | null;
  email: string;
  subject: string;
  body: string;
  snippet: string;
  sender: string;
  recipient: string;
  timestamp: string;
  status: 'sent' | 'received' | 'draft' | 'failed';
  direction: 'inbound' | 'outbound';
  read: boolean;
  errorReason?: string;
  notificationType?: 'appointment_confirmation' | 'appointment_cancellation' | 'appointment_reschedule' | 'new_lead_confirmation' | 'human_handoff' | 'contact_form' | 'custom';
}

export interface GmailEmailTemplates {
  appointmentConfirmation: { subject: string; body: string };
  appointmentCancellation: { subject: string; body: string };
  appointmentReschedule: { subject: string; body: string };
  newLeadConfirmation: { subject: string; body: string };
  humanHandoff: { subject: string; body: string };
  contactFormSubmission: { subject: string; body: string };
}

export interface GmailConfig {
  connected: boolean;
  email: string;
  userName: string;
  senderName: string;
  signature: string;
  autoEmailsEnabled: boolean;
  lastVerifiedAt: string;
  templates: GmailEmailTemplates;
}

export interface GmailAnalytics {
  totalEmails: number;
  sentToday: number;
  receivedToday: number;
  unread: number;
  failedDeliveries: number;
  openRatePct: number;
  replyRatePct: number;
  avgResponseMinutes: number;
}

export interface GoogleSheetsConfig {
  connected: boolean;
  accountEmail: string;
  spreadsheetId: string;
  spreadsheetName: string;
  spreadsheetUrl: string;
  worksheetName: string;
  autoSyncEnabled: boolean;
  logConversationsEnabled: boolean;
  lastSyncTime: string;
  syncIntervalMinutes: number;
  fieldMap: Record<string, string>;
}

export interface GoogleSheetsSyncLog {
  id: string;
  timestamp: string;
  leadId: string;
  leadName: string;
  action: 'create' | 'update' | 'delete' | 'bulk_sync';
  status: 'success' | 'failed' | 'retrying';
  details: string;
  durationMs: number;
}

export interface GoogleSheetsAnalytics {
  connected: boolean;
  spreadsheetId: string;
  spreadsheetName: string;
  totalSyncedLeads: number;
  successfulSyncs: number;
  failedSyncs: number;
  pendingQueueCount: number;
  lastSuccessfulSync: string;
  avgSyncTimeMs: number;
  lastError: string | null;
}



