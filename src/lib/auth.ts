/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Lead, SavedConversation, Appointment, Ticket } from '../types';

export interface BusinessProfile {
  id: string;
  name: string;
  logo: string; // URL or emoji icon
  industry: string;
  ownerName: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  timezone: string;
  // AI Settings
  hours: string;
  bookingLink: string;
  whatsappNumber: string;
  welcomeMessage: string;
  description: string;
  services: string[];
}

export interface UserAccount {
  email: string;
  passwordHash: string; // Simulated secure hash
  ownerName: string;
  businessId: string;
  emailVerified: boolean;
  verificationPin: string;
}

export interface SessionData {
  email: string;
  name: string;
  businessId: string;
  role: string;
  expiresAt: number; // timestamp MS
  rememberMe: boolean;
  avatarUrl?: string;
  businessProfile: BusinessProfile;
}

// Key definitions
const ACCOUNTS_KEY = 'scaleflow_accounts';
const SESSION_KEY = 'scaleflow_session';

// Helper: secure string hashing simulation
function hashPassword(password: string): string {
  // Simple deterministic hash for mock storage safety
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'sf-hash-' + hash.toString(16);
}

// Pre-seeded Default Business & Account (Imran Khan / ScaleFlow)
export const SEED_BUSINESS: BusinessProfile = {
  id: 'biz-scaleflow-801',
  name: 'ScaleFlow Inc.',
  logo: '⚡',
  industry: 'Technology & SaaS',
  ownerName: 'Imran Khan',
  phone: '+1 (555) 019-2831',
  email: 'imran@scaleflow.io',
  website: 'https://scaleflow.io',
  address: '100 Pine St, Suite 1200, San Francisco, CA 94111',
  timezone: 'America/Los_Angeles',
  hours: 'Monday - Friday, 9:00 AM - 6:00 PM EST',
  bookingLink: 'https://calendly.com/scaleflow-meeting',
  whatsappNumber: '+15550192831',
  welcomeMessage: 'Hello! Welcome to ScaleFlow AI Receptionist. I can explain our CRM integration, outbound voice qualify features, or direct your enquiry.',
  description: 'ScaleFlow is an automated outbound voice and SMS lead qualifier and high-velocity routing system.',
  services: ['Enterprise Voice SIP Integration', 'AI Receptionist Setup', 'CRM API Integration Consultation', 'Voice Bot Implementation Strategy']
};

export const SEED_ACCOUNT: UserAccount = {
  email: 'imrankhan.scaleflow@gmail.com',
  passwordHash: hashPassword('demopassword123'),
  ownerName: 'Imran Khan',
  businessId: 'biz-scaleflow-801',
  emailVerified: true,
  verificationPin: '123456'
};

// Log exact redirect reasons whenever redirect to login or landing occurs
export function logAuthRedirect(reason: string, targetRoute: string = 'login') {
  const timestamp = new Date().toISOString();
  console.warn(`[ScaleFlow Auth Redirect] Redirecting to /${targetRoute}. Reason: ${reason}`);
  try {
    const logs = JSON.parse(localStorage.getItem('scaleflow_auth_redirect_logs') || '[]');
    logs.unshift({
      timestamp,
      targetRoute,
      reason
    });
    localStorage.setItem('scaleflow_auth_redirect_logs', JSON.stringify(logs.slice(0, 50)));
    localStorage.setItem('scaleflow_last_auth_redirect', JSON.stringify({ timestamp, targetRoute, reason }));
  } catch (e) {}
}

// Seed baseline accounts if none exist
export function initAccountsStorage() {
  const existing = localStorage.getItem(ACCOUNTS_KEY);
  if (!existing) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify([SEED_ACCOUNT]));
    // Save Imran's business profile backup
    localStorage.setItem(`scaleflow_biz_profile_${SEED_BUSINESS.id}`, JSON.stringify(SEED_BUSINESS));
  }
}

