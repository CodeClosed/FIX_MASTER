import React from 'react';
import { ComplaintStatus, Priority, Specialization, Role } from '../../types';
import {
  Clock,
  UserCheck,
  Wrench,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Flame,
  ArrowUpRight,
  Minus,
  Sparkles,
  Zap,
  Hammer,
  Wind,
  Droplets,
  Shield,
  GraduationCap,
  HardHat,
  UserCog,
} from 'lucide-react';

interface StatusBadgeProps {
  status: ComplaintStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  switch (status) {
    case 'OPEN':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 ${sizeClasses[size]}`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>OPEN</span>
        </span>
      );

    case 'ASSIGNED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 ${sizeClasses[size]}`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>ASSIGNED</span>
        </span>
      );

    case 'IN_PROGRESS':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 ${sizeClasses[size]}`}
        >
          <Wrench className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
          <span>IN PROGRESS</span>
        </span>
      );

    case 'PENDING_VERIFICATION':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse ${sizeClasses[size]}`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>VERIFICATION REQUIRED</span>
        </span>
      );

    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ${sizeClasses[size]}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>CLOSED / COMPLETED</span>
        </span>
      );

    case 'ESCALATED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold ${sizeClasses[size]}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>ESCALATED</span>
        </span>
      );

    case 'REJECTED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-700/50 text-slate-400 border border-slate-600 ${sizeClasses[size]}`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>REJECTED</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-slate-800 text-slate-300 ${sizeClasses[size]}`}>
          {status}
        </span>
      );
  }
};

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md' | 'lg';
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  switch (priority) {
    case 'EMERGENCY':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-red-600 text-white font-extrabold shadow-lg shadow-red-600/30 animate-bounce ${sizeClasses[size]}`}
        >
          <Flame className="w-3.5 h-3.5 fill-current" />
          <span>EMERGENCY</span>
        </span>
      );

    case 'HIGH':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 ${sizeClasses[size]}`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>HIGH</span>
        </span>
      );

    case 'MEDIUM':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 ${sizeClasses[size]}`}
        >
          <Minus className="w-3.5 h-3.5" />
          <span>MEDIUM</span>
        </span>
      );

    case 'LOW':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses[size]}`}
        >
          <span>LOW</span>
        </span>
      );

    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded-full bg-slate-800 text-slate-300 ${sizeClasses[size]}`}>
          {priority}
        </span>
      );
  }
};

interface SpecializationBadgeProps {
  specialization: Specialization;
}

export const SpecializationBadge: React.FC<SpecializationBadgeProps> = ({ specialization }) => {
  const getIcon = () => {
    switch (specialization) {
      case 'CLEANING':
        return <Sparkles className="w-3.5 h-3.5 text-teal-400" />;
      case 'ELECTRICIAN':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'CARPENTER':
        return <Hammer className="w-3.5 h-3.5 text-orange-400" />;
      case 'AC_TECH':
        return <Wind className="w-3.5 h-3.5 text-cyan-400" />;
      case 'PLUMBER':
        return <Droplets className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium">
      {getIcon()}
      <span>{specialization}</span>
    </span>
  );
};

export const RoleBadge: React.FC<{ role: Role }> = ({ role }) => {
  switch (role) {
    case 'STUDENT':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
          <GraduationCap className="w-3 h-3" />
          STUDENT
        </span>
      );
    case 'STAFF':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
          <HardHat className="w-3 h-3" />
          TECHNICIAN
        </span>
      );
    case 'SUPERVISOR':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
          <UserCog className="w-3 h-3" />
          SUPERVISOR
        </span>
      );
    case 'ADMIN':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs font-semibold border border-purple-500/20">
          <Shield className="w-3 h-3" />
          ADMIN
        </span>
      );
  }
};
