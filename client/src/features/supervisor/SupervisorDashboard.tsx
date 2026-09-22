import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../api/endpoints';
import { StatCard } from '../../components/ui/StatCard';
import { coerceNumber } from '../../utils/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard,
  Building2,
  AlertTriangle,
  Clock,
  Wrench,
  Star,
  Layers,
} from 'lucide-react';

export const SupervisorDashboard: React.FC = () => {
  const { data: kpis = [], isLoading } = useQuery({
    queryKey: ['analytics-kpi'],
    queryFn: analyticsApi.getKpis,
  });

  // Calculate system-wide totals with STRICT string-to-number coercion
  const totals = kpis.reduce(
    (acc, b) => ({
      total: acc.total + coerceNumber(b.total_complaints),
      pending: acc.pending + coerceNumber(b.pending_complaints),
      active: acc.active + coerceNumber(b.active_in_progress),
      verification: acc.verification + coerceNumber(b.awaiting_student_verification),
      resolved: acc.resolved + coerceNumber(b.resolved_count),
      escalated: acc.escalated + coerceNumber(b.escalated_count),
      commonArea: acc.commonArea + coerceNumber(b.common_area_issues),
    }),
    {
      total: 0,
      pending: 0,
      active: 0,
      verification: 0,
      resolved: 0,
      escalated: 0,
      commonArea: 0,
    }
  );

  // Chart data formatting
  const chartData = kpis.map((b) => ({
    block: b.block_name || b.block_id,
    Total: coerceNumber(b.total_complaints),
    Pending: coerceNumber(b.pending_complaints),
    Active: coerceNumber(b.active_in_progress),
    Resolved: coerceNumber(b.resolved_count),
    Escalated: coerceNumber(b.escalated_count),
  }));

  return (
    <div className="space-y-8 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 text-cyan-400">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-100">Supervisor KPI Dashboard</h1>
          <p className="text-xs text-slate-400">Hostel maintenance analytics across all blocks</p>
        </div>
      </div>

      {/* ESCALATED ALERT BANNER (If escalated > 0) */}
      {totals.escalated > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/50 shadow-xl flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-rose-300">
                ATTENTION: {totals.escalated} Escalated Tickets Pending Action
              </h3>
              <p className="text-xs text-rose-200/80">
                Students rejected resolution on these tickets. Immediate re-inspection required.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* System Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Tickets"
          value={totals.total}
          icon={Layers}
          variant="default"
        />

        <StatCard
          title="Pending Assign"
          value={totals.pending}
          icon={Clock}
          variant="warning"
        />

        <StatCard
          title="Active Servicing"
          value={totals.active}
          icon={Wrench}
          variant="info"
        />

        <StatCard
          title="Escalated Tickets"
          value={totals.escalated}
          icon={AlertTriangle}
          variant={totals.escalated > 0 ? 'danger' : 'default'}
          badge={totals.escalated > 0 ? 'URGENT' : 'OK'}
        />
      </div>

      {/* Recharts Block Comparison Chart */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Block Status Breakdown</span>
            </h3>
            <p className="text-xs text-slate-400">Distribution of complaints per hostel block</p>
          </div>
        </div>

        {isLoading ? (
          <div className="h-64 bg-slate-950 rounded-2xl animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400 bg-slate-950 rounded-2xl">
            No KPI block summary data available.
          </div>
        ) : (
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="block" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Total" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Active" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Escalated" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Block KPI Details Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cyan-400" />
          <span>Hostel Block Performance Breakdown</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {kpis.map((b) => {
            const avgRating = coerceNumber(b.average_student_rating);
            const esc = coerceNumber(b.escalated_count);

            return (
              <div
                key={b.block_id}
                className={`p-5 rounded-2xl bg-slate-900 border transition-colors shadow-lg space-y-3 ${
                  esc > 0 ? 'border-rose-900/50 bg-rose-950/10' : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-base font-bold text-slate-100">{b.block_name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono">ID: {b.block_id}</span>
                  </div>

                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{avgRating ? avgRating.toFixed(1) : 'N/A'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Total
                    </span>
                    <span className="font-extrabold text-slate-100">
                      {coerceNumber(b.total_complaints)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-amber-400 uppercase font-semibold block">
                      Pending
                    </span>
                    <span className="font-extrabold text-amber-300">
                      {coerceNumber(b.pending_complaints)}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-rose-400 uppercase font-semibold block">
                      Escalated
                    </span>
                    <span className="font-extrabold text-rose-300">
                      {coerceNumber(b.escalated_count)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