// Get all registered accounts
export function getAccounts(): UserAccount[] {
  initAccountsStorage();
  try {
    const data = localStorage.getItem(ACCOUNTS_KEY);
    return data ? JSON.parse(data) : [SEED_ACCOUNT];
  } catch (e) {
    return [SEED_ACCOUNT];
  }
}

// Save all accounts
function saveAccounts(accounts: UserAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// Generate fallback leads, chats, etc., for a newly registered business
function generateSeededDataForBusiness(biz: BusinessProfile): {
  leads: Lead[];
  conversations: SavedConversation[];
  appointments: Appointment[];
  tickets: Ticket[];
  kb: any[];
  faq: any[];
} {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  const leads: Lead[] = [
    {
      id: `LD-${Math.floor(100 + Math.random() * 900)}`,
      name: 'John Doe',
      company: 'Innovate LLC',
      status: 'new',
      value: '$4,500',
      source: 'Web Widget',
      date: today,
      email: 'john@innovate.co',
      phone: '+1 (555) 321-4567'
    },
    {
      id: `LD-${Math.floor(100 + Math.random() * 900)}`,
      name: 'Claire Sterling',
      company: 'Zenith Labs',
      status: 'qualified',
      value: '$9,200',
      source: 'Direct Voice',
      date: yesterday,
      email: 'claire@zenith.ai',
      phone: '+1 (555) 789-0123'
    }
  ];

  const conversations: SavedConversation[] = [
    {
      id: `conv-johndoe-${Date.now()}`,
      leadId: leads[0].id,
      customerName: 'John Doe',
      phone: '+1 (555) 321-4567',
      email: 'john@innovate.co',
      date: today,
      time: '11:30 AM',
      lastMessage: 'Does your support cover integrations with Slack?',
      status: 'open',
      messages: [
        { id: 'm1', sender: 'user', text: `Hi, I was looking into ${biz.name}. Do you support Slack?`, timestamp: '11:29 AM' },
        { id: 'm2', sender: 'agent', text: `Hello John! Yes, we absolutely integrate with Slack and other messaging channels as part of our core platform.`, timestamp: '11:30 AM' }
      ],
      notes: 'John needs Slack integration details. Follow up scheduled.'
    }
  ];

  const appointments: Appointment[] = [
    {
      id: `AP-${Math.floor(100 + Math.random() * 900)}`,
      leadId: leads[1].id,
      customerName: 'Claire Sterling',
      phone: '+1 (555) 789-0123',
      email: 'claire@zenith.ai',
      service: biz.services[0] || 'Discovery Consultation',
      date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      time: '10:00 AM',
      status: 'confirmed',
      createdTime: new Date().toISOString()
    }
  ];

  const tickets: Ticket[] = [];

  const kb = [
    {
      id: `kb-${Date.now()}-1`,
      title: `About ${biz.name}`,
      category: 'Overview',
      content: `${biz.name} is a leading provider operating in the ${biz.industry} sector. Our focus is delivering pristine service and optimizing client pipelines.`,
      updatedAt: today
    },
    {
      id: `kb-${Date.now()}-2`,
      title: 'SLA Speed & Latency Rules',
      category: 'Technical',
      content: 'We offer a sub-second response SLA speed across all of our digital channels. Standard maintenance windows are Sunday mornings.',
      updatedAt: yesterday
    }
  ];

  const faq = [
    {
      id: `faq-${Date.now()}-1`,
      question: `What services does ${biz.name} offer?`,
      answer: `We offer a high-quality suite of services including: ${biz.services.join(', ')}.`,
      category: 'Services'
    },
    {
      id: `faq-${Date.now()}-2`,
      question: 'How do I schedule a detailed consultation?',
      answer: `You can schedule directly using our Calendly link: ${biz.bookingLink}, or call us at ${biz.phone}.`,
      category: 'Booking'
    }
  ];

  return { leads, conversations, appointments, tickets, kb, faq };
}

// -------------------------------------------------------------
// WORKSPACE DATA ISOLATION ENGINE
// -------------------------------------------------------------

// Swaps active localStorage workspace keys. This guarantees strict data isolation!
export function swapWorkspaceTo(businessId: string) {
  // 1. If there is a current logged-in business, backup its current active data
  const currentSessionStr = localStorage.getItem(SESSION_KEY);
  if (currentSessionStr) {
    try {
      const currentSession: SessionData = JSON.parse(currentSessionStr);
      const prevBizId = currentSession.businessId;
      if (prevBizId && prevBizId !== businessId) {
        backupWorkspaceData(prevBizId);
      }
    } catch (e) {}
  }

  // 2. Load the target business profile
  const bizProfileStr = localStorage.getItem(`scaleflow_biz_profile_${businessId}`);
  let bizProfile: BusinessProfile;
  if (bizProfileStr) {
    bizProfile = JSON.parse(bizProfileStr);
  } else {
    // If it's Imran's business or we need fallback
    if (businessId === 'biz-scaleflow-801') {
      bizProfile = SEED_BUSINESS;
    } else {
      throw new Error('Business profile not found during swap.');
    }
  }

  // 3. Populate active keys with backed up data, or seed defaults
  const backupKey = `scaleflow_data_backup_${businessId}`;
  const backedStr = localStorage.getItem(backupKey);

  if (backedStr) {
    try {
      const backed = JSON.parse(backedStr);
      localStorage.setItem('scaleflow_leads', JSON.stringify(backed.leads || []));
      localStorage.setItem('scaleflow_all_conversations', JSON.stringify(backed.conversations || []));
      localStorage.setItem('scaleflow_appointments', JSON.stringify(backed.appointments || []));
      localStorage.setItem('scaleflow_tickets', JSON.stringify(backed.tickets || []));
      localStorage.setItem('scaleflow_kb_articles', JSON.stringify(backed.kb || []));
      localStorage.setItem('scaleflow_faqs', JSON.stringify(backed.faq || []));
      localStorage.setItem('scaleflow_notifications', JSON.stringify(backed.notifications || []));
    } catch (e) {}
  } else {
    // Brand new workspace, seed defaults for them!
    const seeded = generateSeededDataForBusiness(bizProfile);
    localStorage.setItem('scaleflow_leads', JSON.stringify(seeded.leads));
    localStorage.setItem('scaleflow_all_conversations', JSON.stringify(seeded.conversations));
    localStorage.setItem('scaleflow_appointments', JSON.stringify(seeded.appointments));
    localStorage.setItem('scaleflow_tickets', JSON.stringify(seeded.tickets));
    localStorage.setItem('scaleflow_kb_articles', JSON.stringify(seeded.kb));
    localStorage.setItem('scaleflow_faqs', JSON.stringify(seeded.faq));
    localStorage.setItem('scaleflow_notifications', JSON.stringify([]));

    // Instantly backup the newly seeded data
    localStorage.setItem(backupKey, JSON.stringify({
      leads: seeded.leads,
      conversations: seeded.conversations,
      appointments: seeded.appointments,
      tickets: seeded.tickets,
      kb: seeded.kb,
      faq: seeded.faq,
      notifications: []
    }));
  }
}

// Backs up the current active localStorage keys into the namespace-backed key of the business
export function backupWorkspaceData(businessId: string) {
  if (!businessId) return;

  const leads = JSON.parse(localStorage.getItem('scaleflow_leads') || '[]');
  const conversations = JSON.parse(localStorage.getItem('scaleflow_all_conversations') || '[]');
  const appointments = JSON.parse(localStorage.getItem('scaleflow_appointments') || '[]');
  const tickets = JSON.parse(localStorage.getItem('scaleflow_tickets') || '[]');
  const kb = JSON.parse(localStorage.getItem('scaleflow_kb_articles') || '[]');
  const faq = JSON.parse(localStorage.getItem('scaleflow_faqs') || '[]');
  const notifications = JSON.parse(localStorage.getItem('scaleflow_notifications') || '[]');

  localStorage.setItem(`scaleflow_data_backup_${businessId}`, JSON.stringify({
    leads,
    conversations,
    appointments,
    tickets,
    kb,
    faq,
    notifications
  }));
}

// Purges active keys so no unauthenticated access is possible
export function clearActiveWorkspaceKeys() {
  localStorage.removeItem('scaleflow_leads');
  localStorage.removeItem('scaleflow_all_conversations');
  localStorage.removeItem('scaleflow_appointments');
  localStorage.removeItem('scaleflow_tickets');
  localStorage.removeItem('scaleflow_kb_articles');
  localStorage.removeItem('scaleflow_faqs');
  localStorage.removeItem('scaleflow_notifications');
}

// -------------------------------------------------------------
// CORE AUTHENTICATION API METHODS
// -------------------------------------------------------------

// Sign Up / Register
export interface SignUpRequest {
  email: string;
  passwordHash: string;
  ownerName: string;
  businessName: string;
  industry: string;
  phone: string;
  website: string;
  address: string;
  timezone: string;
}

export function registerBusinessAccount(req: SignUpRequest): { success: boolean; error?: string; verificationPin?: string } {
  const accounts = getAccounts();
  const existing = accounts.find(a => a.email.toLowerCase() === req.email.toLowerCase());

  if (existing) {
    return { success: false, error: 'An account with this email address already exists.' };
  }

  const businessId = `biz-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const pin = Math.floor(100000 + Math.random() * 900000).toString();

  // Create Business Profile
  const businessProfile: BusinessProfile = {
    id: businessId,
    name: req.businessName,
    logo: '💼',
    industry: req.industry,
    ownerName: req.ownerName,
    phone: req.phone,
    email: req.email,
    website: req.website || `https://${req.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
    address: req.address,
    timezone: req.timezone,
    hours: 'Monday - Friday, 9:00 AM - 5:00 PM',
    bookingLink: `https://calendly.com/${req.businessName.toLowerCase().replace(/[^a-z0-9]/g, '')}-meeting`,
    whatsappNumber: req.phone.replace(/[^0-9]/g, ''),
    welcomeMessage: `Hi, thank you for contacting ${req.businessName}! I am your AI receptionist. How can I assist you with our services today?`,
    description: `${req.businessName} operates in the ${req.industry} sector.`,
    services: ['Standard Consult', 'Full Implementation']
  };

  // Create User Account
  const newAccount: UserAccount = {
    email: req.email,
    passwordHash: hashPassword(req.passwordHash),
    ownerName: req.ownerName,
    businessId,
    emailVerified: false, // Must verify email!
    verificationPin: pin
  };

  // Save profile and account
  localStorage.setItem(`scaleflow_biz_profile_${businessId}`, JSON.stringify(businessProfile));
  accounts.push(newAccount);
  saveAccounts(accounts);

  return { success: true, verificationPin: pin };
}

