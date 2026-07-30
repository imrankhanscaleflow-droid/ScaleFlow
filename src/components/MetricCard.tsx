/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { ReactNode } from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  description?: string;
  icon: ReactNode;
  loading?: boolean;
  accentColor?: string;
}

export function MetricCard({ 
  title, 
  value, 
  change, 
  trend = 'neutral', 
  description, 
  icon, 
  loading,
  accentColor = 'violet'
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-[#0b0c12]/80 border border-white/[0.08] rounded-2xl p-6 animate-pulse space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-3 w-24 bg-white/10 rounded" />
          <div className="w-8 h-8 bg-white/10 rounded-xl" />
        </div>
        <div className="h-8 w-32 bg-white/10 rounded" />
        <div className="h-3 w-40 bg-white/10 rounded" />
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden bg-[#0a0b10]/80 border border-white/[0.08] hover:border-violet-500/30 rounded-2xl p-6 backdrop-blur-xl shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-violet-500/10 transition-all duration-300 hover:-translate-y-0.5">
      {/* Dynamic ambient radial lighting */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br from-violet-500/15 via-indigo-500/10 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent group-hover:via-violet-400/30 transition-all duration-300" />

      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 font-sans">{title}</span>
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-gray-300 group-hover:text-violet-300 group-hover:bg-violet-500/10 group-hover:border-violet-500/20 transition-all duration-300 shadow-inner">
          {icon}
        </div>
      </div>

      <div className="relative z-10 mt-4 flex items-baseline justify-between gap-2">
        <span className="text-3xl font-extrabold font-display text-white tracking-tight">{value}</span>
        {change && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border backdrop-blur-md ${
            trend === 'up' 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10' 
              : trend === 'down' 
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-sm shadow-rose-500/10' 
                : 'bg-gray-500/10 text-gray-300 border-gray-500/20'
          }`}>
            {trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5" />}
            {trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend === 'neutral' && <Minus className="w-3.5 h-3.5" />}
            {change}
          </span>
        )}
      </div>

      {description && (
        <p className="relative z-10 mt-3 text-xs text-gray-400 font-normal truncate flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400/80 inline-block" />
          {description}
        </p>
      )}
    </div>
  );
}

