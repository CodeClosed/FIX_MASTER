import { apiFetch } from './client';
import {
  AuthResponse,
  RegisterPayload,
  CreateComplaintPayload,
  Complaint,
  ComplaintLogEntry,
  StaffTask,
  FeedbackPayload,
  BlockKpi,
  Hotspot,
  HostelBlock,
  Room,
  Category,
  User,
  StaffRosterItem,
  CommonAreaItem,
  Specialization,
  Allotment,
} from '../types';

export const authApi = {
  login: (data: { reg_or_emp_id: string; password: string }) =>
    apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  register: (data: RegisterPayload) =>
    apiFetch<{ message: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const complaintsApi = {
  create: (data: CreateComplaintPayload) =>
    apiFetch<{ message: string; complaint: Complaint }>('/complaints', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  list: (filters?: { status?: string; block_id?: string }) =>
    apiFetch<Complaint[]>('/complaints', {
      method: 'GET',
      params: filters,
    }),

  getById: (id: string) => apiFetch<Complaint>(`/complaints/${id}`, { method: 'GET' }),

  getLogs: (id: string) => apiFetch<ComplaintLogEntry[]>(`/complaints/${id}/logs`, { method: 'GET' }),
};

export const dispatchApi = {
  getQueue: () => apiFetch<StaffTask[]>('/dispatch/queue', { method: 'GET' }),

  startWork: (assignmentId: string) =>
    apiFetch<{ message: string; complaint_id: string }>(`/dispatch/tasks/${assignmentId}/start`, {
      method: 'PATCH',
    }),

  markTaskCompleted: (assignmentId: string, complaintId: string) =>
    apiFetch<{ message: string }>(`/dispatch/tasks/${assignmentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ complaint_id: complaintId }),
    }),

  assignTechnician: (complaintId: string, staffUserId: string) =>
    apiFetch<{ message: string }>('/dispatch/assign', {
      method: 'POST',
      body: JSON.stringify({
        complaint_id: complaintId,
        staff_user_id: staffUserId,
      }),
    }),

  autoDispatchCleaning: (complaintId: string) =>
    apiFetch<{ assigned: boolean; staff_user_id?: string; staff_name?: string; message: string }>(
      '/dispatch/auto-dispatch',
      {
        method: 'POST',
        body: JSON.stringify({ complaint_id: complaintId }),
      }
    ),
};

export const feedbackApi = {
  submit: (data: FeedbackPayload) =>
    apiFetch<{ message: string }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const analyticsApi = {
  getKpis: () => apiFetch<BlockKpi[]>('/analytics/kpi', { method: 'GET' }),

  getHotspots: () => apiFetch<Hotspot[]>('/analytics/hotspots', { method: 'GET' }),
};

export const metaApi = {
  getBlocks: () => apiFetch<HostelBlock[]>('/meta/blocks', { method: 'GET' }),

  getRoomsByBlock: (blockId: string) =>
    apiFetch<Room[]>(`/meta/blocks/${blockId}/rooms`, { method: 'GET' }),

  getCommonAreas: (blockId: string) =>
    apiFetch<CommonAreaItem[]>(`/meta/blocks/${blockId}/common-areas`, { method: 'GET' }),

  getCategories: () => apiFetch<Category[]>('/meta/categories', { method: 'GET' }),

  // SUPERVISOR/ADMIN only - the backend gates this route by role.
  getStaff: (specialization?: Specialization) =>
    apiFetch<StaffRosterItem[]>('/meta/staff', {
      method: 'GET',
      params: specialization ? { specialization } : undefined,
    }),
};

export const meApi = {
  getMe: () => apiFetch<User>('/me', { method: 'GET' }),

  // Throws ApiError with status 404 when the student has no current allotment.
  getMyAllotment: () => apiFetch<Allotment>('/me/allotment', { method: 'GET' }),
};
