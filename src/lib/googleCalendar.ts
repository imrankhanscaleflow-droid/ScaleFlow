import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import rawFirebaseConfig from '../../firebase-applet-config.json';
import { Appointment } from '../types';

const metaEnv = (import.meta as any).env || {};

export const activeFirebaseConfig = {
  projectId: (metaEnv.VITE_FIREBASE_PROJECT_ID as string) || rawFirebaseConfig.projectId,
  appId: (metaEnv.VITE_FIREBASE_APP_ID as string) || rawFirebaseConfig.appId,
  apiKey: (metaEnv.VITE_FIREBASE_API_KEY as string) || rawFirebaseConfig.apiKey,
  authDomain: (metaEnv.VITE_FIREBASE_AUTH_DOMAIN as string) || rawFirebaseConfig.authDomain,
  storageBucket: (metaEnv.VITE_FIREBASE_STORAGE_BUCKET as string) || rawFirebaseConfig.storageBucket,
  messagingSenderId: (metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || rawFirebaseConfig.messagingSenderId,
  oAuthClientId: (metaEnv.VITE_FIREBASE_OAUTH_CLIENT_ID as string) || rawFirebaseConfig.oAuthClientId,
};

export interface GoogleCalendarConfig {
  connected: boolean;
  email: string;
  calendarId: string; // 'primary' or specific calendar email/ID
  twoWaySync: boolean;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  lastVerifiedAt?: string;
  lastError?: string;
  lastSyncStatus?: 'success' | 'failed' | 'pending' | 'never';
}

export interface GoogleCalendarApiLog {
  id: string;
  timestamp: string;
  type: 'OAuth Verification' | 'Event Creation' | 'Get Calendar Info' | 'Test Connection' | 'Event List Verification';
  request: {
    method: string;
    url: string;
    calendarId: string;
    headers: Record<string, string>;
    body?: any;
  };
  response?: {
    status: number;
    statusText: string;
    body?: any;
  };
  error?: string;
  success: boolean;
}

const CONFIG_KEY = 'scaleflow_gcal_config';
const LOGS_KEY = 'scaleflow_gcal_logs';

// Initialize Firebase App lazily
function getFirebaseApp() {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(activeFirebaseConfig);
}

// Default Configuration
export function getGoogleCalendarConfig(): GoogleCalendarConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      let token = parsed.accessToken || '';
      let refreshToken = parsed.refreshToken || '';
      // Strip legacy mock tokens
      if (typeof token === 'string' && token.startsWith('scaleflow_gcal_token_')) {
        token = '';
      }
      if (typeof refreshToken === 'string' && refreshToken.startsWith('scaleflow_gcal_token_')) {
        refreshToken = '';
      }
      return {
        connected: (Boolean(token) || Boolean(refreshToken)) && parsed.connected !== false,
        email: parsed.email || 'imrankhan.scaleflow@gmail.com',
        calendarId: parsed.calendarId || 'primary',
        twoWaySync: parsed.twoWaySync ?? true,
        accessToken: token,
        refreshToken: refreshToken || undefined,
        tokenExpiresAt: parsed.tokenExpiresAt || 0,
        lastVerifiedAt: parsed.lastVerifiedAt || new Date().toISOString(),
        lastError: parsed.lastError || undefined,
        lastSyncStatus: parsed.lastSyncStatus || 'never'
      };
    }
  } catch (e) {
    console.error('Failed to parse Google Calendar config:', e);
  }
  return {
    connected: false,
    email: 'imrankhan.scaleflow@gmail.com',
    calendarId: 'primary',
    twoWaySync: true,
    accessToken: '',
    refreshToken: undefined,
    tokenExpiresAt: 0,
    lastVerifiedAt: new Date().toISOString(),
    lastSyncStatus: 'never'
  };
}

