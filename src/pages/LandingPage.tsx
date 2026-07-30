/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Route } from '../types';
import { Navbar } from '../components/Navbar';
import { 
  ArrowRight, 
  Bot, 
  Target, 
  MessageSquare, 
  BarChart3, 
  Zap, 
  Shield, 
  Sparkles,
  PhoneCall,
  UserCheck,
  Layers
} from 'lucide-react';
import { motion } from 'motion/react';

interface LandingPageProps {
  onNavigate: (route: Route) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="bg-[#050507] min-h-screen selection:bg-brand-500/30 selection:text-white">
      {/* Navbar */}
      <Navbar onNavigate={onNavigate} />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Tagline pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-600/10 border border-brand-500/20 text-xs text-brand-300 font-mono mb-6 mx-auto animate-fade-in">
            <Sparkles className="w-3 h-3 text-brand-400" />
            <span>The Platform Foundation for Conversational Scale</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-extrabold text-white tracking-tight leading-[1.1] max-w-4xl mx-auto">
            Automate Voice & Chat Operations <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-white via-brand-100 to-brand-400 bg-clip-text text-transparent">
              at Absolute scale
            </span>
          </h1>

          {/* Description */}
          <p className="mt-6 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto font-sans leading-relaxed">
            Configure lightning-fast AI agents, manage qualified pipelines, and track conversations across channels. A premium, ultra-scalable architecture tailored for developers and rapid deployments.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('login')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white rounded-lg transition-all border border-brand-500/30 shadow-[0_0_30px_rgba(124,58,237,0.25)] hover:shadow-[0_0_35px_rgba(124,58,237,0.4)] cursor-pointer group"
            >
              Get Started for Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#0a0a0f] hover:bg-[#12121c] text-sm font-semibold text-gray-300 hover:text-white rounded-lg transition-colors border border-[#1a1a24] cursor-pointer"
            >
              Explore Live Workspace
            </button>
          </div>

