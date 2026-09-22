import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi } from '../../api/endpoints';
import { StatusBadge, PriorityBadge } from '../../components/common/Badges';
import { EmptyState } from '../../components/ui/EmptyState';
import { DispatchDrawer } from './DispatchDrawer';
import { Complaint } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';
import { AlertTriangle, UserCheck, ShieldAlert, ArrowRight } from 'lucide-react';

export const EscalatedQueue: React.FC = () => {
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', 'ESCALATED'],
    queryFn: () => complaintsApi.list({ status: 'ESCALATED' }),
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="p-5 rounded-3xl bg-rose-950/40 border-2 border-rose-500/50 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-rose-200">Escalated Tickets Queue</h1>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-300 font-bold text-xs">
                {complaints.length} Urgent
              </span>
            </div>
            <p className="text-xs text-rose-300/80 mt-0.5">
              Tickets rejected by students — requiring supervisor re-inspection & reassignment
            </p>
          </div>
        </div>
      </div>

      {/* Escalated Tickets List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-900/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No escalated tickets"
          description="Great job! There are currently no unresolved escalated complaints requiring re-assignment."
        />
      ) : (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <div
              key={complaint.complaint_id}
              className="p-5 rounded-2xl bg-slate-900 border-2 border-rose-500/40 hover:border-rose-500/80 transition-all shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={complaint.status} size="md" />
                  <PriorityBadge priority={complaint.priority} size="md" />
                  <span className="text-[11px] text-slate-400 font-mono">
                    Escalated {formatRelativeTime(complaint.created_at)}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-100">{complaint.issue_name}</h3>

                <div className="text-xs text-slate-300 flex items-center gap-3 flex-wrap">
                  <span>
                    Location:{' '}
                    <strong className="text-slate-100">
                      {complaint.room_id || complaint.common_area_id || complaint.block_id}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>Raised By: {complaint.student_name}</span>
                </div>

                {complaint.description && (
                  <p className="text-xs text-rose-200/90 italic bg-rose-950/30 p-2.5 rounded-xl border border-rose-900/40">
                    "{complaint.description}"
                  </p>
                )}
              </div>

              <button
                onClick={() => setSelectedComplaint(complaint)}
                className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] shrink-0"
              >
                <UserCheck className="w-4 h-4" />
                <span>Re-assign Technician</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dispatch Drawer */}
      {selectedComplaint && (
        <DispatchDrawer
          isOpen={true}
          onClose={() => setSelectedComplaint(null)}
          complaint={selectedComplaint}
        />
      )}
    </div>
  );
};
