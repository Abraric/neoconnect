'use client';
import { LineChart, Line, Tooltip, ResponsiveContainer } from 'recharts';

type HistoryPoint = { t: number; pg: number | null; mongo: number | null; redis: number | null; jwt: number | null; api: number | null };

export default function SparklineChart({ data, dataKey }: { data: HistoryPoint[]; dataKey: keyof HistoryPoint }) {
  return (
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey={dataKey as string}
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
          connectNulls
        />
        <Tooltip
          content={({ active, payload }: { active?: boolean; payload?: Array<{ value?: number }> }) =>
            active && payload?.[0]?.value != null
              ? <div className="bg-popover border rounded px-2 py-1 text-xs shadow">{payload[0].value}ms</div>
              : null
          }
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
