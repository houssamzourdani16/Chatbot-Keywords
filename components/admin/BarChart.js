// components/admin/BarChart.js
"use client";

export default function BarChart({ data, color = "#8b5cf6", height = 200 }) {
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-semibold text-gray-600">{d.count}</span>
          <div
            className="w-full rounded-t-md transition-all"
            style={{
              height: `${(d.count / max) * (height - 40)}px`,
              backgroundColor: color,
              opacity: 0.7 + (d.count / max) * 0.3,
            }}
          />
          <span className="text-[10px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
