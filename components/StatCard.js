// components/StatCard.js
export default function StatCard({
  label,
  value,
  icon,
  trend,
  trendUp = true,
  color = "blue",
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        {icon && (
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg text-2xl ${colors[color] || colors.blue}`}
          >
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-4 flex items-center gap-1 text-sm">
          <span className={trendUp ? "text-green-600" : "text-red-600"}>
            {trendUp ? "▲" : "▼"} {trend}
          </span>
          <span className="text-gray-500">vs last period</span>
        </div>
      )}
    </div>
  );
}
