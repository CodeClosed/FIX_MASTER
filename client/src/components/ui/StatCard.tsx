import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  subtitle?: string;
  badge?: string;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'info';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  subtitle,
  badge,
  variant = 'default',
}) => {
  const variantStyles = {
    default: 'bg-slate-900/80 border-slate-800 text-slate-100',
    danger: 'bg-rose-950/20 border-rose-900/50 text-rose-200',
    warning: 'bg-amber-950/20 border-amber-900/50 text-amber-200',
    success: 'bg-emerald-950/20 border-emerald-900/50 text-emerald-200',
    info: 'bg-cyan-950/20 border-cyan-900/50 text-cyan-200',
  };

  const iconColors = {
    default: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    danger: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    info: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border shadow-lg flex flex-col justify-between ${variantStyles[variant]}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl border ${iconColors[variant]}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl sm:text-3xl font-extrabold tracking-tight">{value}</span>
        {badge && (
          <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 border border-slate-700">
            {badge}
          </span>
        )}
      </div>

      {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
  );
};
