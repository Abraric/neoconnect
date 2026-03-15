'use client';

interface DepartmentEntry {
  department: string;
  openCount: number;
}

interface HotspotEntry {
  department: string;
  category: string;
  openCount: number;
}

interface DepartmentHeatmapProps {
  casesByDepartment: DepartmentEntry[];
  hotspots: HotspotEntry[];
}

function getHeatColor(count: number, max: number): string {
  if (max === 0 || count === 0) return 'bg-gray-50 text-gray-600';
  const ratio = count / max;
  if (ratio >= 0.75) return 'bg-red-100 text-red-800 border-red-300';
  if (ratio >= 0.5) return 'bg-orange-100 text-orange-800 border-orange-300';
  if (ratio >= 0.25) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-green-50 text-green-800 border-green-200';
}

export default function DepartmentHeatmap({ casesByDepartment, hotspots }: DepartmentHeatmapProps) {
  const hotspotDepts = new Set(hotspots.map(h => h.department));
  const max = Math.max(...casesByDepartment.map(d => d.openCount), 1);

  return (
    <div className="space-y-6">
      {/* Hotspot Alerts */}
      {hotspots.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
            Hotspot Alerts ({hotspots.length})
          </h3>
          <div className="space-y-2">
            {hotspots.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-white border border-red-100 rounded px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-gray-800">{h.department}</span>
                  <span className="text-gray-400 mx-2">·</span>
                  <span className="text-gray-600">{h.category}</span>
                </div>
                <span className="font-semibold text-red-600">{h.openCount} open</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Department Grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Open Cases by Department</h3>
        {casesByDepartment.length === 0 ? (
          <p className="text-sm text-gray-400">No department data available.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {casesByDepartment.map((dept, i) => {
              const isHotspot = hotspotDepts.has(dept.department);
              const colorClass = isHotspot
                ? 'bg-red-100 text-red-800 border-red-300'
                : getHeatColor(dept.openCount, max);

              return (
                <div
                  key={i}
                  className={`border rounded-lg p-3 ${colorClass} transition-colors`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-medium leading-snug break-words">{dept.department}</p>
                    {isHotspot && (
                      <span className="shrink-0 text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">
                        !
                      </span>
                    )}
                  </div>
                  <p className="text-xl font-bold mt-2">{dept.openCount}</p>
                  <p className="text-xs opacity-70">open cases</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-50 border border-green-200 inline-block"></span>Low</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300 inline-block"></span>Moderate</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-100 border border-orange-300 inline-block"></span>High</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block"></span>Critical / Hotspot</div>
      </div>
    </div>
  );
}
