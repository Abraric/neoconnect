'use client';

import { useRouter } from 'next/navigation';
import { CaseSummary } from '@/types/case.types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { STATUS_COLORS, SEVERITY_COLORS } from '@/utils/constants';
import { formatDate } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

interface CaseCardProps {
  caseItem: CaseSummary & { location?: string; description?: string; isPriority?: boolean };
}

export default function CaseCard({ caseItem }: CaseCardProps) {
  const router = useRouter();

  const statusColor = STATUS_COLORS[caseItem.status] ?? 'bg-gray-100 text-gray-700';
  const severityColor = SEVERITY_COLORS[caseItem.severity] ?? 'bg-gray-100 text-gray-700';

  const descriptionPreview = caseItem.description
    ? caseItem.description.length > 100
      ? caseItem.description.slice(0, 100) + '…'
      : caseItem.description
    : null;

  const locationDisplay = caseItem.location
    ? caseItem.location.length > 40
      ? caseItem.location.slice(0, 40) + '…'
      : caseItem.location
    : null;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border border-border"
      onClick={() => router.push(`/cases/${caseItem.id}`)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wide text-foreground">
              {caseItem.trackingId}
            </span>
            {caseItem.isPriority && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700">
                URGENT
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', severityColor)}>
              {caseItem.severity}
            </span>
            <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', statusColor)}>
              {caseItem.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {caseItem.category}
          </Badge>
          {caseItem.department && (
            <span className="text-xs text-muted-foreground">{caseItem.department.name}</span>
          )}
        </div>

        {locationDisplay && (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Location:</span> {locationDisplay}
          </p>
        )}

        {descriptionPreview && (
          <p className="text-sm text-muted-foreground leading-relaxed">{descriptionPreview}</p>
        )}

        <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
          <span>
            {caseItem.isAnonymous
              ? 'Anonymous'
              : caseItem.submitter?.fullName ?? 'Unknown'}
          </span>
          <span>{formatDate(caseItem.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
