import { Complaint, TimelineEvent } from '../types';
import { formatDateTime } from '../utils/formatters';

/**
 * Remaining client-side fallbacks.
 *
 * B1 (staff roster) and B2 (common areas) are no longer shimmed here - the
 * backend now implements both (GET /meta/staff, GET /meta/blocks/:id/common-areas),
 * see metaApi in api/endpoints.ts.
 *
 * What's left:
 *  - B3: a localStorage cache of the student's room, used as an instant,
 *    offline-friendly fallback in front of the real GET /me/allotment
 *    (StudentHome fetches the real value and writes it here; a 404 from
 *    that endpoint falls back to whatever's cached, or to the manual
 *    AllotmentModal if nothing is cached yet).
 *  - B7: reconstructTimeline is now only a fallback for ComplaintDetail,
 *    used when GET /complaints/:id/logs returns zero rows (e.g. a brand new
 *    OPEN ticket, which legitimately has no audit rows yet since the DB
 *    trigger only fires on a status change).
 */

// B3: Student Room Allotment Cache
const ALLOTMENT_KEY = 'fixmaster_student_allotment';

export interface SavedAllotment {
  block_id: string;
  room_id: string;
}

export function getSavedAllotment(): SavedAllotment | null {
  const raw = localStorage.getItem(ALLOTMENT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveAllotment(block_id: string, room_id: string): SavedAllotment {
  const data = { block_id, room_id };
  localStorage.setItem(ALLOTMENT_KEY, JSON.stringify(data));
  return data;
}

// B7: Timeline Events Reconstruction
export function reconstructTimeline(complaint: Complaint): TimelineEvent[] {
  const events: TimelineEvent[] = [
    {
      title: 'Complaint Registered',
      description: `Ticket raised by ${complaint.student_name} (${complaint.issue_name})`,
      timestamp: formatDateTime(complaint.created_at),
      status: 'completed',
    },
  ];

  if (complaint.status === 'OPEN') {
    events.push({
      title: 'Awaiting Supervisor Assignment',
      description: 'Ticket is in queue to be assigned to a technician.',
      timestamp: 'Pending',
      status: 'current',
    });
  } else {
    events.push({
      title: 'Dispatched to Technician',
      description: 'Supervisor assigned the ticket to trade technician.',
      timestamp: complaint.created_at ? formatDateTime(complaint.created_at) : 'N/A',
      status: 'completed',
    });
  }

  if (['IN_PROGRESS', 'PENDING_VERIFICATION', 'COMPLETED', 'ESCALATED'].includes(complaint.status)) {
    events.push({
      title: 'Work In Progress',
      description: 'Technician is servicing the complaint.',
      timestamp: 'In progress',
      status: complaint.status === 'IN_PROGRESS' ? 'current' : 'completed',
    });
  }

  if (['PENDING_VERIFICATION', 'COMPLETED', 'ESCALATED'].includes(complaint.status)) {
    events.push({
      title: 'Work Marked Completed',
      description: 'Technician finished repair work. Awaiting student verification.',
      timestamp: complaint.resolved_at ? formatDateTime(complaint.resolved_at) : 'Completed',
      status: complaint.status === 'PENDING_VERIFICATION' ? 'current' : 'completed',
    });
  }

  if (complaint.status === 'COMPLETED') {
    events.push({
      title: 'Closed & Verified',
      description: 'Student confirmed resolution and signed off ticket.',
      timestamp: complaint.closed_at ? formatDateTime(complaint.closed_at) : 'Closed',
      status: 'completed',
    });
  } else if (complaint.status === 'ESCALATED') {
    events.push({
      title: 'Escalated by Student',
      description: 'Student reported unsatisfactory work. Returned to supervisor.',
      timestamp: complaint.resolved_at ? formatDateTime(complaint.resolved_at) : 'Escalated',
      status: 'current',
    });
  }

  return events;
}