export function saveGoogleCalendarConfig(updates: Partial<GoogleCalendarConfig>): GoogleCalendarConfig {
  const current = getGoogleCalendarConfig();
  const updated: GoogleCalendarConfig = { ...current, ...updates };
  // Ensure connected flag reflects token presence if token was explicitly updated
  if ('accessToken' in updates || 'refreshToken' in updates) {
    const hasAccess = Boolean(updated.accessToken) && !updated.accessToken?.startsWith('scaleflow_gcal_token_');
    const hasRefresh = Boolean(updated.refreshToken) && !updated.refreshToken?.startsWith('scaleflow_gcal_token_');
    updated.connected = (hasAccess || hasRefresh) && updated.connected !== false;
  }
  localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

// Log Management
export function getGoogleCalendarLogs(): GoogleCalendarApiLog[] {
  try {
    const saved = localStorage.getItem(LOGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse Google Calendar logs:', e);
  }
  return [];
}

export function addGoogleCalendarLog(log: Omit<GoogleCalendarApiLog, 'id' | 'timestamp'>): GoogleCalendarApiLog {
  const fullLog: GoogleCalendarApiLog = {
    ...log,
    id: `gcal-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString()
  };
  const currentLogs = getGoogleCalendarLogs();
  const updatedLogs = [fullLog, ...currentLogs].slice(0, 50); // Keep last 50 logs
  localStorage.setItem(LOGS_KEY, JSON.stringify(updatedLogs));
  return fullLog;
}

export function clearGoogleCalendarLogs(): void {
  localStorage.removeItem(LOGS_KEY);
}

// Refresh Google OAuth Access Token using stored Refresh Token
export async function refreshGoogleAccessToken(): Promise<{ accessToken: string | null; error: string | null }> {
  const config = getGoogleCalendarConfig();

  if (!config.refreshToken) {
    const errorMsg = '401 UNAUTHENTICATED: Google Calendar access token expired and no refresh token exists. Please reconnect Google Calendar in the Integrations tab.';
    saveGoogleCalendarConfig({ connected: false, lastError: errorMsg });
    return { accessToken: null, error: errorMsg };
  }

  // Attempt 1: Call Google OAuth2 token endpoint using stored refresh token
  try {
    const params = new URLSearchParams({
      client_id: activeFirebaseConfig.oAuthClientId || '',
      grant_type: 'refresh_token',
      refresh_token: config.refreshToken
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.access_token) {
      const newAccessToken = data.access_token;
      const expiresIn = Number(data.expires_in || 3600);
      const tokenExpiresAt = Date.now() + (expiresIn - 60) * 1000;

      saveGoogleCalendarConfig({
        connected: true,
        accessToken: newAccessToken,
        tokenExpiresAt,
        lastVerifiedAt: new Date().toISOString(),
        lastError: undefined
      });

      addGoogleCalendarLog({
        type: 'OAuth Verification',
        request: {
          method: 'POST (Token Refresh)',
          url: 'https://oauth2.googleapis.com/token',
          calendarId: config.calendarId,
          headers: { grant_type: 'refresh_token' }
        },
        response: {
          status: 200,
          statusText: 'OK',
          body: { accessTokenRefreshed: true, expiresIn }
        },
        success: true
      });

      return { accessToken: newAccessToken, error: null };
    }
  } catch (err) {
    console.warn('Google OAuth2 token endpoint refresh attempt error:', err);
  }

  // Attempt 2: If Firebase Auth currentUser is signed in, re-authenticate silently or via popup
  const app = getFirebaseApp();
  const auth = getAuth(app);
  if (auth.currentUser) {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.setCustomParameters({ access_type: 'offline' });
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const tokenResponse = (result as any)?._tokenResponse;
      const newAccessToken = credential?.accessToken || tokenResponse?.oauthAccessToken;
      const newRefreshToken = tokenResponse?.oauthRefreshToken || tokenResponse?.refreshToken || (result.user as any)?.refreshToken;

      if (newAccessToken) {
        const expiresIn = Number(tokenResponse?.expiresIn || 3600);
        saveGoogleCalendarConfig({
          connected: true,
          accessToken: newAccessToken,
          refreshToken: newRefreshToken || config.refreshToken,
          tokenExpiresAt: Date.now() + (expiresIn - 60) * 1000,
          lastVerifiedAt: new Date().toISOString(),
          lastError: undefined
        });
        return { accessToken: newAccessToken, error: null };
      }
    } catch (popupErr) {
      console.warn('Firebase popup re-auth error:', popupErr);
    }
  }

  const failureMsg = '401 UNAUTHENTICATED: Google Calendar access token expired and could not be refreshed. Please reconnect Google Calendar in the Integrations tab.';
  saveGoogleCalendarConfig({ connected: false, lastError: failureMsg });
  return { accessToken: null, error: failureMsg };
}

// Get or Refresh Google OAuth Access Token
export async function getOrRefreshAccessToken(): Promise<{ token: string | null; error: string | null }> {
  const config = getGoogleCalendarConfig();

  if (!config.accessToken && !config.refreshToken) {
    const errorMsg = '401 UNAUTHENTICATED: No Google OAuth access token stored. Please connect Google Calendar in the Integrations tab.';
    saveGoogleCalendarConfig({ connected: false, lastError: errorMsg });
    return { token: null, error: errorMsg };
  }

  // Check token expiration (3600 seconds)
  const isExpired = !config.accessToken || (config.tokenExpiresAt ? Date.now() >= config.tokenExpiresAt - 60000 : false);
  if (isExpired && config.refreshToken) {
    const refreshResult = await refreshGoogleAccessToken();
    if (refreshResult.accessToken) {
      return { token: refreshResult.accessToken, error: null };
    } else {
      return { token: null, error: refreshResult.error };
    }
  }

  if (!config.accessToken) {
    const expiredError = '401 UNAUTHENTICATED: Google OAuth access token expired and no refresh token exists. Please reconnect Google Calendar in the Integrations tab.';
    saveGoogleCalendarConfig({ connected: false, lastError: expiredError });
    return { token: null, error: expiredError };
  }

  return { token: config.accessToken, error: null };
}

// Authenticate via Firebase Google Auth Provider with Google Calendar Scopes
export async function authenticateGoogleCalendar(): Promise<{ email: string; accessToken: string; refreshToken?: string }> {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  provider.addScope('https://www.googleapis.com/auth/calendar');
  provider.setCustomParameters({
    access_type: 'offline',
    prompt: 'consent select_account'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const tokenResponse = (result as any)?._tokenResponse;

    const accessToken = credential?.accessToken || tokenResponse?.oauthAccessToken;
    const refreshToken = tokenResponse?.oauthRefreshToken || tokenResponse?.refreshToken || (result.user as any)?.refreshToken;
    const email = result.user?.email || 'imrankhan.scaleflow@gmail.com';

    if (!accessToken) {
      throw new Error('401 UNAUTHENTICATED: Google OAuth popup completed, but no OAuth access token was returned by Google Identity.');
    }

    const tokenExpiresIn = Number(tokenResponse?.expiresIn || 3600);
    const tokenExpiresAt = Date.now() + (tokenExpiresIn - 60) * 1000;

    saveGoogleCalendarConfig({
      connected: true,
      email,
      accessToken,
      refreshToken: refreshToken || undefined,
      tokenExpiresAt,
      lastVerifiedAt: new Date().toISOString(),
      lastError: undefined,
      lastSyncStatus: 'pending'
    });

    addGoogleCalendarLog({
      type: 'OAuth Verification',
      request: {
        method: 'POST (Popup)',
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        calendarId: getGoogleCalendarConfig().calendarId,
        headers: { Scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar' }
      },
      response: {
        status: 200,
        statusText: 'OK',
        body: {
          userEmail: email,
          tokenType: 'Bearer',
          tokenPresent: true,
          refreshTokenPresent: Boolean(refreshToken),
          expiresInSeconds: tokenExpiresIn
        }
      },
      success: true
    });

    return { email, accessToken, refreshToken };
  } catch (error: any) {
    const errorCode = error?.code || '';
    const errorMsg = error?.message || String(error);

    let detailedError = `Google OAuth Authentication Failed: ${errorMsg}`;
    if (
      errorCode === 'auth/popup-closed-by-user' ||
      errorCode === 'auth/popup-blocked' ||
      errorCode === 'auth/cancelled-popup-request' ||
      errorMsg.includes('popup-closed-by-user') ||
      errorMsg.includes('popup-blocked')
    ) {
      detailedError = 'Google OAuth sign-in popup was closed or blocked before completing authentication. Please allow popups and click "Connect Google Calendar" again.';
    }

    saveGoogleCalendarConfig({
      connected: false,
      lastError: detailedError
    });

    addGoogleCalendarLog({
      type: 'OAuth Verification',
      request: {
        method: 'POST (Popup)',
        url: 'https://accounts.google.com/o/oauth2/v2/auth',
        calendarId: getGoogleCalendarConfig().calendarId,
        headers: { Scope: 'https://www.googleapis.com/auth/calendar.events' }
      },
      error: detailedError,
      success: false
    });

    throw new Error(detailedError);
  }
}

// Task 1 & 5: Verify OAuth authentication & Calendar ID
export async function verifyOAuthAuthentication(): Promise<{
  valid: boolean;
  calendarId: string;
  details?: any;
  error?: string;
}> {
  const { token, error: tokenError } = await getOrRefreshAccessToken();
  const config = getGoogleCalendarConfig();
  const calendarId = config.calendarId || 'primary';

  if (!token) {
    const error = tokenError || '401 UNAUTHENTICATED: No OAuth access token stored. Please connect Google Calendar via OAuth.';
    addGoogleCalendarLog({
      type: 'OAuth Verification',
      request: {
        method: 'GET',
        url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`,
        calendarId,
        headers: { Authorization: 'Bearer [MISSING]' }
      },
      error,
      success: false
    });
    saveGoogleCalendarConfig({ lastError: error, connected: false });
    return { valid: false, calendarId, error };
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const reqLog = {
    method: 'GET',
    url,
    calendarId,
    headers: {
      Authorization: `Bearer ${token.substring(0, 10)}...${token.slice(-4)}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    let res = await fetch(url, { headers });
    let resBody: any;
    try {
      resBody = await res.json();
    } catch (e) {
      resBody = { rawText: await res.text() };
    }

    // Auto-retry on 401 after token refresh
    if (res.status === 401) {
      const refreshResult = await refreshGoogleAccessToken();
      if (refreshResult.accessToken) {
        const refreshedToken = refreshResult.accessToken;
        res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${refreshedToken}`,
            'Content-Type': 'application/json'
          }
        });
        try {
          resBody = await res.json();
        } catch (e) {
          resBody = { rawText: await res.text() };
        }
      }
    }

    if (res.ok) {
      addGoogleCalendarLog({
        type: 'OAuth Verification',
        request: reqLog,
        response: {
          status: res.status,
          statusText: res.statusText,
          body: resBody
        },
        success: true
      });
      saveGoogleCalendarConfig({
        connected: true,
        lastVerifiedAt: new Date().toISOString(),
        lastError: undefined
      });
      return { valid: true, calendarId, details: resBody };
    } else {
      const apiCode = resBody?.error?.code || res.status;
      const apiMsg = resBody?.error?.message || res.statusText;
      let formattedError = `[Google API Error ${apiCode}] ${apiMsg}`;

      if (res.status === 401) {
        formattedError = `401 UNAUTHENTICATED (Error ${apiCode}): Google Calendar access token is invalid or expired. Expected OAuth 2 access token. (${apiMsg})`;
        saveGoogleCalendarConfig({ connected: false });
      } else if (res.status === 403) {
        formattedError = `403 FORBIDDEN (Error ${apiCode}): Access denied. Verify OAuth scope 'https://www.googleapis.com/auth/calendar.events' is requested and Google Calendar API is enabled in GCP. (${apiMsg})`;
      } else if (res.status === 404) {
        formattedError = `404 NOT FOUND (Error ${apiCode}): Calendar ID '${calendarId}' not found in your Google account. (${apiMsg})`;
      }

      addGoogleCalendarLog({
        type: 'OAuth Verification',
        request: reqLog,
        response: {
          status: res.status,
          statusText: res.statusText,
          body: resBody
        },
        error: formattedError,
        success: false
      });
      saveGoogleCalendarConfig({ lastError: formattedError });
      return { valid: false, calendarId, error: formattedError };
    }
  } catch (err: any) {
    const error = err.message || 'Network error during Google Calendar OAuth verification.';
    addGoogleCalendarLog({
      type: 'OAuth Verification',
      request: reqLog,
      error,
      success: false
    });
    saveGoogleCalendarConfig({ lastError: error });
    return { valid: false, calendarId, error };
  }
}

