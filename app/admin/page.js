// app/admin/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getToken = () => localStorage.getItem("accessToken");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      } else {
        setError(data.error || "Failed to load stats");
      }
    } catch (err) {
      setError("Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: "👥" },
    { label: "Total Messages", value: stats?.totalMessages || 0, icon: "💬" },
    { label: "Total Products", value: stats?.totalProducts || 0, icon: "📦" },
    { label: "Total Webhooks", value: stats?.totalWebhooks || 0, icon: "🔗" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🚀 Super Admin Dashboard</h1>
            <p className="text-sm text-gray-400">Platform overview</p>
          </div>
          <button
            onClick={() => router.push("/admin/webhooks")}
            className="rounded-lg bg-[#6C63FF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#5a52e0]"
          >
            🔗 Add New Webhook
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#6C63FF] border-t-transparent" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-gray-800 bg-[#141B2D] p-6"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">{card.label}</p>
                    <span className="text-xl">{card.icon}</span>
                  </div>
                  <p className="mt-2 text-3xl font-bold">
                    {card.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Users & Products Breakdown */}
            <div className="mb-8 rounded-xl border border-gray-800 bg-[#141B2D] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">📊 Users Breakdown</h2>
                <button
                  onClick={() => router.push("/admin/users")}
                  className="text-sm text-[#6C63FF] hover:underline"
                >
                  View all →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead>
                    <tr>
                      {[
                        "User Name",
                        "Products",
                        "Messages",
                        "Webhook",
                        "Joined",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {stats?.users?.length > 0 ? (
                      stats.users.slice(0, 5).map((u) => (
                        <tr key={u.id} className="hover:bg-gray-800/30">
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {u.productsCount}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {u.messagesCount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-[#6C63FF]/20 px-2 py-0.5 text-xs text-[#6C63FF]">
                              {u.webhookModel || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-400">
                            {new Date(u.joinedDate).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-8 text-center text-sm text-gray-500"
                        >
                          No users yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Webhooks */}
            <div className="rounded-xl border border-gray-800 bg-[#141B2D] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">🔗 N8N Webhooks</h2>
                <button
                  onClick={() => router.push("/admin/webhooks")}
                  className="text-sm text-[#6C63FF] hover:underline"
                >
                  Manage →
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead>
                    <tr>
                      {["Name", "Webhook URL", "Status", "Users"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {stats?.webhooks?.length > 0 ? (
                      stats.webhooks.map((w) => (
                        <tr key={w.id} className="hover:bg-gray-800/30">
                          <td className="px-4 py-3 text-sm font-medium">
                            {w.name}
                          </td>
                          <td className="px-4 py-3">
                            <code className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400">
                              {w.webhook_url}
                            </code>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                w.is_active
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              {w.is_active ? "✅ Active" : "⚠️ Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{w.usersUsing}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="px-4 py-8 text-center text-sm text-gray-500"
                        >
                          No webhooks yet.{" "}
                          <button
                            onClick={() => router.push("/admin/webhooks")}
                            className="text-[#6C63FF] hover:underline"
                          >
                            Add one →
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