// Log In
export function authenticateUser(email: string, password: string, rememberMe: boolean): { success: boolean; error?: string; account?: UserAccount } {
  const accounts = getAccounts();
  const acc = accounts.find(a => a.email.toLowerCase() === email.toLowerCase());

  if (!acc) {
    return { success: false, error: 'No account found with this email address.' };
  }

  const inputHash = hashPassword(password);
  if (acc.passwordHash !== inputHash) {
    return { success: false, error: 'Incorrect security credentials or password.' };
  }

  return { success: true, account: acc };
}

// Set Active Session
export function establishSession(acc: UserAccount, rememberMe: boolean) {
  const bizProfileStr = localStorage.getItem(`scaleflow_biz_profile_${acc.businessId}`);
  let bizProfile: BusinessProfile;
  if (bizProfileStr) {
    bizProfile = JSON.parse(bizProfileStr);
  } else {
    bizProfile = SEED_BUSINESS;
  }

  // Session duration: 1 hour for standard, 7 days if Remember Me is checked
  const duration = rememberMe ? 7 * 24 * 3600 * 1000 : 1 * 3600 * 1000;
  const expiresAt = Date.now() + duration;

  const session: SessionData = {
    email: acc.email,
    name: acc.ownerName,
    businessId: acc.businessId,
    role: 'Administrator',
    expiresAt,
    rememberMe,
    businessProfile: bizProfile
  };

  // Swap active localStorage keys
  swapWorkspaceTo(acc.businessId);

  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

// Request Forgot Password Code
export function requestPasswordResetPin(email: string): { success: boolean; pin?: string; error?: string } {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.email.toLowerCase() === email.toLowerCase());

  if (idx === -1) {
    return { success: false, error: 'No workspace registered under this email.' };
  }

  const resetPin = Math.floor(100000 + Math.random() * 900000).toString();
  // We can attach the pin securely or mock store it on the user account
  const updatedAccount = {
    ...accounts[idx],
    verificationPin: resetPin // reuse pin or store it
  };

  accounts[idx] = updatedAccount;
  saveAccounts(accounts);

  return { success: true, pin: resetPin };
}

