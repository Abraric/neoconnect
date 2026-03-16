'use client';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, AlertTriangle, Clock } from 'lucide-react';

const STEPS = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING', 'RESOLVED'];

interface Props {
  currentStatus: string;
}

export default function CaseProgressStepper({ currentStatus }: Props) {
  const isEscalated = currentStatus === 'ESCALATED';
  const currentIndex = isEscalated ? STEPS.length - 1 : STEPS.indexOf(currentStatus);

  return (
    <div className="w-full py-3">
      {isEscalated && (
        <div className="flex items-center gap-2 mb-3 text-red-500 text-sm font-medium">
          <AlertTriangle className="h-4 w-4" />
          This case has been escalated
        </div>
      )}
      <div className="flex items-center gap-0">
        {STEPS.map((step, idx) => {
          const isDone = !isEscalated && idx < currentIndex;
          const isCurrent = !isEscalated && idx === currentIndex;
          const isPending = !isEscalated && idx > currentIndex;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                  isDone && 'bg-primary border-primary text-white',
                  isCurrent && 'border-primary bg-primary/10 text-primary',
                  isPending && 'border-muted bg-muted text-muted-foreground',
                  isEscalated && idx < STEPS.length - 1 && 'border-muted bg-muted text-muted-foreground',
                )}>
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : isCurrent ? <Clock className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                </div>
                <span className={cn(
                  'text-[10px] font-medium whitespace-nowrap',
                  isCurrent && 'text-primary',
                  isDone && 'text-primary',
                  isPending && 'text-muted-foreground',
                  isEscalated && 'text-muted-foreground',
                )}>
                  {step.replace('_', ' ')}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn(
                  'h-0.5 flex-1 mx-1 mb-4',
                  idx < currentIndex && !isEscalated ? 'bg-primary' : 'bg-muted'
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
