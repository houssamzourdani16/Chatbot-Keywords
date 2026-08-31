// components/admin/StatsCard.js
export default function StatsCard({ label, value, icon, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    yellow: "bg-yellow-50 text-yellow-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-lg text-2xl ${
            colors[color] || colors.blue
          }`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
