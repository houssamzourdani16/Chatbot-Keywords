// components/admin/UserDetailModal.js
"use client";

import { useState } from "react";

export default function UserDetailModal({
  user,
  plans,
  roles,
  onClose,
  onUpdate,
}) {
  const [plan, setPlan] = useState(user.plan || "Basic");
  const [role, setRole] = useState(user.role || "user");
  const [blacklisted, setBlacklisted] = useState(user.blacklisted || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onUpdate(user.id, { plan, role, blacklisted });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            👥 User Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Profile info */}
        <div className="mb-4 flex items-center gap-4 rounded-lg bg-gray-50 p-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-xl font-semibold text-purple-700">
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">
              {user.productCount}
            </p>
            <p className="text-sm text-blue-600">Products</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4 text-center">
            <p className="text-2xl font-bold text-purple-700">
              {user.messageCount}
            </p>
            <p className="text-sm text-purple-600">Messages</p>
          </div>
        </div>

        {/* Edit controls */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Plan</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              {plans.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={blacklisted}
              onChange={(e) => setBlacklisted(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-red-600"
            />
            Suspend account (blacklist)
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