// Reset Password with Pin
export function executePasswordReset(email: string, pin: string, newPass: string): { success: boolean; error?: string } {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.email.toLowerCase() === email.toLowerCase());

  if (idx === -1) {
    return { success: false, error: 'No account matching this email was found.' };
  }

  const acc = accounts[idx];
  if (acc.verificationPin !== pin) {
    return { success: false, error: 'Invalid reset PIN. Please check the code and try again.' };
  }

  // Update password and assign a new randomized verification pin
  accounts[idx] = {
    ...acc,
    passwordHash: hashPassword(newPass),
    verificationPin: Math.floor(100000 + Math.random() * 900000).toString()
  };

  saveAccounts(accounts);
  return { success: true };
}

// Complete Email Verification
export function verifyEmailPin(email: string, pin: string): { success: boolean; error?: string } {
  const accounts = getAccounts();
  const idx = accounts.findIndex(a => a.email.toLowerCase() === email.toLowerCase());

  if (idx === -1) {
    return { success: false, error: 'Workspace account not found.' };
  }

  const acc = accounts[idx];
  if (acc.verificationPin !== pin) {
    return { success: false, error: 'Incorrect 6-digit confirmation PIN.' };
  }

  accounts[idx] = {
    ...acc,
    emailVerified: true
  };

  saveAccounts(accounts);

  // Update active session too if matching
  const sessStr = localStorage.getItem(SESSION_KEY);
  if (sessStr) {
    try {
      const sess: SessionData = JSON.parse(sessStr);
      if (sess.email.toLowerCase() === email.toLowerCase()) {
        // Force update verified flag or just reload
      }
    } catch (e) {}
  }

  return { success: true };
}

// Refresh Session expiry
export function refreshUserSession(): SessionData | null {
  const sessStr = localStorage.getItem(SESSION_KEY);
  if (!sessStr) return null;

  try {
    const sess: SessionData = JSON.parse(sessStr);
    const duration = sess.rememberMe ? 7 * 24 * 3600 * 1000 : 1 * 3600 * 1000;
    sess.expiresAt = Date.now() + duration;

    localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    return sess;
  } catch (e) {
    return null;
  }
}

// Save active profile changes back
export function saveActiveBusinessProfile(profile: BusinessProfile) {
  localStorage.setItem(`scaleflow_biz_profile_${profile.id}`, JSON.stringify(profile));

  // Update active session info too
  const sessStr = localStorage.getItem(SESSION_KEY);
  if (sessStr) {
    try {
      const sess: SessionData = JSON.parse(sessStr);
      if (sess.businessId === profile.id) {
        sess.businessProfile = profile;
        localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
      }
    } catch (e) {}
  }
}
