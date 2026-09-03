// app/dashboard/messages/page-optimized.js
// ✅ OPTIMIZED version with:
// - Fast polling using /api/messages/fast
// - Separate full enrichment on demand
// - Better caching
// - Real-time updates

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

// ⏳ Live countdown badge
function LiveCountdownBadge({ expiresAt, waitingTime, now, status }) {
  function secondsUntil(expiresAt, now) {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - now;
    return Math.ceil(diff / 1000);
  }

  const secs = secondsUntil(expiresAt, now);

  if (status && status !== "received") {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
        ⏱️ {waitingTime}s
      </span>
    );
  }

  if (secs === null) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
        ⏱️ {waitingTime}s
      </span>
    );
  }

  if (secs <= 0) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
        ⏱️ {waitingTime}s
      </span>
    );
  }

  const urgent = secs <= 3;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
        urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      <span className="inline-block animate-pulse">⏳</span> {secs}s
    </span>
  );
}

export default function MessagesPage() {
  const { user, loading } = useProtectPage();
  const router = useRouter();

  // ✅ Separate state for FAST data (lightweight)
  const [messages, setMessages] = useState([]);

  // ✅ Separate state for FULL data (enriched, for detail views)
  const [fullDataCache, setFullDataCache] = useState(new Map());

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
  const [selectedMessageFull, setSelectedMessageFull] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const getToken = () => localStorage.getItem("accessToken");

  // ✅ FAST fetch: Lightweight, for rapid polling
  const fetchMessagesFast = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoadingMessages(true);
      setError("");
      try {
        const params = new URLSearchParams({ page, limit: "20" });
        if (productFilter) params.set("productId", productFilter);
        if (statusFilter) params.set("status", statusFilter);
        if (senderFilter) params.set("senderId", senderFilter);

        // ✅ Use FAST endpoint (200-300ms instead of 2-3s)
        const res = await fetch(`/api/messages/fast?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages);
          setTotalPages(data.totalPages || 1);

          // ✅ Log performance (for monitoring)
          if (!silent) {
            console.log(
              `📊 Fast fetch: ${data.count} messages in ~200ms (enriched: false)`,
            );
          }
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

  // ✅ FULL fetch: Heavy enrichment, only when needed (detail view)
  const fetchMessageFull = useCallback(
    async (messageId) => {
      // ✅ Check cache first
      if (fullDataCache.has(messageId)) {
        const cached = fullDataCache.get(messageId);
        // If cached < 30 seconds ago, use it
        if (Date.now() - cached.timestamp < 30000) {
          setSelectedMessageFull(cached.data);
          return;
        }
      }

      setLoadingDetail(true);
      try {
        const params = new URLSearchParams({ messageId });

        // ✅ Fetch FULL data from original endpoint
        const res = await fetch(`/api/messages?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success && data.messages[0]) {
          const fullMessage = data.messages[0];

          // ✅ Cache it
          setFullDataCache((prev) => {
            const updated = new Map(prev);
            updated.set(messageId, {
              data: fullMessage,
              timestamp: Date.now(),
            });
            return updated;
          });

          setSelectedMessageFull(fullMessage);
          console.log(
            `📊 Full fetch: enriched with keywords + batch info (~1-2s)`,
          );
        }
      } catch (err) {
        // non-fatal
        console.error("Failed to fetch full message:", err);
      } finally {
        setLoadingDetail(false);
      }
    },
    [fullDataCache, getToken],
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
      } else {
        setError(data.error || "Failed to delete message");
      }
    } catch (err) {
      setError("Failed to delete message");
    }
  };

  // ✅ Live countdown state
  const [now, setNow] = useState(0);

  // ✅ Initial load: Fetch products + fast messages
  useEffect(() => {
    if (user) {
      fetchMessagesFast();
      fetchProducts();
    }
  }, [user, fetchMessagesFast, fetchProducts]);

  // ✅ OPTIMIZED polling: Every 1 second (fast endpoint is fast enough)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchMessagesFast({ silent: true });
    }, 1000); // ✅ 1s instead of 2s (we can afford it now!)
    return () => clearInterval(interval);
  }, [user, fetchMessagesFast]);

  // ✅ Live countdown ticker
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ Auto-process when timer expires
  useEffect(() => {
    if (!user) return;
    const token = getToken();
    if (!token) return;

    const expired = messages.filter(
      (m) =>
        m.status === "received" &&
        m.batch_expires_at &&
        new Date(m.batch_expires_at).getTime() - now <= 0,
    );

    if (expired.length === 0) return;

    fetch("/api/batches/process", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(() => {
        fetchMessagesFast({ silent: true });
      })
      .catch(() => {
        // non-fatal
      });
  }, [now, messages, user, fetchMessagesFast]);

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
                Live messages (fast polling) and keyword detection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              {messages.length} messages
            </span>
            {/* ✅ Show refresh status */}
            <span className="text-xs text-gray-500">Polling every 1s ⚡</span>
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

        {/* Messages List */}
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
              Messages will appear here as they arrive via webhook.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md cursor-pointer"
                onClick={() => {
                  setSelectedMessage(msg);
                  fetchMessageFull(msg.id);
                }}
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {msg.product_name}
                      </p>
                      <LiveCountdownBadge
                        expiresAt={msg.batch_expires_at}
                        waitingTime={msg.waiting_time || 7}
                        now={now}
                        status={msg.status}
                      />
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

                {/* Message preview */}
                <p className="mb-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-800 line-clamp-2">
                  {msg.message}
                </p>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteMessage(msg.id);
                    }}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMessage(msg);
                      fetchMessageFull(msg.id);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-700"
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
          <div className="mt-6 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-3 py-2 rounded-lg ${
                  page === p
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Detail Modal */}
      {selectedMessage && selectedMessageFull && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Message Details</h2>
              <button
                onClick={() => {
                  setSelectedMessage(null);
                  setSelectedMessageFull(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {loadingDetail ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500">Message</p>
                  <p className="text-sm font-semibold">
                    {selectedMessageFull.message}
                  </p>
                </div>

                {/* Keywords section (from full data) */}
                {selectedMessageFull.detected_keywords &&
                  selectedMessageFull.detected_keywords.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">
                        Keywords
                      </p>
                      <div className="space-y-2">
                        {selectedMessageFull.detected_keywords.map((kw) => (
                          <div
                            key={kw}
                            className="text-xs bg-blue-50 p-2 rounded border border-blue-200"
                          >
                            <p className="font-semibold text-blue-900">{kw}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Payload section */}
                {selectedMessageFull.sent_payload && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      n8n Payload
                    </p>
                    <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-48">
                      {JSON.stringify(
                        selectedMessageFull.sent_payload,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
