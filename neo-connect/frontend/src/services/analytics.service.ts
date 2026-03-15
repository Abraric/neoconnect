import api from './api';

export interface DashboardData {
  casesByDepartment: {
    department: string;
    departmentId: string;
    openCount: number;
  }[];
  casesByStatus: Record<string, number>;
  casesByCategory: Record<string, number>;
  hotspots: {
    departmentId: string;
    department: string;
    category: string;
    openCount: number;
    flaggedAt: string;
  }[];
  generatedAt: string;
}

const analyticsService = {
  async getDashboard(): Promise<DashboardData> {
    const res = await api.get('/analytics/dashboard');
    return res.data.data;
  },
};

export default analyticsService;
