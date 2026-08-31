// app/admin/messages/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import MessageDetailModal from "@/components/admin/MessageDetailModal";

const STATUSES = ["received", "processing", "completed", "failed"];
const MODES = ["test", "prod"];

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [senderId, setSenderId] = useState("");
  const [productId, setProductId] = useState("");
  const [mode, setMode] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail modal
  const [selectedMessage, setSelectedMessage] = useState(null);

  const getToken = () => localStorage.getItem("accessToken");

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: "20" });
      if (senderId) params.set("senderId", senderId);
      if (productId) params.set("productId", productId);
      if (mode) params.set("mode", mode);
      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/admin/messages?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
        setTotalPages(data.totalPages || 1);
      } else {
        setError(data.error || "Failed to load messages");
      }
    } catch (err) {
      setError("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [page, senderId, productId, mode, status, from, to]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products?limit=100", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setProducts(data.products);
    } catch (err) {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [senderId, productId, mode, status, from, to]);

  const statusColor = (s) => {
    if (s === "completed") return "bg-green-100 text-green-700";
    if (s === "failed") return "bg-red-100 text-red-700";
    if (s === "processing") return "bg-blue-100 text-blue-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">💬 Messages</h1>
        <p className="text-sm text-gray-500">
          View all messages across products
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3">
        <input
          type="text"
          placeholder="Search by sender ID..."
          value={senderId}
          onChange={(e) => setSenderId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Products</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Modes</option>
          {MODES.map((m) => (
            <option key={m} value={m}>
              {m === "test" ? "Test" : "Production"}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
        />
      </div>

      {/* Messages Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Message
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Sender
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Mode
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </td>
              </tr>
            ) : messages.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  No messages found.
                </td>
              </tr>
            ) : (
              messages.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="max-w-xs px-6 py-4">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {m.message}
                    </p>
                    {m.platform && (
                      <p className="text-xs text-gray-500">{m.platform}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {m.product_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {m.sender_id}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.mode === "test"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {m.mode === "test" ? "Test" : "Production"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(
                        m.status,
                      )}`}
                    >
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedMessage(m)}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selectedMessage && (
        <MessageDetailModal
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  );
}
