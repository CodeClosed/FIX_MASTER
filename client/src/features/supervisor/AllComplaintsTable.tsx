import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { complaintsApi, metaApi } from '../../api/endpoints';
import { StatusBadge, PriorityBadge } from '../../components/common/Badges';
import { SearchInput } from '../../components/ui/SearchInput';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { DispatchDrawer } from './DispatchDrawer';
import { Complaint } from '../../types';
import { formatRelativeTime, truncateId } from '../../utils/formatters';
import { ListOrdered, Filter, UserCheck } from 'lucide-react';

export const AllComplaintsTable: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [blockFilter, setBlockFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 12;

  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  // Meta Blocks for filter
  const { data: blocks = [] } = useQuery({
    queryKey: ['meta-blocks'],
    queryFn: metaApi.getBlocks,
  });

  // Complaints with server filters
  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ['complaints', statusFilter, blockFilter],
    queryFn: () =>
      complaintsApi.list({
        status: statusFilter || undefined,
        block_id: blockFilter || undefined,
      }),
  });

  // Client-side search
  const filteredComplaints = useMemo(() => {
    if (!searchQuery.trim()) return complaints;
    const q = searchQuery.toLowerCase();
    return complaints.filter((c) => {
      const issue = c.issue_name.toLowerCase();
      const student = c.student_name.toLowerCase();
      const loc = (c.room_id || c.common_area_id || c.block_id).toLowerCase();
      const id = c.complaint_id.toLowerCase();
      return issue.includes(q) || student.includes(q) || loc.includes(q) || id.includes(q);
    });
  }, [complaints, searchQuery]);

  // Client-side pagination
  const totalPages = Math.ceil(filteredComplaints.length / pageSize) || 1;
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredComplaints.slice(start, start + pageSize);
  }, [filteredComplaints, currentPage, pageSize]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
          <ListOrdered className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-100">All System Complaints</h1>
          <p className="text-xs text-slate-400">Supervise, inspect, and dispatch tickets across hostel blocks</p>
        </div>
      </div>

      {/* Server & Client Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SearchInput
          value={searchQuery}
          onChange={(q) => {
            setSearchQuery(q);
            setCurrentPage(1);
          }}
          placeholder="Search issue, student, room..."
        />

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Statuses (Server Filter)</option>
            <option value="OPEN">OPEN</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="PENDING_VERIFICATION">PENDING_VERIFICATION</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>

        <div>
          <select
            value={blockFilter}
            onChange={(e) => {
              setBlockFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Blocks (Server Filter)</option>
            {blocks.map((b) => (
              <option key={b.block_id} value={b.block_id}>
                {b.block_name} ({b.block_id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Complaints Data Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-900/60 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : paginatedComplaints.length === 0 ? (
        <EmptyState
          title="No complaints match filters"
          description="Try adjusting your status, block filter, or search query."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl space-y-4 p-2 sm:p-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider">
                  <th className="p-3">Ref ID</th>
                  <th className="p-3">Issue Name</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Age</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {paginatedComplaints.map((c) => (
                  <tr
                    key={c.complaint_id}
                    onClick={() => setSelectedComplaint(c)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono text-cyan-400 font-semibold">
                      {truncateId(c.complaint_id)}
                    </td>

                    <td className="p-3 font-bold text-slate-100">{c.issue_name}</td>

                    <td className="p-3 text-slate-300">
                      {c.room_id || c.common_area_id || c.block_id}
                    </td>

                    <td className="p-3 text-slate-300">{c.student_name}</td>

                    <td className="p-3">
                      <StatusBadge status={c.status} size="sm" />
                    </td>

                    <td className="p-3">
                      <PriorityBadge priority={c.priority} size="sm" />
                    </td>

                    <td className="p-3 text-slate-400 font-mono">
                      {formatRelativeTime(c.created_at)}
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedComplaint(c);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-400 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Dispatch</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredComplaints.length}
            pageSize={pageSize}
          />
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
