export type CaseStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'PENDING' | 'RESOLVED' | 'ESCALATED';
export type CaseCategory = 'SAFETY' | 'POLICY' | 'FACILITIES' | 'HR' | 'OTHER';
export type CaseSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Department {
  id: string;
  name: string;
}

export interface CaseSummary {
  id: string;
  trackingId: string;
  category: CaseCategory;
  department: Department;
  severity: CaseSeverity;
  status: CaseStatus;
  isAnonymous: boolean;
  submitter?: { id: string; fullName: string };
  createdAt: string;
}

export interface CaseAssignment {
  managerId: string;
  managerName: string;
  assignedAt: string;
  escalationDeadline: string;
}

export interface TimelineEvent {
  action: string;
  fromStatus?: string;
  toStatus?: string;
  actorName: string;
  note?: string;
  timestamp: string;
}

export interface Attachment {
  id: string;
  originalName: string;
  sizeBytes: number;
}

export interface CaseDetail extends CaseSummary {
  location: string;
  description: string;
  assignment?: CaseAssignment;
  attachments: Attachment[];
  timeline: TimelineEvent[];
  resolvedAt?: string;
  escalatedAt?: string;
}
