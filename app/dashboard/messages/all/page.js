// app/dashboard/messages/all/page.js
// ============================================================
// 📚 ALL MESSAGES — Archive of every message saved in the database.
//    Unlike the "Live Messages" page (which polls in real-time and
//    shows only the latest 20), this page lets you browse the FULL
//    history with powerful filters:
//      • Keyword      (matches detected keywords OR message text)
//      • Sender ID    (partial match)
//      • Date range   (from → to)
//      • Status       (received / processing / completed / failed)
//      • Product      (which product the message belongs to)
//    Plus single + bulk delete buttons.
// ============================================================
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

// ============================================================
// 🧩 RAW DATA VIEWER
//    Renders the full Messenger API payload with clear visual
//    separation between every top-level object. Each key becomes
//    its own labeled section. Nested objects are shown as
//    formatted JSON inside a scrollable code block.
// ============================================================

// Try to parse a JSON string; returns the parsed value or null.
function tryParseJson(str) {
  if (typeof str !== "string") return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  if (trimmed[0] !== "{" && trimmed[0] !== "[" && trimmed[0] !== '"') {
    return null;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

// Convert literal "\n" (backslash-n) sequences into real newlines so
// strings like "واش\nسلم\nبخير" display as a full multi-line string
// instead of showing the escape characters.
function formatDisplayString(str) {
  if (typeof str !== "string") return str;
  return str.replace(/\\n/g, "\n");
}

// A single labeled section wrapper.
function Section({ title, children, accent = "gray" }) {
  const accentMap = {
    gray: "border-gray-700 bg-gray-800/60",
    blue: "border-blue-700 bg-blue-900/30",
    green: "border-emerald-700 bg-emerald-900/30",
    purple: "border-purple-700 bg-purple-900/30",
    amber: "border-amber-700 bg-amber-900/30",
    red: "border-red-700 bg-red-900/30",
  };
  return (
    <div
      className={`rounded-md border p-2 ${accentMap[accent] || accentMap.gray}`}
    >
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-300">
        {title}
      </p>
      {children}
    </div>
  );
}

// Render a single key/value pair as its own section.
function KeyValueSection({ label, value }) {
  // Try to parse JSON strings so nested objects get separated too.
  const parsed = tryParseJson(value);
  const display = parsed !== null ? parsed : value;

  return (
    <Section title={label}>
      {typeof display === "object" && display !== null ? (
        <RawDataViewer data={display} />
      ) : (
        <pre className="whitespace-pre-wrap wrap-break-word font-mono text-[10px] leading-relaxed text-emerald-300">
          {formatDisplayString(String(display))}
        </pre>
      )}
    </Section>
  );
}

function RawDataViewer({ data }) {
  if (data === null || data === undefined) {
    return <p className="text-xs text-gray-400">—</p>;
  }

  // If it's a plain string, try to parse it as JSON first.
  if (typeof data === "string") {
    const parsed = tryParseJson(data);
    if (parsed !== null) {
      return <RawDataViewer data={parsed} />;
    }
    return (
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap wrap-break-word font-mono text-[10px] leading-relaxed text-emerald-300">
        {formatDisplayString(data)}
      </pre>
    );
  }

  // If it's an array, show each item as a separate block.
  if (Array.isArray(data)) {
    return (
      <div className="space-y-2">
        {data.map((item, i) => (
          <Section key={i} title={`Item ${i + 1}`}>
            <RawDataViewer data={item} />
          </Section>
        ))}
      </div>
    );
  }

  // Object: render each key as its own separated section.
  if (typeof data === "object") {
    const entries = Object.entries(data);
    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => (
          <KeyValueSection key={key} label={key} value={value} />
        ))}
      </div>
    );
  }

  return (
    <pre className="whitespace-pre-wrap wrap-break-word font-mono text-[10px] leading-relaxed text-emerald-300">
      {formatDisplayString(String(data))}
    </pre>
  );
}