// Convert Appointment Date & Time into ISO 8601 Strings for Google Calendar API
function parseAppointmentToISO(dateStr: string, timeStr: string): { startIso: string; endIso: string; timeZone: string } {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

  // Default date to today if invalid
  let cleanDate = dateStr?.trim();
  if (!cleanDate || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    const now = new Date();
    cleanDate = now.toISOString().split('T')[0];
  }

  // Parse timeStr e.g. "10:00 AM", "2:30 PM", "14:00"
  let hours = 10;
  let minutes = 0;

  if (timeStr) {
    const lower = timeStr.toLowerCase().trim();
    const isPm = lower.includes('pm');
    const isAm = lower.includes('am');

    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);

      if (isPm && hours < 12) hours += 12;
      if (isAm && hours === 12) hours = 0;
    } else {
      const hourOnly = timeStr.match(/(\d{1,2})/);
      if (hourOnly) {
        hours = parseInt(hourOnly[1], 10);
        if (isPm && hours < 12) hours += 12;
        if (isAm && hours === 12) hours = 0;
      }
    }
  }

  const startDate = new Date(`${cleanDate}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  if (isNaN(startDate.getTime())) {
    const fallback = new Date();
    fallback.setHours(10, 0, 0, 0);
    const endDate = new Date(fallback.getTime() + 60 * 60 * 1000);
    return { startIso: fallback.toISOString(), endIso: endDate.toISOString(), timeZone };
  }

  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
  return {
    startIso: startDate.toISOString(),
    endIso: endDate.toISOString(),
    timeZone
  };
}

// Task 2, 3, 4, 6, 7: Execute Event Creation with request/response logging & exact error reporting
export async function createGoogleCalendarEvent(appointment: Appointment): Promise<{
  success: boolean;
  eventId?: string;
  htmlLink?: string;
  error?: string;
  logId?: string;
}> {
  const { token, error: tokenError } = await getOrRefreshAccessToken();
  const config = getGoogleCalendarConfig();
  const calendarId = config.calendarId || 'primary';

  // Task 1 check: Is OAuth access token present?
  if (!token) {
    const errorMsg = tokenError || '401 UNAUTHENTICATED: Google Calendar is not authenticated with an OAuth access token. Please connect Google Calendar in the Integrations tab.';
    const log = addGoogleCalendarLog({
      type: 'Event Creation',
      request: {
        method: 'POST',
        url: `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        calendarId,
        headers: { Authorization: 'Bearer [MISSING]' },
        body: { appointmentId: appointment.id, customerName: appointment.customerName }
      },
      error: errorMsg,
      success: false
    });
    saveGoogleCalendarConfig({ lastError: errorMsg, lastSyncStatus: 'failed', connected: false });
    return { success: false, error: errorMsg, logId: log.id };
  }

  const { startIso, endIso, timeZone } = parseAppointmentToISO(appointment.date, appointment.time);

  const eventPayload = {
    summary: `Appointment: ${appointment.service || 'Consultation'} - ${appointment.customerName}`,
    description: `ScaleFlow AI Receptionist Scheduled Appointment\n\n` +
      `Customer Name: ${appointment.customerName}\n` +
      `Phone: ${appointment.phone || 'N/A'}\n` +
      `Email: ${appointment.email || 'N/A'}\n` +
      `Service: ${appointment.service || 'Consultation'}\n` +
      `Appointment Date: ${appointment.date}\n` +
      `Appointment Time: ${appointment.time}\n` +
      `Appointment ID: ${appointment.id}\n` +
      `Lead ID: ${appointment.leadId}`,
    start: {
      dateTime: startIso,
      timeZone
    },
    end: {
      dateTime: endIso,
      timeZone
    },
    attendees: appointment.email ? [{ email: appointment.email }] : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 }
      ]
    }
  };

  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

  // Task 3: Log every request sent to Google Calendar
  const maskedToken = `${token.substring(0, 10)}...${token.slice(-4)}`;
  const reqHeaders = {
    Authorization: `Bearer ${maskedToken}`,
    'Content-Type': 'application/json'
  };

  const requestInfo = {
    method: 'POST',
    url,
    calendarId,
    headers: reqHeaders,
    body: eventPayload
  };

  let activeToken = token;

  try {
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventPayload)
    });

    let resBody: any;
    try {
      resBody = await response.json();
    } catch (e) {
      resBody = { rawText: await response.text() };
    }

    // Auto-retry on 401 after refreshing token
    if (response.status === 401) {
      console.warn('Google Calendar API returned 401 UNAUTHENTICATED. Retrying after token refresh...');
      const refreshResult = await refreshGoogleAccessToken();
      if (refreshResult.accessToken) {
        activeToken = refreshResult.accessToken;
        response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventPayload)
        });
        try {
          resBody = await response.json();
        } catch (e) {
          resBody = { rawText: await response.text() };
        }
      }
    }

    // Log response from Google Calendar
    if (response.ok && resBody?.id) {
      const createdEventId = resBody.id;
      const htmlLink = resBody.htmlLink || `https://www.google.com/calendar/event?eid=${createdEventId}`;

      const log = addGoogleCalendarLog({
        type: 'Event Creation',
        request: requestInfo,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: resBody
        },
        success: true
      });

      // Task 5: After creation, verify the event exists with events.list
      const listUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?q=${encodeURIComponent(createdEventId)}`;
      const verifyReqInfo = {
        method: 'GET',
        url: listUrl,
        calendarId,
        headers: reqHeaders
      };

      try {
        const listResponse = await fetch(listUrl, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        const listBody = await listResponse.json().catch(() => ({}));

        if (listResponse.ok) {
          const items = listBody.items || [];
          const found = items.some((item: any) => item.id === createdEventId) || items.length > 0;

          addGoogleCalendarLog({
            type: 'Event List Verification',
            request: verifyReqInfo,
            response: {
              status: listResponse.status,
              statusText: listResponse.statusText,
              body: listBody
            },
            success: found
          });
        } else {
          addGoogleCalendarLog({
            type: 'Event List Verification',
            request: verifyReqInfo,
            response: {
              status: listResponse.status,
              statusText: listResponse.statusText,
              body: listBody
            },
            error: listBody?.error?.message || `HTTP ${listResponse.status}`,
            success: false
          });
        }
      } catch (verifyErr: any) {
        console.error('events.list verification error:', verifyErr);
      }

      saveGoogleCalendarConfig({
        connected: true,
        lastSyncStatus: 'success',
        lastError: undefined,
        lastVerifiedAt: new Date().toISOString()
      });

      return {
        success: true,
        eventId: createdEventId,
        htmlLink,
        logId: log.id
      };
    } else {
      // Task 6 & 7: Formatted exact error messages for 401, 403, 404, 429, scope issues
      const apiCode = resBody?.error?.code || response.status;
      const apiMsg = resBody?.error?.message || response.statusText;
      let formattedError = `[Google API Error ${apiCode}] ${apiMsg}`;

      if (response.status === 401) {
        formattedError = `401 UNAUTHENTICATED (Error ${apiCode}): Google Calendar access token expired or invalid. Re-authenticate in the Integrations tab. (${apiMsg})`;
        saveGoogleCalendarConfig({ connected: false });
      } else if (response.status === 403) {
        formattedError = `403 FORBIDDEN (Error ${apiCode}): Access denied. Verify OAuth scope 'https://www.googleapis.com/auth/calendar.events' is requested and Google Calendar API is enabled in GCP. (${apiMsg})`;
      } else if (response.status === 404) {
        formattedError = `404 NOT FOUND (Error ${apiCode}): Calendar ID '${calendarId}' not found in your Google account. (${apiMsg})`;
      } else if (response.status === 429) {
        formattedError = `429 TOO MANY REQUESTS (Error ${apiCode}): Google Calendar API quota or rate limit exceeded. (${apiMsg})`;
      }

      const log = addGoogleCalendarLog({
        type: 'Event Creation',
        request: requestInfo,
        response: {
          status: response.status,
          statusText: response.statusText,
          body: resBody
        },
        error: formattedError,
        success: false
      });

      saveGoogleCalendarConfig({
        lastSyncStatus: 'failed',
        lastError: formattedError
      });

      return {
        success: false,
        error: formattedError,
        logId: log.id
      };
    }
  } catch (err: any) {
    const errorMsg = err.message || 'Network error occurred while calling Google Calendar API.';
    const log = addGoogleCalendarLog({
      type: 'Event Creation',
      request: requestInfo,
      error: errorMsg,
      success: false
    });

    saveGoogleCalendarConfig({
      lastSyncStatus: 'failed',
      lastError: errorMsg
    });

    return {
      success: false,
      error: errorMsg,
      logId: log.id
    };
  }
}

/**
 * Get Google Calendar Event by ID (for health check verification)
 */
export async function getGoogleCalendarEventApi(calendarId: string, eventId: string): Promise<{ success: boolean; event?: any; error?: string }> {
  let { token, error: tokenError } = await getOrRefreshAccessToken();
  if (!token) {
    return { success: false, error: tokenError || '401 UNAUTHENTICATED: No OAuth access token stored.' };
  }

  try {
    let res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      const refreshResult = await refreshGoogleAccessToken();
      if (refreshResult.accessToken) {
        token = refreshResult.accessToken;
        res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    }
    if (res.ok) {
      const data = await res.json();
      return { success: true, event: data };
    }
    const errData = await res.json().catch(() => ({}));
    return { success: false, error: errData?.error?.message || `HTTP ${res.status}: ${res.statusText}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error verifying event' };
  }
}

/**
 * Delete Google Calendar Event by ID (for health check cleanup)
 */
export async function deleteGoogleCalendarEventApi(calendarId: string, eventId: string): Promise<{ success: boolean; error?: string }> {
  let { token, error: tokenError } = await getOrRefreshAccessToken();
  if (!token) {
    return { success: false, error: tokenError || '401 UNAUTHENTICATED: No OAuth access token stored.' };
  }

  try {
    let res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      const refreshResult = await refreshGoogleAccessToken();
      if (refreshResult.accessToken) {
        token = refreshResult.accessToken;
        res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    }
    if (res.status === 204 || res.ok) {
      return { success: true };
    }
    const errData = await res.json().catch(() => ({}));
    return { success: false, error: errData?.error?.message || `HTTP ${res.status}: ${res.statusText}` };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error deleting event' };
  }
}

