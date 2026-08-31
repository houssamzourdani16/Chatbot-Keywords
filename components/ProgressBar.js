// components/ProgressBar.js
export default function ProgressBar({
  value = 0,
  max = 100,
  color = "blue",
  label,
  showValue = true,
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  const colors = {
    blue: "bg-blue-600",
    green: "bg-green-600",
    red: "bg-red-600",
    yellow: "bg-yellow-500",
    purple: "bg-purple-600",
  };

  return (
    <div>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between">
          {label && (
            <span className="text-sm font-medium text-gray-700">{label}</span>
          )}
          {showValue && (
            <span className="text-sm text-gray-500">{Math.round(pct)}%</span>
          )}
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors[color] || colors.blue}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
