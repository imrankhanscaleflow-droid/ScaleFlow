/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect } from 'react';
import { Route } from '../types';
import { 
  Layers, 
  ArrowLeft, 
  ShieldAlert, 
  Sparkles, 
  Eye, 
  EyeOff, 
  User, 
  Building, 
  Globe, 
  MapPin, 
  Clock, 
  Lock, 
  Mail, 
  Phone, 
  Briefcase,
  CheckCircle2,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  registerBusinessAccount, 
  authenticateUser, 
  establishSession, 
  requestPasswordResetPin, 
  executePasswordReset, 
  verifyEmailPin,
  getAccounts
} from '../lib/auth';

interface LoginPageProps {
  onNavigate: (route: Route) => void;
  onLoginSuccess: (email: string, name: string) => void;
}

type AuthMode = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

export function LoginPage({ onNavigate, onLoginSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- Login Form State ---
  const [loginEmail, setLoginEmail] = useState('imrankhan.scaleflow@gmail.com');
  const [loginPassword, setLoginPassword] = useState('demopassword123');
  const [rememberMe, setRememberMe] = useState(true);

  // --- Registration Form State ---
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regBusinessName, setRegBusinessName] = useState('');
  const [regIndustry, setRegIndustry] = useState('Technology & SaaS');
  const [regPhone, setRegPhone] = useState('');
  const [regWebsite, setRegWebsite] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regTimezone, setRegTimezone] = useState('America/Los_Angeles');

  // --- Verification State ---
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [helperPin, setHelperPin] = useState(''); // PIN helper to make testing ultra-smooth

  // --- Forgot / Reset State ---
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetPin, setResetPin] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  // Handle verification resend timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Clean notifications when switching tabs/modes
  const switchMode = (newMode: AuthMode) => {
    setError('');
    setSuccess('');
    setMode(newMode);
  };

  // --- SUBMIT HANDLERS ---

  // 1. LOGIN
  const handleLoginSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!loginEmail || !loginPassword) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const authResult = authenticateUser(loginEmail, loginPassword, rememberMe);
      setIsLoading(false);

      if (!authResult.success || !authResult.account) {
        setError(authResult.error || 'Invalid credentials.');
        return;
      }

      const acc = authResult.account;

      // Check Email Verification
      if (!acc.emailVerified) {
        setVerificationEmail(acc.email);
        setHelperPin(acc.verificationPin);
        switchMode('verify');
        setError('Your workspace email is pending verification. Please confirm below.');
        return;
      }

      // Complete session establishment and swap workspaces
      establishSession(acc, rememberMe);
      onLoginSuccess(acc.email, acc.ownerName);
    }, 600);
  };

  // 2. SIGN UP / REGISTER
  const handleRegisterSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Input Validation
    if (!regEmail || !regPassword || !regOwnerName || !regBusinessName || !regPhone || !regAddress) {
      setError('Please fill in all mandatory fields with valid workspace parameters.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must contain at least 6 characters for token security.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const regResult = registerBusinessAccount({
        email: regEmail,
        passwordHash: regPassword,
        ownerName: regOwnerName,
        businessName: regBusinessName,
        industry: regIndustry,
        phone: regPhone,
        website: regWebsite,
        address: regAddress,
        timezone: regTimezone
      });

      setIsLoading(false);

      if (!regResult.success) {
        setError(regResult.error || 'Failed to initialize workspace.');
        return;
      }

      setVerificationEmail(regEmail);
      setHelperPin(regResult.verificationPin || '');
      setSuccess('Your enterprise workspace profile was generated! A security PIN has been issued.');
      setResendCountdown(30);
      switchMode('verify');
    }, 800);
  };

  // 3. EMAIL VERIFICATION
  const handleVerificationSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!verificationCode) {
      setError('Please enter the 6-digit security PIN.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = verifyEmailPin(verificationEmail, verificationCode);
      setIsLoading(false);

      if (!result.success) {
        setError(result.error || 'Incorrect security pin.');
        return;
      }

      // Fetch verified account to log in automatically
      const accounts = getAccounts();
      const verifiedAcc = accounts.find(a => a.email.toLowerCase() === verificationEmail.toLowerCase());
      
      if (verifiedAcc) {
        establishSession(verifiedAcc, rememberMe);
        onLoginSuccess(verifiedAcc.email, verifiedAcc.ownerName);
      } else {
        switchMode('login');
        setSuccess('Email verified successfully! Please sign in.');
      }
    }, 600);
  };

  // 4. FORGOT PASSWORD REQUEST
  const handleForgotSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!forgotEmail) {
      setError('Please provide your workspace email.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = requestPasswordResetPin(forgotEmail);
      setIsLoading(false);

      if (!result.success) {
        setError(result.error || 'Failed to dispatch reset request.');
        return;
      }

      setHelperPin(result.pin || '');
      setSuccess('A temporary password reset code has been generated.');
      switchMode('reset');
    }, 700);
  };

  // 5. RESET PASSWORD EXECUTION
  const handleResetSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!forgotEmail || !resetPin || !resetNewPassword) {
      setError('All parameters are required to reset security credentials.');
      return;
    }

    if (resetNewPassword.length < 6) {
      setError('Security password must contain at least 6 characters.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const result = executePasswordReset(forgotEmail, resetPin, resetNewPassword);
      setIsLoading(false);

      if (!result.success) {
        setError(result.error || 'Reset code validation failed.');
        return;
      }

      setLoginEmail(forgotEmail);
      setLoginPassword(resetNewPassword);
      switchMode('login');
      setSuccess('Password updated successfully! Sign in using your new credentials.');
    }, 700);
  };

  const handleResendCode = () => {
    if (resendCountdown > 0) return;
    
    // Regenerate code for active verification email
    const accounts = getAccounts();
    const acc = accounts.find(a => a.email.toLowerCase() === verificationEmail.toLowerCase());
    if (acc) {
      setHelperPin(acc.verificationPin);
      setSuccess('A new verification security PIN has been dispatched.');
      setResendCountdown(30);
    } else {
      setError('Failed to dispatch code. Please try registering again.');
    }
  };

  return (
    <div className="bg-[#040406] min-h-screen flex flex-col justify-center relative px-4 sm:px-6 lg:px-8 py-12 selection:bg-brand-500/30 selection:text-white overflow-y-auto">
      
      {/* Decorative ambient glowing grids */}
      <div className="absolute inset-0 bg-[radial-gradient(#14141d_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Brand Lockup */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-4">
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('landing')}>
            <div className="p-2 rounded-xl bg-brand-600/10 border border-brand-500/30">
              <Layers className="w-6 h-6 text-brand-400" />
            </div>
            <span className="font-display font-semibold text-xl tracking-tight text-white">
              Scale<span className="text-brand-400">Flow</span>
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 font-sans">
          Automated multi-tenant voice, lead, and CRM qualifying engine.
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <div className="bg-[#08080c] border border-[#1a1a24] py-8 px-6 sm:px-10 rounded-2xl shadow-2xl space-y-6">
          
          {/* Status Notifications */}
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-400 font-sans animate-fade-in">
              <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-xs text-emerald-400 font-sans animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Render Active Interactive Form Sub-views */}
          <AnimatePresence mode="wait">
            
            {/* VIEW 1: LOGIN */}
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">Console Sign In</h3>
                  <p className="text-xs text-gray-500">Access your designated enterprise workspace credentials.</p>
                </div>

                <form className="space-y-4" onSubmit={handleLoginSubmit}>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-500" /> Email Address
                    </label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                      placeholder="name@company.com"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-gray-500" /> Password
                      </label>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="text-[10px] font-medium text-brand-400 hover:text-brand-300 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="block w-full pl-3.5 pr-10 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-colors"
                        placeholder="Enter password token"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me checkbox */}
                  <div className="flex items-center justify-between py-1 text-xs">
                    <label className="flex items-center gap-2 text-gray-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded bg-[#040406] border-[#1d1d29] text-brand-500 focus:ring-brand-500 focus:ring-offset-[#08080c] rounded"
                      />
                      Remember My Workspace
                    </label>
                  </div>

                  {/* Quick Demo Assist */}
                  <div className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/10 flex items-center justify-between text-[11px] text-brand-300">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brand-400 flex-shrink-0" />
                      Demo Credentials Pre-configured.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginEmail('imrankhan.scaleflow@gmail.com');
                        setLoginPassword('demopassword123');
                      }}
                      className="font-bold text-brand-400 hover:text-brand-300 transition-colors underline cursor-pointer"
                    >
                      Autofill
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 text-xs font-semibold text-white rounded-lg border border-brand-500/20 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" /> : 'Authenticate Console'}
                  </button>
                </form>

                <div className="text-center pt-3 border-t border-[#12121a]">
                  <p className="text-xs text-gray-500">
                    Need a dedicated business workspace?{' '}
                    <button 
                      onClick={() => switchMode('register')} 
                      className="font-semibold text-brand-400 hover:text-brand-300 transition-colors cursor-pointer"
                    >
                      Create Account
                    </button>
                  </p>
                </div>
              </motion.div>
            )}

            {/* VIEW 2: REGISTER */}
            {mode === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">Create Workspace</h3>
                  <p className="text-xs text-gray-500">Initialize an isolated CRM, leads, & AI dialer node.</p>
                </div>

                <form className="space-y-4 max-h-[480px] overflow-y-auto pr-1" onSubmit={handleRegisterSubmit}>
                  
                  {/* Category Header: Owner Account */}
                  <div className="border-b border-[#151522] pb-1.5">
                    <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">1. Owner Credentials</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <User className="w-3 h-3 text-gray-500" /> Full Name
                      </label>
                      <input
                        type="text"
                        value={regOwnerName}
                        onChange={(e) => setRegOwnerName(e.target.value)}
                        className="block w-full px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
                        placeholder="Imran Khan"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-500" /> Account Email
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="block w-full px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
                        placeholder="name@company.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-gray-500" /> Account Password
                    </label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="block w-full px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
                      placeholder="Min 6 characters"
                      required
                    />
                  </div>

                  {/* Category Header: Business Profile */}
                  <div className="border-b border-[#151522] pb-1.5 pt-2">
                    <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">2. Business Profile</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Building className="w-3 h-3 text-gray-500" /> Company Name
                      </label>
                      <input
                        type="text"
                        value={regBusinessName}
                        onChange={(e) => setRegBusinessName(e.target.value)}
                        className="block w-full px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
                        placeholder="Vertex Systems"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-gray-500" /> Industry
                      </label>
                      <select
                        value={regIndustry}
                        onChange={(e) => setRegIndustry(e.target.value)}
                        className="block w-full px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-300 focus:outline-none"
                      >
                        <option value="Technology & SaaS">Technology & SaaS</option>
                        <option value="Real Estate">Real Estate</option>
                        <option value="Healthcare">Healthcare</option>
                        <option value="Professional Consulting">Professional Consulting</option>
                        <option value="Financial Services">Financial Services</option>
                        <option value="Other Industry">Other Industry</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-gray-500" /> Contact Phone
                      </label>
                      <input
                        type="text"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="block w-full px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
                        placeholder="+1 (555) 012-3456"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-gray-500" /> Web Domain
                      </label>
                      <input
                        type="text"
                        value={regWebsite}
                        onChange={(e) => setRegWebsite(e.target.value)}
                        className="block w-full px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
                        placeholder="https://company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-500" /> Street Address
                    </label>
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      className="block w-full px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
                      placeholder="123 Corporate Dr, San Francisco, CA"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" /> Operation Time Zone
                    </label>
                    <select
                      value={regTimezone}
                      onChange={(e) => setRegTimezone(e.target.value)}
                      className="block w-full px-3 py-1.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-gray-300 focus:outline-none"
                    >
                      <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 py-2.5 px-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 text-xs font-semibold text-white rounded-lg border border-brand-500/20 shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" /> : 'Provision Isolated Workspace'}
                  </button>
                </form>

                <div className="text-center pt-3 border-t border-[#12121a]">
                  <button 
                    onClick={() => switchMode('login')} 
                    className="font-medium text-xs text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>
                </div>
              </motion.div>
            )}

            {/* VIEW 3: EMAIL VERIFICATION */}
            {mode === 'verify' && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 animate-fade-in"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">Security Verification</h3>
                  <p className="text-xs text-gray-400">
                    A confirmation code was issued to <strong className="text-brand-300">{verificationEmail}</strong>.
                  </p>
                </div>

                {/* Simulated Verification PIN display so user is never stuck */}
                {helperPin && (
                  <div className="p-3.5 bg-brand-500/10 border border-brand-500/25 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-brand-300 font-semibold uppercase tracking-wider text-[10px]">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      Mock Dispatch Node:
                    </div>
                    <p className="text-gray-400 leading-normal">
                      Since this is a sandboxed environment, we have intercepted the verification PIN:
                    </p>
                    <div className="bg-[#030305] border border-[#1d1d29] px-3 py-2 rounded-lg font-mono text-center text-sm font-bold text-white tracking-[0.2em]">
                      {helperPin}
                    </div>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleVerificationSubmit}>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      6-Digit Confirmation PIN
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                      className="block w-full px-3.5 py-2.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-sm text-center font-mono font-bold tracking-[0.5em] text-white placeholder-gray-700 focus:outline-none"
                      placeholder="000000"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 text-xs font-semibold text-white rounded-lg border border-brand-500/20 shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" /> : 'Confirm Credentials'}
                  </button>
                </form>

                <div className="flex items-center justify-between pt-3 border-t border-[#12121a] text-xs">
                  <button
                    onClick={() => switchMode('login')}
                    className="text-gray-500 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  
                  <button
                    onClick={handleResendCode}
                    disabled={resendCountdown > 0}
                    className={`font-semibold transition-colors cursor-pointer ${
                      resendCountdown > 0 ? 'text-gray-600' : 'text-brand-400 hover:text-brand-300'
                    }`}
                  >
                    {resendCountdown > 0 ? `Resend Code (${resendCountdown}s)` : 'Resend PIN'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* VIEW 4: FORGOT PASSWORD */}
            {mode === 'forgot' && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">Recover Credentials</h3>
                  <p className="text-xs text-gray-500">Provide your account email to dispatch a temporary reset pin.</p>
                </div>

                <form className="space-y-4" onSubmit={handleForgotSubmit}>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-500" /> Account Email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="block w-full px-3.5 py-2.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500"
                      placeholder="name@company.com"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 text-xs font-semibold text-white rounded-lg border border-brand-500/20 shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" /> : 'Request Reset Pin'}
                  </button>
                </form>

                <div className="text-center pt-3 border-t border-[#12121a]">
                  <button 
                    onClick={() => switchMode('login')} 
                    className="font-medium text-xs text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                  </button>
                </div>
              </motion.div>
            )}

            {/* VIEW 5: RESET PASSWORD */}
            {mode === 'reset' && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5 animate-fade-in"
              >
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-bold text-white tracking-tight">Configure New Password</h3>
                  <p className="text-xs text-gray-500">Provide the 6-digit verification PIN received below.</p>
                </div>

                {/* Reset PIN Helper */}
                {helperPin && (
                  <div className="p-3.5 bg-indigo-500/5 border border-indigo-500/15 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-brand-300 font-semibold uppercase tracking-wider text-[10px]">
                      <Sparkles className="w-4 h-4 text-brand-400" />
                      Interception PIN:
                    </div>
                    <div className="bg-[#030305] border border-[#1d1d29] px-3 py-2 rounded-lg font-mono text-center text-sm font-bold text-white tracking-[0.2em]">
                      {helperPin}
                    </div>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleResetSubmit}>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      Reset PIN Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={resetPin}
                      onChange={(e) => setResetPin(e.target.value.replace(/[^0-9]/g, ''))}
                      className="block w-full px-3.5 py-2 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-center font-mono font-bold tracking-widest text-white"
                      placeholder="000000"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                      New Password Security Token
                    </label>
                    <input
                      type="password"
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      className="block w-full px-3.5 py-2.5 bg-[#040406] border border-[#1d1d29] rounded-lg text-xs text-white"
                      placeholder="Minimum 6 characters"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 disabled:bg-brand-600/50 text-xs font-semibold text-white rounded-lg border border-brand-500/20 shadow-md cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isLoading ? <span className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" /> : 'Confirm Password Update'}
                  </button>
                </form>

                <div className="text-center pt-3 border-t border-[#12121a]">
                  <button 
                    onClick={() => switchMode('login')} 
                    className="font-medium text-xs text-gray-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
