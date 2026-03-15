'use client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

interface DashboardChartsProps {
  casesByStatus: Record<string, number>;
  casesByCategory: Record<string, number>;
}

const STATUS_PALETTE = ['#6366f1', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#f97316'];
const CATEGORY_PALETTE = ['#3b82f6', '#06b6d4', '#84cc16', '#f43f5e', '#a855f7', '#14b8a6'];

export default function DashboardCharts({ casesByStatus, casesByCategory }: DashboardChartsProps) {
  const statusData = Object.entries(casesByStatus).map(([name, value]) => ({ name, value }));
  const categoryData = Object.entries(casesByCategory).map(([name, value]) => ({ name, value }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cases by Status — Pie Chart */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Cases by Status</h3>
        {statusData.length === 0 ? (
          <p className="text-sm text-gray-400">No data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, percent }) =>
                  `${name} ${Math.round((percent ?? 0) * 100)}%`
                }
                labelLine={false}
              >
                {statusData.map((_, i) => (
                  <Cell key={i} fill={STATUS_PALETTE[i % STATUS_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [value, 'Cases']} />
              <Legend
                formatter={(value) => <span className="text-xs">{value}</span>}
                iconSize={10}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Cases by Category — Bar Chart */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Cases by Category</h3>
        {categoryData.length === 0 ? (
          <p className="text-sm text-gray-400">No data.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={categoryData}
              margin={{ top: 4, right: 16, bottom: 40, left: 0 }}
            >
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(value: number) => [value, 'Cases']} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {categoryData.map((_, i) => (
                  <Cell key={i} fill={CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
