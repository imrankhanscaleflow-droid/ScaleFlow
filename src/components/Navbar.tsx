/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Route } from '../types';
import { Layers, Menu, X, ArrowRight } from 'lucide-react';

interface NavbarProps {
  onNavigate: (route: Route) => void;
}

export function Navbar({ onNavigate }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050507]/60 backdrop-blur-md border-b border-[#1a1a24] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="p-1.5 rounded-lg bg-brand-600/10 border border-brand-500/30 group-hover:border-brand-500/60 transition-colors">
              <Layers className="w-5 h-5 text-brand-400 group-hover:rotate-12 transition-transform" />
            </div>
            <span className="font-display font-semibold text-lg tracking-tight text-white">
              Scale<span className="text-brand-400">Flow</span>
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</a>
            <a href="#solutions" className="text-sm text-gray-400 hover:text-white transition-colors">Solutions</a>
            <a href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
            <a href="#docs" className="text-sm text-gray-400 hover:text-white transition-colors">Docs</a>
          </div>

          {/* Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={() => onNavigate('login')}
              className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </button>
            <button 
              onClick={() => onNavigate('login')}
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 px-4 py-2 rounded-lg transition-colors border border-brand-500/30 hover:border-brand-400/40 shadow-[0_0_20px_rgba(124,58,237,0.15)] hover:shadow-[0_0_25px_rgba(124,58,237,0.3)]"
            >
              Start Free
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-[#12121a] focus:outline-none"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="block h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#07070a] border-b border-[#1a1a24] animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-[#12121a]"
            >
              Features
            </a>
            <a
              href="#solutions"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-[#12121a]"
            >
              Solutions
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-[#12121a]"
            >
              Pricing
            </a>
            <a
              href="#docs"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-[#12121a]"
            >
              Docs
            </a>
          </div>
          <div className="pt-4 pb-4 border-t border-[#12121a] px-5 flex flex-col gap-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('login');
              }}
              className="w-full text-center py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-[#12121a] transition-colors border border-[#1a1a24]"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('login');
              }}
              className="w-full text-center py-2.5 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 transition-colors shadow-lg"
            >
              Start Free
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
