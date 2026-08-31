// components/Table.js
export default function Table({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No data available",
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.map((row, i) => (
            <tr key={i} className="transition-colors hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-6 py-4 text-sm text-gray-700">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
