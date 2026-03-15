import api from './api';
import { CaseSummary, CaseDetail } from '../types/case.types';

export interface CreateCasePayload {
  category: string;
  departmentId: string;
  location: string;
  severity: string;
  description: string;
  isAnonymous: boolean;
  files?: File[];
}

export interface CaseFilters {
  status?: string;
  category?: string;
  departmentId?: string;
  severity?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedCases {
  data: CaseSummary[];
  pagination: { page: number; limit: number; total: number };
}

const caseService = {
  async createCase(payload: CreateCasePayload) {
    const formData = new FormData();
    formData.append('category', payload.category);
    formData.append('departmentId', payload.departmentId);
    formData.append('location', payload.location);
    formData.append('severity', payload.severity);
    formData.append('description', payload.description);
    formData.append('isAnonymous', String(payload.isAnonymous));
    if (payload.files) {
      payload.files.forEach(f => formData.append('files', f));
    }
    const res = await api.post('/cases', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data as { id: string; trackingId: string; status: string; createdAt: string };
  },

  async listCases(filters: CaseFilters = {}): Promise<PaginatedCases> {
    const res = await api.get('/cases', { params: filters });
    return res.data.data; // { data: CaseSummary[], pagination: { page, limit, total } }
  },

  async getCaseById(caseId: string): Promise<CaseDetail> {
    const res = await api.get(`/cases/${caseId}`);
    return res.data.data;
  },

  async assignCase(caseId: string, managerId: string) {
    const res = await api.patch(`/cases/${caseId}/assign`, { managerId });
    return res.data.data;
  },

  async updateCaseStatus(caseId: string, status: string, note?: string) {
    const res = await api.patch(`/cases/${caseId}/status`, { status, note });
    return res.data.data;
  },
};

export default caseService;