          {/* Mockup Dashboard Preview Container */}
          <div className="mt-16 md:mt-24 relative max-w-5xl mx-auto">
            <div className="absolute inset-0 bg-brand-500/5 rounded-2xl blur-3xl -z-10" />
            <div className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-2 sm:p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
              {/* Fake Chrome Bar */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-[#13131b] mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
                </div>
                <div className="text-[10px] text-gray-500 font-mono px-3 py-0.5 bg-[#030305] rounded-md border border-[#12121a]">
                  scaleflow.io/console/dashboard
                </div>
                <div className="w-8 h-2.5 rounded bg-[#12121a]" />
              </div>

              {/* Inside Chrome Mock */}
              <div className="grid grid-cols-12 gap-3 text-left">
                {/* Left Mini Sidebar mock */}
                <div className="col-span-3 border-r border-[#13131b] pr-3 hidden sm:block space-y-2">
                  <div className="h-6 w-20 bg-brand-600/10 rounded border border-brand-500/10" />
                  <div className="h-8 w-full bg-[#12121a] rounded-lg" />
                  <div className="h-8 w-full bg-transparent rounded-lg" />
                  <div className="h-8 w-full bg-transparent rounded-lg" />
                  <div className="h-8 w-full bg-transparent rounded-lg" />
                </div>
                {/* Right Panel mock */}
                <div className="col-span-12 sm:col-span-9 space-y-4">
                  {/* Grid layout */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-[#0a0a0f] border border-[#151522] rounded-lg space-y-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">AI Accuracy</span>
                      <p className="text-base font-bold text-white">99.4%</p>
                    </div>
                    <div className="p-3 bg-[#0a0a0f] border border-[#151522] rounded-lg space-y-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">Response Uptime</span>
                      <p className="text-base font-bold text-emerald-400">99.99%</p>
                    </div>
                    <div className="p-3 bg-[#0a0a0f] border border-[#151522] rounded-lg space-y-1">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wide">SLA Latency</span>
                      <p className="text-base font-bold text-brand-400">&lt; 850ms</p>
                    </div>
                  </div>
                  {/* Visual Row */}
                  <div className="h-28 bg-[#0a0a0f] border border-[#151522] rounded-lg p-3 flex flex-col justify-between">
                    <div className="h-4 w-28 bg-[#181824] rounded" />
                    <div className="flex items-end gap-1.5 h-12">
                      <div className="h-4 w-full bg-brand-600/20 rounded-sm" />
                      <div className="h-6 w-full bg-brand-600/30 rounded-sm" />
                      <div className="h-8 w-full bg-brand-600/40 rounded-sm" />
                      <div className="h-10 w-full bg-brand-500 rounded-sm" />
                      <div className="h-5 w-full bg-brand-600/30 rounded-sm" />
                      <div className="h-7 w-full bg-brand-600/40 rounded-sm" />
                      <div className="h-12 w-full bg-brand-500 rounded-sm shadow-[0_0_15px_rgba(124,58,237,0.3)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento-style Features Section */}
      <section id="features" className="py-24 bg-[#07070a] border-y border-[#1a1a24] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-display font-extrabold text-white tracking-tight sm:text-4xl">
              Engineered for Complete Operations
            </h2>
            <p className="mt-4 text-base text-gray-400">
              Stop stitching disparate tools together. ScaleFlow integrates every piece of your user acquisition and voice funnel inside an elegant platform container.
            </p>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Box 1: AI Receptionist */}
            <div className="p-6 bg-[#09090d] border border-[#1a1a26] rounded-2xl space-y-4 hover:border-brand-500/20 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400 group-hover:scale-105 transition-transform">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white font-display">AI Voice Receptionist</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Configure smart interactive voice response agents. Answer custom phone pipelines and catalog transcript events in milliseconds without custom logic servers.
              </p>
            </div>

            {/* Box 2: Pipeline management */}
            <div className="p-6 bg-[#09090d] border border-[#1a1a26] rounded-2xl space-y-4 hover:border-brand-500/20 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white font-display">Lead Classification</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Sort, assign, and value inbound leads automatically. Keep tracking data robust using native workflows tailored for sales pipeline clarity.
              </p>
            </div>

            {/* Box 3: Chat/Conversations */}
            <div className="p-6 bg-[#09090d] border border-[#1a1a26] rounded-2xl space-y-4 hover:border-brand-500/20 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white font-display">Omni-Channel Chats</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Synchronize customer responses across SMS, direct voice recordings, and native widgets in real time. Maintain singular context histories effortlessly.
              </p>
            </div>

            {/* Box 4: Live Analytics */}
            <div className="p-6 bg-[#09090d] border border-[#1a1a26] rounded-2xl space-y-4 hover:border-brand-500/20 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white font-display">Deep Pipeline Analytics</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Access interactive chart interfaces tracking conversion velocity, active live calls, connection rate history, and overall agent performance.
              </p>
            </div>

            {/* Box 5: Sub-second Execution */}
            <div className="p-6 bg-[#09090d] border border-[#1a1a26] rounded-2xl space-y-4 hover:border-brand-500/20 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white font-display">Sub-second Latency</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Our infrastructure handles client events asynchronously. Experience responsive dashboards and seamless visual state synchronization on every action.
              </p>
            </div>

            {/* Box 6: Security and Compliance */}
            <div className="p-6 bg-[#09090d] border border-[#1a1a26] rounded-2xl space-y-4 hover:border-brand-500/20 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-white font-display">Enterprise Security</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                A secure application skeleton designed with pristine boundaries. Zero public API key leaks, secure routing boundaries, and clean configuration files.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Stats row */}
      <section className="py-20 bg-[#050507]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-display font-extrabold text-white">4.8k+</p>
              <p className="text-xs text-gray-500 font-mono uppercase mt-2">Active Deployments</p>
            </div>
            <div>
              <p className="text-4xl font-display font-extrabold text-white">12M+</p>
              <p className="text-xs text-gray-500 font-mono uppercase mt-2">API Events Logged</p>
            </div>
            <div>
              <p className="text-4xl font-display font-extrabold text-white">&lt;850ms</p>
              <p className="text-xs text-gray-500 font-mono uppercase mt-2">Average SLA Speed</p>
            </div>
            <div>
              <p className="text-4xl font-display font-extrabold text-white">99.99%</p>
              <p className="text-xs text-gray-500 font-mono uppercase mt-2">Core Node Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Block */}
      <section className="py-24 bg-[#08080c] border-t border-[#1a1a24] relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-600/5 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl font-display font-extrabold text-white tracking-tight sm:text-4xl">
            Ready to explore ScaleFlow?
          </h2>
          <p className="mt-4 text-base text-gray-400 max-w-xl mx-auto">
            Experience the clean, scalable foundation of ScaleFlow. Sign in to access your dashboard workspace instantly.
          </p>
          <div className="mt-8">
            <button
              onClick={() => onNavigate('login')}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-sm font-semibold text-white rounded-lg transition-all border border-brand-500/20 shadow-[0_0_25px_rgba(124,58,237,0.2)] hover:shadow-[0_0_30px_rgba(124,58,237,0.35)] cursor-pointer"
            >
              Access Dashboard Foundation
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Simple Clean Footer */}
      <footer className="py-12 bg-[#050507] border-t border-[#13131b] text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-brand-500" />
            <span className="font-display font-semibold text-base text-white">ScaleFlow</span>
          </div>
          <p className="text-xs text-gray-500 font-mono">
            © 2026 ScaleFlow Inc. Built exclusively as a clean SaaS foundations module.
          </p>
        </div>
      </footer>
    </div>
  );
}
