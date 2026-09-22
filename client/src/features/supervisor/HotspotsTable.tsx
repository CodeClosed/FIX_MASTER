import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../api/endpoints';
import { EmptyState } from '../../components/ui/EmptyState';
import { coerceNumber, formatDateTime } from '../../utils/formatters';
import { Flame, ShieldCheck, MapPin } from 'lucide-react';

export const HotspotsTable: React.FC = () => {
  const { data: hotspots = [], isLoading } = useQuery({
    queryKey: ['analytics-hotspots'],
    queryFn: analyticsApi.getHotspots,
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-amber-600/20 border border-amber-500/30 text-amber-400">
          <Flame className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-100">Recurring Defect Hotspots</h1>
          <p className="text-xs text-slate-400">
            Facilities with 2+ reported incidents in the past 14 days
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-900/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : hotspots.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No recurring hotspots detected"
          description="Excellent! No common area or room facilities have registered 2 or more repeated incidents over the last 14 days."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <th className="p-4">Location / Asset</th>
                  <th className="p-4">Hostel Block</th>
                  <th className="p-4">Scope</th>
                  <th className="p-4">Category</th>
                  <th className="p-4 text-center">14-Day Incidents</th>
                  <th className="p-4">Most Recent Incident</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {hotspots.map((hotspot, idx) => {
                  const incidentCount = coerceNumber(hotspot.incident_count_14_days);

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-slate-100 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{hotspot.asset_location}</span>
                      </td>

                      <td className="p-4 text-slate-300 font-mono">{hotspot.block_id}</td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-medium">
                          {hotspot.ticket_scope}
                        </span>
                      </td>

                      <td className="p-4 text-slate-300">{hotspot.category_name}</td>

                      <td className="p-4 text-center">
                        <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-extrabold text-xs inline-flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5" />
                          <span>{incidentCount}</span>
                        </span>
                      </td>

                      <td className="p-4 text-slate-400 font-mono">
                        {formatDateTime(hotspot.most_recent_incident)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
