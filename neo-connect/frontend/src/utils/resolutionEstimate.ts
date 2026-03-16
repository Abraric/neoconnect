export interface ResolutionEstimate {
  label: string;
  days: string;
  color: string;
}

const SEVERITY_DAYS: Record<string, number> = {
  HIGH: 2,
  MEDIUM: 5,
  LOW: 10,
};

const CATEGORY_MODIFIER: Record<string, number> = {
  SAFETY: 0.5,   // Safety cases resolved faster
  POLICY: 1.5,   // Policy cases take longer
  HR: 1.2,
  FACILITIES: 1.0,
  OTHER: 1.0,
};

export function getResolutionEstimate(severity: string, category: string): ResolutionEstimate {
  const baseDays = SEVERITY_DAYS[severity] ?? 5;
  const modifier = CATEGORY_MODIFIER[category] ?? 1.0;
  const estimatedDays = Math.ceil(baseDays * modifier);

  let label: string;
  let color: string;

  if (estimatedDays <= 2) {
    label = `~${estimatedDays} business day${estimatedDays > 1 ? 's' : ''}`;
    color = 'text-red-500';
  } else if (estimatedDays <= 5) {
    label = `~${estimatedDays} business days`;
    color = 'text-yellow-500';
  } else {
    label = `~${estimatedDays} business days`;
    color = 'text-green-500';
  }

  return { label, days: String(estimatedDays), color };
}
