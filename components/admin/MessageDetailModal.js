// components/admin/MessageDetailModal.js
"use client";

export default function MessageDetailModal({ message, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            💬 Message Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Message Content
            </p>
            <p className="mt-1 text-sm text-gray-900">{message.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Product
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {message.product_name}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Sender ID
              </p>
              <p className="mt-1 text-sm text-gray-900">{message.sender_id}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Mode
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {message.mode === "test" ? "Test" : "Production"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </p>
              <p className="mt-1 text-sm capitalize text-gray-900">
                {message.status}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Platform
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {message.platform || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Date
              </p>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(message.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
