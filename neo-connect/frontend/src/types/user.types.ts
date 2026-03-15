export type Role = 'STAFF' | 'SECRETARIAT' | 'CASE_MANAGER' | 'ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  departmentId: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}