export default function AllMessagesPage() {
  const { user, loading } = useProtectPage();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [keywordFilter, setKeywordFilter] = useState("");
  const [senderFilter, setSenderFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Selection (bulk delete)
  const [selected, setSelected] = useState(new Set());

  // Detail modal
  const [selectedMessage, setSelectedMessage] = useState(null);

  // Expanded raw-data cards (set of message ids)
  const [expandedRaw, setExpandedRaw] = useState(new Set());

  const toggleRaw = (id) => {
    setExpandedRaw((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getToken = () => localStorage.getItem("accessToken");

  // ✅ Delete a single message
  const deleteMessage = async (id) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      const res = await fetch(`/api/messages`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setTotal((prev) => Math.max(0, prev - 1));
      } else {
        setError(data.error || "Failed to delete message");
      }
    } catch (err) {
      setError("Failed to delete message");
    }
  };

  // ✅ Bulk delete selected messages
  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected message(s)?`)) return;
    try {
      const res = await fetch(`/api/messages`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ ids: [...selected] }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => prev.filter((m) => !selected.has(m.id)));
        setTotal((prev) => Math.max(0, prev - data.deleted));
        setSelected(new Set());
      } else {
        setError(data.error || "Failed to delete messages");
      }
    } catch (err) {
      setError("Failed to delete messages");
    }
  };

  const fetchMessages = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoadingMessages(true);
      setError("");
      try {
        const buildParams = (pg) => {
          const params = new URLSearchParams({ page: String(pg), limit: "50" });
          if (keywordFilter) params.set("keyword", keywordFilter);
          if (senderFilter) params.set("senderId", senderFilter);
          if (fromFilter) params.set("from", fromFilter);
          if (toFilter) params.set("to", toFilter);
          if (statusFilter) params.set("status", statusFilter);
          if (productFilter) params.set("productId", productFilter);
          return params;
        };

        // First page to learn total pages.
        const firstRes = await fetch(`/api/messages?${buildParams(1)}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const firstData = await firstRes.json();
        if (!firstData.success) {
          setError(firstData.error || "Failed to load messages");
          return;
        }

        let allMessages = firstData.messages || [];
        const totalPages = firstData.totalPages || 1;

        // If a sender is specified, fetch ALL pages so we get every
        // message saved for that sender across the whole database.
        if (senderFilter && totalPages > 1) {
          const rest = [];
          for (let pg = 2; pg <= totalPages; pg++) {
            const res = await fetch(`/api/messages?${buildParams(pg)}`, {
              headers: { Authorization: `Bearer ${getToken()}` },
            });
            const data = await res.json();
            if (data.success && data.messages) rest.push(...data.messages);
          }
          allMessages = [...allMessages, ...rest];
        }

        setMessages(allMessages);
        setTotalPages(senderFilter ? 1 : totalPages);
        setTotal(firstData.total || 0);
        // Clear selection of ids no longer present
        const ids = new Set(allMessages.map((m) => m.id));
        setSelected((prev) => {
          const next = new Set();
          prev.forEach((id) => {
            if (ids.has(id)) next.add(id);
          });
          return next;
        });
      } catch (err) {
        setError("Failed to load messages");
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [
      keywordFilter,
      senderFilter,
      fromFilter,
      toFilter,
      statusFilter,
      productFilter,
    ],
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

  // Reset to page 1 whenever a filter changes
  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [
    keywordFilter,
    senderFilter,
    fromFilter,
    toFilter,
    statusFilter,
    productFilter,
  ]);

  // Toggle a single row in the selection set
  const toggleSelect = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toggleSelectAll = () => {
    if (selected.size === messages.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(messages.map((m) => m.id)));
    }
  };

  const clearFilters = () => {
    setKeywordFilter("");
    setSenderFilter("");
    setFromFilter("");
    setToFilter("");
    setStatusFilter("");
    setProductFilter("");
  };

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
              onClick={() => router.push("/dashboard/messages")}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ← Live Messages
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                📚 All Messages
              </h1>
              <p className="text-sm text-gray-500">
                Full archive of every message saved in the database
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              {total} total
            </span>
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                🗑️ Delete {selected.size} selected
              </button>
            )}
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
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">🔍 Filters</p>
            <button
              onClick={clearFilters}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              ✕ Clear all
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <input
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
              placeholder="🏷️ Filter by keyword..."
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
            />
            <input
              value={senderFilter}
              onChange={(e) => setSenderFilter(e.target.value)}
              placeholder="👤 Filter by sender id..."
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
            />
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
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromFilter}
                onChange={(e) => setFromFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              />
              <span className="text-xs text-gray-400">→</span>
              <input
                type="date"
                value={toFilter}
                onChange={(e) => setToFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Messages */}
        {loadingMessages ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
            <p className="text-4xl">📭</p>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              No messages found
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Try adjusting your filters, or check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="flex flex-col rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(msg.id)}
                      onChange={() => toggleSelect(msg.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {msg.product_name}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        Sender: {msg.sender_id}
                      </p>
                    </div>
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
                <div className="mb-2 rounded-md border border-blue-100 bg-blue-50/50 p-2">
                  <p className="mb-1 text-xs font-semibold text-blue-700">
                    💬 Message
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-gray-800">
                    {msg.message || "—"}
                  </p>
                </div>

                {/* Keywords */}
                <div className="mb-2">
                  <p className="mb-1 text-xs font-medium text-gray-500">
                    🏷️ Keywords
                  </p>
                  {msg.detected_keywords && msg.detected_keywords.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {msg.detected_keywords.map((kw) => (
                        <span
                          key={kw}
                          className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">No keywords found</p>
                  )}
                </div>

                {/* Conversation history (all messages from this sender) */}
                {msg.conversation_history &&
                  msg.conversation_history.length > 0 && (
                    <div className="mb-2 rounded-md border border-gray-200 bg-gray-50 p-2">
                      <p className="mb-1 text-xs font-semibold text-gray-700">
                        💬 Conversation history (
                        {msg.conversation_history.length})
                      </p>
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {msg.conversation_history.map((item, idx) => {
                          // ✅ Support both plain strings (old payloads)
                          //    and { text, created_at } objects (new API)
                          const text =
                            typeof item === "string" ? item : item?.text || "";
                          const ts =
                            typeof item === "string" ? null : item?.created_at;
                          return (
                            <div
                              key={idx}
                              className="rounded border border-gray-200 bg-white px-2 py-1"
                            >
                              <p className="whitespace-pre-wrap text-xs text-gray-700">
                                {formatDisplayString(String(text))}
                              </p>
                              {ts && (
                                <p className="mt-0.5 text-[10px] text-gray-400">
                                  🕐 {new Date(ts).toLocaleString()}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Failure reason */}
                {msg.status === "failed" && msg.failure_reason && (
                  <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-2">
                    <p className="mb-1 text-xs font-semibold text-red-700">
                      ❌ Failure reason
                    </p>
                    <p className="text-sm text-red-700">{msg.failure_reason}</p>
                  </div>
                )}

                {/* Full raw data toggle */}
                <button
                  onClick={() => toggleRaw(msg.id)}
                  className="mb-2 flex w-full items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  <span>📦 Full data (product + Messenger API)</span>
                  <span>{expandedRaw.has(msg.id) ? "▲ Hide" : "▼ Show"}</span>
                </button>

                {expandedRaw.has(msg.id) && (
                  <div className="mb-2 space-y-2">
                    {/* Product info */}
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                      <p className="mb-1 text-xs font-semibold text-gray-700">
                        🏷️ Product information
                      </p>
                      <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
                        <p>
                          <span className="font-medium">Name:</span>{" "}
                          {msg.product_name || "—"}
                        </p>
                        <p>
                          <span className="font-medium">Product ID:</span>{" "}
                          {msg.product_id || "—"}
                        </p>
                        <p>
                          <span className="font-medium">Batch ID:</span>{" "}
                          {msg.batch_id || "—"}
                        </p>
                        <p>
                          <span className="font-medium">Mode:</span>{" "}
                          {msg.mode || "—"}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          {msg.status || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Full Messenger API payload */}
                    <div className="rounded-md border border-gray-200 bg-gray-900 p-2">
                      <p className="mb-1 text-xs font-semibold text-gray-300">
                        📡 Full Messenger API data (raw_data)
                      </p>
                      <RawDataViewer data={msg.raw_data} />
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-2">
                  <p className="text-xs text-gray-400">
                    {new Date(msg.created_at).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      🗑️ Remove
                    </button>
                    <button
                      onClick={() => setSelectedMessage(msg)}
                      className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} · {total} messages
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

              <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                <p className="mb-1.5 text-xs font-semibold text-blue-700">
                  💬 Message
                </p>
                <p className="whitespace-pre-wrap text-sm text-gray-800">
                  {selectedMessage.message || "—"}
                </p>
              </div>

              {/* Conversation history (all messages from this sender) */}
              {selectedMessage.conversation_history &&
                selectedMessage.conversation_history.length > 0 && (
                  <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="mb-1.5 text-sm font-medium text-gray-700">
                      💬 Conversation history (
                      {selectedMessage.conversation_history.length})
                    </p>
                    <div className="max-h-60 space-y-1.5 overflow-y-auto">
                      {selectedMessage.conversation_history.map((item, idx) => {
                        // ✅ Support both plain strings (old payloads)
                        //    and { text, created_at } objects (new API)
                        const text =
                          typeof item === "string" ? item : item?.text || "";
                        const ts =
                          typeof item === "string" ? null : item?.created_at;
                        return (
                          <div
                            key={idx}
                            className="rounded border border-gray-200 bg-white px-2.5 py-1.5"
                          >
                            <p className="whitespace-pre-wrap text-xs text-gray-700">
                              {formatDisplayString(String(text))}
                            </p>
                            {ts && (
                              <p className="mt-0.5 text-[10px] text-gray-400">
                                🕐 {new Date(ts).toLocaleString()}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              {selectedMessage.status === "failed" &&
                selectedMessage.failure_reason && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="mb-1 text-xs font-semibold text-red-700">
                      ❌ Failure reason
                    </p>
                    <p className="text-sm text-red-700">
                      {selectedMessage.failure_reason}
                    </p>
                  </div>
                )}

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

              {/* Product info */}
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="mb-1.5 text-sm font-medium text-gray-700">
                  🏷️ Product information
                </p>
                <div className="grid grid-cols-1 gap-1 text-xs text-gray-600">
                  <p>
                    <span className="font-medium">Name:</span>{" "}
                    {selectedMessage.product_name || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Product ID:</span>{" "}
                    {selectedMessage.product_id || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Batch ID:</span>{" "}
                    {selectedMessage.batch_id || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Mode:</span>{" "}
                    {selectedMessage.mode || "—"}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{" "}
                    {selectedMessage.status || "—"}
                  </p>
                </div>
              </div>

              {/* Full Messenger API payload */}
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-900 p-3">
                <p className="mb-1.5 text-xs font-semibold text-gray-300">
                  📡 Full Messenger API data (raw_data)
                </p>
                <RawDataViewer data={selectedMessage.raw_data} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
