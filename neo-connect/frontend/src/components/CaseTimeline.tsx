'use client';

import { TimelineEvent } from '@/types/case.types';
import { formatDateTime } from '@/utils/formatDate';
import { cn } from '@/lib/utils';

interface CaseTimelineProps {
  timeline: TimelineEvent[];
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Case Created',
  ASSIGNED: 'Case Assigned',
  STATUS_CHANGED: 'Status Updated',
  ESCALATED: 'Case Escalated',
  RESOLVED: 'Case Resolved',
  NOTE_ADDED: 'Note Added',
};

const ACTION_DOT_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-500',
  ASSIGNED: 'bg-indigo-500',
  STATUS_CHANGED: 'bg-yellow-500',
  ESCALATED: 'bg-red-500',
  RESOLVED: 'bg-green-500',
  NOTE_ADDED: 'bg-gray-400',
};

export default function CaseTimeline({ timeline }: CaseTimelineProps) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        No timeline events yet.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
      <ul className="space-y-6">
        {timeline.map((event, index) => {
          const dotColor = ACTION_DOT_COLORS[event.action] ?? 'bg-gray-400';
          const label = ACTION_LABELS[event.action] ?? event.action;

          return (
            <li key={index} className="relative flex gap-4 pl-10">
              <span
                className={cn(
                  'absolute left-0 top-1 h-6 w-6 rounded-full border-2 border-background flex items-center justify-center',
                  dotColor
                )}
              />
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                  {event.fromStatus && event.toStatus && (
                    <span className="text-xs text-muted-foreground">
                      {event.fromStatus} &rarr; {event.toStatus}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  By <span className="font-medium text-foreground">{event.actorName}</span>
                  {' · '}
                  {formatDateTime(event.timestamp)}
                </p>
                {event.note && (
                  <p className="mt-1 text-sm text-foreground bg-muted rounded px-3 py-2">
                    {event.note}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
