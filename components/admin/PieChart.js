// components/admin/PieChart.js
"use client";

export default function PieChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
  let cumulative = 0;

  const segments = data.map((d) => {
    const start = (cumulative / total) * 360;
    cumulative += d.value;
    const end = (cumulative / total) * 360;
    return { ...d, start, end };
  });

  return (
    <div className="flex items-center gap-6">
      <div
        className="relative h-40 w-40 rounded-full"
        style={{
          background: `conic-gradient(${segments
            .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
            .join(", ")})`,
        }}
      >
        <div className="absolute inset-4 flex items-center justify-center rounded-full bg-white">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="text-sm text-gray-600">{d.label}</span>
            <span className="text-sm font-semibold text-gray-900">
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
