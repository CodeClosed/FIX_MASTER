import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dispatchApi, metaApi } from '../../api/endpoints';
import { useToast } from '../../components/ui/Toast';
import { StatusBadge, PriorityBadge } from '../../components/common/Badges';
import { Complaint } from '../../types';
import { formatDateTime } from '../../utils/formatters';
import {
  X,
  UserCheck,
  Zap,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface DispatchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  complaint: Complaint;
}

export const DispatchDrawer: React.FC<DispatchDrawerProps> = ({ isOpen, onClose, complaint }) => {
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const isCleaning = complaint.required_specialization === 'CLEANING';

  // Staff roster, pre-filtered to the trade this ticket needs. The backend
  // also rejects a specialization mismatch server-side, so this filter is a
  // UX convenience, not the only guard.
  const { data: staffList = [], isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staff-roster', complaint.required_specialization],
    queryFn: () => metaApi.getStaff(complaint.required_specialization),
    enabled: isOpen,
  });

  // Manual Dispatch Mutation
  const manualAssignMutation = useMutation({
    mutationFn: () => dispatchApi.assignTechnician(complaint.complaint_id, selectedStaffId),
    onSuccess: (data) => {
      showToast('Technician Assigned!', 'success', data.message || 'Task successfully assigned.');
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      onClose();
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to assign technician', 'error');
    },
  });

  // Auto Dispatch Cleaning Mutation. The backend reports `assigned` honestly:
  // it can return 200 with assigned=false when no cleaning staff were free,
  // which is not the same as failure and must not be shown as an error.
  const autoDispatchMutation = useMutation({
    mutationFn: () => dispatchApi.autoDispatchCleaning(complaint.complaint_id),
    onSuccess: (data) => {
      showToast(
        data.assigned ? 'Auto-Dispatched!' : 'No Staff Available',
        data.assigned ? 'success' : 'info',
        data.message
      );
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      if (data.assigned) onClose();
    },
    onError: (err: any) => {
      showToast(err.message || 'Auto-dispatch failed', 'error');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
            </div>
            <h2 className="text-lg font-extrabold text-slate-100 mt-2">{complaint.issue_name}</h2>
            <p className="text-xs text-slate-400 font-mono">Ref: {complaint.complaint_id}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Complaint Overview Card */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-400 block mb-0.5">Location</span>
              <span className="font-bold text-slate-100">
                {complaint.room_id || complaint.common_area_id || complaint.block_id}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Category</span>
              <span className="font-bold text-slate-100">{complaint.category_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Student</span>
              <span className="font-bold text-slate-100">{complaint.student_name}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Raised At</span>
              <span className="font-bold text-slate-100">{formatDateTime(complaint.created_at)}</span>
            </div>
          </div>

          {complaint.description && (
            <div className="pt-2 border-t border-slate-900">
              <span className="text-slate-400 block mb-1">Description:</span>
              <p className="text-slate-200 italic">"{complaint.description}"</p>
            </div>
          )}
        </div>

        {/* Auto Dispatch Action for Cleaning Tickets */}
        {isCleaning && (
          <div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
              <Zap className="w-4 h-4" />
              <span>1-Click Auto Dispatch (Housekeeping Only)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Auto-dispatch automatically selects the least-loaded available cleaner for this block.
            </p>
            <button
              onClick={() => autoDispatchMutation.mutate()}
              disabled={autoDispatchMutation.isPending}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {autoDispatchMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Auto-Dispatch</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Manual Dispatch Action */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>Manual Technician Assignment</span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300">
              Select Technician ({complaint.required_specialization}) *
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              disabled={isLoadingStaff}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500 disabled:opacity-50"
            >
              <option value="">
                {isLoadingStaff ? 'Loading technicians...' : 'Choose Technician...'}
              </option>
              {staffList.map((staff) => (
                <option key={staff.user_id} value={staff.user_id} disabled={!staff.is_available}>
                  {staff.full_name} — {staff.active_task_count} active task
                  {staff.active_task_count === 1 ? '' : 's'}
                  {!staff.is_available ? ' (unavailable)' : ''}
                </option>
              ))}
            </select>
            {!isLoadingStaff && staffList.length === 0 && (
              <p className="text-[11px] text-amber-400">
                No {complaint.required_specialization} technicians are registered.
              </p>
            )}
          </div>

          <button
            onClick={() => manualAssignMutation.mutate()}
            disabled={!selectedStaffId || manualAssignMutation.isPending}
            className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
          >
            {manualAssignMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Assign Selected Technician</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
