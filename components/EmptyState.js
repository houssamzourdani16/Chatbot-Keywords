// components/EmptyState.js
export default function EmptyState({
  icon = "📭",
  title = "Nothing here yet",
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-6 py-16 text-center">
      <div className="text-5xl">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-gray-500">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
