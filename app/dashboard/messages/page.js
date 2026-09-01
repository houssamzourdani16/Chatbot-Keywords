// app/dashboard/messages/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProtectPage } from "@/lib/auth/auth";

const STATUS_COLORS = {
  received: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const MODE_COLORS = {
  test: "bg-purple-100 text-purple-700",
  prod: "bg-indigo-100 text-indigo-700",
};

export default function MessagesPage() {
  const { user, loading } = useProtectPage();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [senderFilter, setSenderFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail modal
  const [selectedMessage, setSelectedMessage] = useState(null);

  const getToken = () => localStorage.getItem("accessToken");

  const fetchMessages = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoadingMessages(true);
      setError("");
      try {
        const params = new URLSearchParams({ page, limit: "20" });
        if (productFilter) params.set("productId", productFilter);
        if (statusFilter) params.set("status", statusFilter);
        if (senderFilter) params.set("senderId", senderFilter);

        const res = await fetch(`/api/messages?${params}`, {
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
        if (!silent) setLoadingMessages(false);
      }
    },
    [page, productFilter, statusFilter, senderFilter],
  );

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setProducts(data.products);
    } catch (err) {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchMessages();
      fetchProducts();
    }
  }, [user, fetchMessages, fetchProducts]);

  // ✅ Smooth auto-refresh: poll for new messages every 5 seconds in the
  //    background (silent) so the page updates without a visible reload
  //    or loading spinner.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchMessages({ silent: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [user, fetchMessages]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [productFilter, statusFilter, senderFilter]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ← Dashboard
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">💬 Messages</h1>
              <p className="text-sm text-gray-500">
                Incoming messages and the keywords found on the spreadsheet
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              {messages.length} messages
            </span>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + New Product
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3">
          <select
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All Products</option>
            {products.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            {Object.keys(STATUS_COLORS).map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          <input
            value={senderFilter}
            onChange={(e) => setSenderFilter(e.target.value)}
            placeholder="Filter by sender id..."
            className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
          />
        </div>

        {/* Messages */}
        {loadingMessages ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
            <p className="text-4xl">💬</p>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              No messages yet
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              When customers send messages through your webhook, they will
              appear here with the keywords found on the spreadsheet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {msg.product_name}
                      </p>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        ⏱️ {msg.waiting_time || 5}s
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      Sender: {msg.sender_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        MODE_COLORS[msg.mode] || MODE_COLORS.prod
                      }`}
                    >
                      {msg.mode}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[msg.status] || STATUS_COLORS.received
                      }`}
                    >
                      {msg.status}
                    </span>
                  </div>
                </div>

                {/* Message text */}
                <p className="mb-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
                  {msg.message}
                </p>

                {/* Keywords found on the spreadsheet */}
                <div className="mb-3">
                  <p className="mb-1.5 text-xs font-medium text-gray-500">
                    🏷️ Keywords found on spreadsheet
                  </p>
                  {msg.detected_keywords && msg.detected_keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.detected_keywords.map((kw) => {
                        const data = msg.keyword_data?.[kw];
                        return (
                          <span
                            key={kw}
                            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                            title={
                              data?.meaning ? `Meaning: ${data.meaning}` : kw
                            }
                          >
                            {kw}
                            {data?.category && (
                              <span className="text-indigo-400">
                                · {data.category}
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No keywords found</p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-400">
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                  <button
                    onClick={() => setSelectedMessage(msg)}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
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
      </main>

      {/* Detail modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                💬 Message Details
              </h2>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="mb-4 rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-900">
                  {selectedMessage.product_name}
                </p>
                <p className="text-sm text-gray-500">
                  Sender: {selectedMessage.sender_id}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      MODE_COLORS[selectedMessage.mode] || MODE_COLORS.prod
                    }`}
                  >
                    {selectedMessage.mode}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[selectedMessage.status] ||
                      STATUS_COLORS.received
                    }`}
                  >
                    {selectedMessage.status}
                  </span>
                </div>
              </div>

              <div className="mb-4">
                <p className="mb-1.5 text-sm font-medium text-gray-700">
                  Message
                </p>
                <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
                  {selectedMessage.message}
                </p>
              </div>

              <div className="mb-4">
                <p className="mb-1.5 text-sm font-medium text-gray-700">
                  🏷️ Keywords found on spreadsheet
                </p>
                {selectedMessage.detected_keywords &&
                selectedMessage.detected_keywords.length > 0 ? (
                  <div className="space-y-4">
                    {selectedMessage.detected_keywords.map((kw) => {
                      const data = selectedMessage.keyword_data?.[kw];
                      const row = data?.row;
                      const headers = data?.headers;
                      // Build the list of {label, value} pairs (skip empty cells)
                      const cells = Array.isArray(row)
                        ? row
                            .map((cell, idx) => ({
                              label:
                                (headers && headers[idx]) ||
                                `Column ${idx + 1}`,
                              value:
                                typeof cell === "string" && cell.trim()
                                  ? cell
                                  : cell,
                            }))
                            .filter(
                              (c) =>
                                c.value !== "" &&
                                c.value !== null &&
                                c.value !== undefined,
                            )
                        : [];

                      return (
                        <div
                          key={kw}
                          className="rounded-lg border border-indigo-100 bg-indigo-50 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <p className="text-sm font-semibold text-indigo-700">
                              {kw}
                            </p>
                            {data?.category && (
                              <span className="text-xs text-indigo-500">
                                {data.category}
                              </span>
                            )}
                          </div>

                          {/* ✅ Show the FULL spreadsheet row HORIZONTALLY:
                            headers across the top, values in a row below */}
                          {cells.length > 0 ? (
                            <div className="overflow-x-auto rounded-md border border-indigo-100 bg-white">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-indigo-100 bg-indigo-50/60">
                                    {cells.map((c, idx) => (
                                      <th
                                        key={idx}
                                        className="whitespace-nowrap px-2 py-1.5 font-semibold text-indigo-600"
                                      >
                                        {c.label}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    {cells.map((c, idx) => (
                                      <td
                                        key={idx}
                                        className="whitespace-nowrap px-2 py-1.5 text-gray-700"
                                      >
                                        {c.value}
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">
                              {data?.meaning || "No row data"}
                            </p>
                          )}

                          {/* ✅ Action buttons */}
                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                const text = cells
                                  .map((c) => `${c.label}: ${c.value}`)
                                  .join("\n");
                                navigator.clipboard.writeText(text);
                              }}
                              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                            >
                              📋 Copy Row
                            </button>
                            <button
                              onClick={() => {
                                const text = cells
                                  .map((c) => `${c.label}: ${c.value}`)
                                  .join("\n");
                                window.open(
                                  `https://wa.me/?text=${encodeURIComponent(text)}`,
                                  "_blank",
                                );
                              }}
                              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
                            >
                              💬 Send
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No keywords found</p>
                )}
              </div>

              <p className="text-xs text-gray-400">
                Received:{" "}
                {new Date(selectedMessage.created_at).toLocaleString()}
              </p>
            </div>
            {/* /Scrollable body */}
          </div>
        </div>
      )}
    </div>
  );
}
