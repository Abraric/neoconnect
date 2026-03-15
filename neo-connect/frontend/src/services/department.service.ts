import api from './api';

export interface Department {
  id: string;
  name: string;
}

const departmentService = {
  async listDepartments(): Promise<Department[]> {
    const res = await api.get('/departments');
    return res.data.data;
  },
};

export default departmentService;
