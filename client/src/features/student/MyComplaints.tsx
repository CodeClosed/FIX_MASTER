import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi } from '../../api/endpoints';
import { StatusBadge, PriorityBadge } from '../../components/common/Badges';
import { SearchInput } from '../../components/ui/SearchInput';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { VerificationModal } from './VerificationModal';
import { ComplaintDetailModal } from './ComplaintDetail';
import { Complaint } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';
import { ListOrdered, ShieldCheck, Eye, PlusCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

export const MyComplaints: React.FC = () => {
  const [searchParams] = useSearchParams();
  const selectedComplaintIdFromUrl = searchParams.get('id');

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  const [verifyingComplaint, setVerifyingComplaint] = useState<Complaint | null>(null);
  const [viewingComplaint, setViewingComplaint] = useState<Complaint | null>(null);

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => complaintsApi.list(),
  });

  // Auto open detail if query param id exists
  React.useEffect(() => {
    if (selectedComplaintIdFromUrl && complaints.length > 0) {
      const match = complaints.find((c) => c.complaint_id === selectedComplaintIdFromUrl);
      if (match) setViewingComplaint(match);
    }
  }, [selectedComplaintIdFromUrl, complaints]);

  // Client-side filtering & search
  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      // Status filter
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesIssue = c.issue_name.toLowerCase().includes(q);
        const matchesCategory = c.category_name.toLowerCase().includes(q);
        const matchesDesc = (c.description || '').toLowerCase().includes(q);
        const matchesLoc = (c.room_id || c.common_area_id || c.block_id).toLowerCase().includes(q);
        return matchesIssue || matchesCategory || matchesDesc || matchesLoc;
      }
      return true;
    });
  }, [complaints, statusFilter, searchQuery]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredComplaints.length / pageSize) || 1;
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredComplaints.slice(start, start + pageSize);
  }, [filteredComplaints, currentPage, pageSize]);

  const filterTabs: { label: string; value: string }[] = [
    { label: 'All Tickets', value: 'ALL' },
    { label: 'Verification Needed', value: 'PENDING_VERIFICATION' },
    { label: 'Open', value: 'OPEN' },
    { label: 'Assigned', value: 'ASSIGNED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Escalated', value: 'ESCALATED' },
  ];

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <ListOrdered className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-100">My Complaints</h1>
            <p className="text-xs text-slate-400">Track and verify your raised maintenance tickets</p>
          </div>
        </div>

        <Link
          to="/student/new"
          className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/20 flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Complaint</span>
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === tab.value
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <SearchInput
          value={searchQuery}
          onChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          placeholder="Search by issue, location, description..."
        />
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900/60 rounded-2xl border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : paginatedComplaints.length === 0 ? (
        <EmptyState
          title="No complaints found"
          description={
            searchQuery || statusFilter !== 'ALL'
              ? 'Try resetting your search query or status filter.'
              : 'You have not raised any maintenance tickets yet. Tap 1-Click Quick Actions to get started.'
          }
          action={
            searchQuery || statusFilter !== 'ALL'
              ? {
                  label: 'Reset Filters',
                  onClick: () => {
                    setStatusFilter('ALL');
                    setSearchQuery('');
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {paginatedComplaints.map((complaint) => (
            <div
              key={complaint.complaint_id}
              className={`p-4 sm:p-5 rounded-2xl bg-slate-900 border transition-all hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg ${
                complaint.status === 'PENDING_VERIFICATION'
                  ? 'border-amber-500/50 bg-amber-950/20'
                  : 'border-slate-800'
              }`}
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <StatusBadge status={complaint.status} />
                  <PriorityBadge priority={complaint.priority} size="sm" />
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatRelativeTime(complaint.created_at)}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-100 truncate">{complaint.issue_name}</h3>

                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                  <span>
                    Location:{' '}
                    <strong className="text-slate-200">
                      {complaint.room_id || complaint.common_area_id || complaint.block_id}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>Category: {complaint.category_name}</span>
                </div>

                {complaint.description && (
                  <p className="text-xs text-slate-400 line-clamp-1 italic">
                    "{complaint.description}"
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                {complaint.status === 'PENDING_VERIFICATION' && (
                  <button
                    onClick={() => setVerifyingComplaint(complaint)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Rate</span>
                  </button>
                )}

                <button
                  onClick={() => setViewingComplaint(complaint)}
                  className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  <span>Details</span>
                </button>
              </div>
            </div>
          ))}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredComplaints.length}
            pageSize={pageSize}
          />
        </div>
      )}

      {/* Detail Modal */}
      {viewingComplaint && (
        <ComplaintDetailModal
          isOpen={true}
          onClose={() => setViewingComplaint(null)}
          complaint={viewingComplaint}
          onOpenVerification={() => {
            const comp = viewingComplaint;
            setViewingComplaint(null);
            setVerifyingComplaint(comp);
          }}
        />
      )}

      {/* Verification Modal */}
      {verifyingComplaint && (
        <VerificationModal
          isOpen={true}
          onClose={() => setVerifyingComplaint(null)}
          complaintId={verifyingComplaint.complaint_id}
          issueName={verifyingComplaint.issue_name}
          locationIdentifier={
            verifyingComplaint.room_id ||
            verifyingComplaint.common_area_id ||
            verifyingComplaint.block_id
          }
        />
      )}
    </div>
  );
};
