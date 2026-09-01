// app/dashboard/page.js
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProtectPage } from "@/lib/auth/auth";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/actions/product-actions";

export default function DashboardPage() {
  const { user, loading } = useProtectPage();
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  // Edit / Delete / Messages state
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingMessages, setViewingMessages] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [testingId, setTestingId] = useState(null);

  // Navigation & Analytics state
  const [activeView, setActiveView] = useState("dashboard");
  const [analyticsPeriod, setAnalyticsPeriod] = useState("week");
  const [analyticsProduct, setAnalyticsProduct] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Webhook models (AI models) for product creation
  const [webhooks, setWebhooks] = useState([]);
  const [selectedWebhook, setSelectedWebhook] = useState("");

  // Keyword lists (Google Sheets) for product creation
  const [keywordLists, setKeywordLists] = useState([]);
  const [selectedKeywordList, setSelectedKeywordList] = useState("");

  // Live message notifications
  const [notifications, setNotifications] = useState([]);
  const [dbConnected, setDbConnected] = useState(null); // null | true | false
  const [notifPanelOpen, setNotifPanelOpen] = useState(true);
  const knownMessageIds = useRef(new Set());

  const getToken = () => localStorage.getItem("accessToken");

  // Push a notification toast (auto-dismiss after 6s)
  const pushNotification = useCallback((msg) => {
    const id = `${msg.id}-${Date.now()}`;
    setNotifications((prev) => [...prev.slice(-4), { ...msg, notifId: id }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.notifId !== id));
    }, 6000);
  }, []);

  // Dismiss a single notification
  const dismissNotification = useCallback((notifId) => {
    setNotifications((prev) => prev.filter((n) => n.notifId !== notifId));
  }, []);

  // ============================================
  // ✅ LIVE MESSAGE NOTIFICATIONS
  //    Polls /api/messages every few seconds.
  //    When a NEW message appears in the DB, it
  //    pops up as a toast notification.
  // ============================================
  const pollMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages?limit=10", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();

      if (data.connected === false) {
        setDbConnected(false);
        return;
      }
      setDbConnected(true);

      if (data.success && Array.isArray(data.messages)) {
        // Track the newest message id we've seen
        const prev = knownMessageIds.current;
        const next = new Set(prev);
        let newestId = null;
        let newestTime = 0;

        data.messages.forEach((m) => {
          const t = new Date(m.created_at).getTime();
          if (t > newestTime) {
            newestTime = t;
            newestId = m.id;
          }
          next.add(m.id);
        });

        // Only notify for messages newer than what we already know
        if (newestId && !prev.has(newestId)) {
          const newest = data.messages.find((m) => m.id === newestId);
          if (newest) {
            pushNotification(newest);
          }
        }

        knownMessageIds.current = next;
      }
    } catch {
      // Network error — don't spam, just mark disconnected
      setDbConnected(false);
    }
  }, [pushNotification]);

  // Start polling when the user is logged in
  useEffect(() => {
    if (!user) return;
    pollMessages(); // immediate first check
    const interval = setInterval(pollMessages, 5000);
    return () => clearInterval(interval);
  }, [user, pollMessages]);

  // Fetch available webhook models
  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setWebhooks(data.webhooks);
    } catch (err) {
      // non-fatal
    }
  }, []);

  // Fetch available keyword lists
  const fetchKeywordLists = useCallback(async () => {
    try {
      const res = await fetch("/api/keyword-lists", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setKeywordLists(data.lists);
    } catch (err) {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchWebhooks();
      fetchKeywordLists();
    }
  }, [user, fetchWebhooks, fetchKeywordLists]);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const token = getToken();
      const response = await fetch("/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.products);
      } else {
        setError(data.error || "Failed to fetch products");
      }
    } catch (err) {
      setError("Failed to fetch products");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user, fetchProducts]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    setError("");
    try {
      const params = new URLSearchParams({ period: analyticsPeriod });
      if (analyticsProduct) params.set("productId", analyticsProduct);

      const res = await fetch(`/api/products/analytics?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setAnalytics(data);
      } else {
        setError(data.error || "Failed to load analytics");
      }
    } catch (err) {
      setError("Failed to load analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  }, [analyticsPeriod, analyticsProduct]);

  useEffect(() => {
    if (user && activeView === "dashboard") {
      fetchAnalytics();
    }
  }, [user, activeView, fetchAnalytics]);

  // Create product
  async function handleCreate(formData) {
    setIsCreating(true);
    setMessage("");
    setError("");

    formData.append("userId", user.id);
    if (selectedWebhook) {
      formData.append("webhook_model_id", selectedWebhook);
    }
    if (selectedKeywordList) {
      formData.append("keyword_list_id", selectedKeywordList);
    }
    const result = await createProduct(formData);

    if (result.success) {
      setMessage("✅ Product created successfully!");
      setShowCreateForm(false);
      fetchProducts();
    } else {
      setError(result.error || "Failed to create product");
    }
    setIsCreating(false);
  }

  // Copy webhook URL
  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      setError("Failed to copy");
    }
  };

  // Toggle mode
  const toggleMode = async (productId, currentMode) => {
    setTogglingId(productId);
    setError("");
    try {
      const newMode = currentMode === "prod" ? "test" : "prod";
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ productId, mode: newMode }),
      });
      const data = await res.json();
      if (data.success) {
        fetchProducts();
      } else {
        setError(data.error || "Failed to toggle mode");
      }
    } catch (err) {
      setError("Failed to toggle mode");
    } finally {
      setTogglingId(null);
    }
  };

  // Edit product
  async function handleEdit(formData) {
    setIsEditing(true);
    setMessage("");
    setError("");
    const result = await updateProduct(editingProduct._id, formData);
    if (result.success) {
      setMessage("✅ Product updated successfully!");
      setEditingProduct(null);
      fetchProducts();
    } else {
      setError(result.error || "Failed to update product");
    }
    setIsEditing(false);
  }

  // Delete product
  async function handleDelete() {
    setIsDeleting(true);
    setError("");
    const result = await deleteProduct(deletingProduct._id);
    if (result.success) {
      setMessage("🗑️ Product deleted successfully!");
      setDeletingProduct(null);
      fetchProducts();
    } else {
      setError(result.error || "Failed to delete product");
    }
    setIsDeleting(false);
  }

  // View messages for a product
  const viewMessages = async (product) => {
    setViewingMessages(product);
    setLoadingMessages(true);
    setMessages([]);
    try {
      const res = await fetch(`/api/products/${product._id}/messages`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      } else {
        setError(data.error || "Failed to load messages");
      }
    } catch (err) {
      setError("Failed to load messages");
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send test message
  const sendTestMessage = async (product) => {
    setTestingId(product._id);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/webhook/test/${product.api_key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender_id: "test_sender",
          message: "🧪 This is a test message",
          platform: "test",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage("🧪 Test message sent successfully!");
      } else {
        setError(data.error || "Failed to send test message");
      }
    } catch (err) {
      setError("Failed to send test message");
    } finally {
      setTestingId(null);
    }
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  // Stats
  const totalProducts = products.length;
  const totalWebhookCalls = products.reduce(
    (sum, p) => sum + (p.webhook_calls || 0),
    0,
  );
  const totalTestCalls = products.reduce(
    (sum, p) => sum + (p.webhook_calls_test || 0),
    0,
  );
  const totalProdCalls = products.reduce(
    (sum, p) => sum + (p.webhook_calls_prod || 0),
    0,
  );

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "products", label: "Products", icon: "📦" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Top Navbar ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-indigo-600 to-purple-600 text-lg text-white shadow-lg shadow-indigo-600/20">
              📊
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">Dashboard</p>
              <p className="text-xs text-slate-500">Control Center</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {(user.role === "admin" || user.role === "super_admin") && (
              <button
                onClick={() => router.push("/admin")}
                className="rounded-lg bg-linear-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-purple-600/20 transition-all hover:shadow-lg hover:shadow-purple-600/30"
              >
                🛡️ Admin Panel
              </button>
            )}
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-500 text-sm font-semibold text-white">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium text-slate-700 sm:block">
                {user.name}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ===== Navigation Tabs ===== */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {navItems.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.href) {
                  router.push(tab.href);
                } else {
                  setActiveView(tab.id);
                }
              }}
              className={`relative whitespace-nowrap px-5 py-3.5 text-sm font-medium transition-colors ${
                activeView === tab.id
                  ? "text-indigo-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
              {activeView === tab.id && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 bg-linear-to-r from-indigo-600 to-purple-600" />
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* ===== Live Message Notifications Panel (right side) ===== */}
        {notifPanelOpen && (
          <div className="fixed right-4 top-20 z-50 flex max-h-[calc(100vh-6rem)] w-80 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
            {/* Panel header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <p className="text-sm font-bold text-white">Live Messages</p>
                {notifications.length > 0 && (
                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">
                    {notifications.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setNotifications([])}
                  className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label="Clear all"
                  title="Clear all"
                >
                  🗑️
                </button>
                <button
                  onClick={() => setNotifPanelOpen(false)}
                  className="rounded-md p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label="Close panel"
                  title="Close panel"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <div className="text-4xl">💬</div>
                  <p className="mt-3 text-sm font-medium text-slate-600">
                    No messages yet
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Incoming messages will appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((n) => (
                    <div
                      key={n.notifId}
                      className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm">
                        💬
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-relaxed text-slate-800">
                          {n.message}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {new Date(n.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissNotification(n.notifId)}
                        className="shrink-0 rounded-md p-1 text-slate-300 opacity-0 transition-all hover:bg-slate-100 hover:text-slate-600 group-hover:opacity-100"
                        aria-label="Dismiss"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== Floating button to reopen notifications panel ===== */}
        {!notifPanelOpen && (
          <button
            onClick={() => setNotifPanelOpen(true)}
            className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:shadow-xl"
          >
            💬 Live Messages
            {notifications.length > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-indigo-600">
                {notifications.length}
              </span>
            )}
          </button>
        )}

        {/* ===== DB Connection Status ===== */}
        {dbConnected !== null && (
          <div
            className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm ${
              dbConnected
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                dbConnected ? "bg-emerald-500" : "bg-rose-500"
              } ${dbConnected ? "animate-pulse" : ""}`}
            />
            {dbConnected
              ? "🟢 Connected to database — listening for incoming messages"
              : "🔴 Database connection lost — retrying..."}
          </div>
        )}

        {/* ===== Welcome Banner ===== */}
        <div className="mb-8 overflow-hidden rounded-2xl bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-600 p-8 text-white shadow-xl shadow-indigo-600/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Welcome back, {user.name}! 👋
              </h1>
              <p className="mt-1 text-indigo-100">
                Manage your products and monitor your webhook activity.
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-600 shadow-md transition-all hover:bg-indigo-50"
            >
              + New Product
            </button>
          </div>
        </div>

        {/* ===== Messages ===== */}
        {message && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ===== ANALYTICS SECTION ===== */}
        {activeView === "dashboard" && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  📈 Message Analytics
                </h2>
                <p className="text-sm text-slate-500">
                  Messages received by time period
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                  {[
                    { id: "day", label: "Day" },
                    { id: "week", label: "Week" },
                    { id: "month", label: "Month" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setAnalyticsPeriod(p.id)}
                      className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        analyticsPeriod === p.id
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <select
                  value={analyticsProduct}
                  onChange={(e) => setAnalyticsProduct(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">All Products</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingAnalytics ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              </div>
            ) : analytics ? (
              <div>
                {/* Summary cards */}
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <div className="rounded-xl bg-linear-to-br from-indigo-50 to-blue-50 p-4">
                    <p className="text-xs font-medium text-indigo-600">
                      Total Messages
                    </p>
                    <p className="mt-1 text-3xl font-bold text-indigo-700">
                      {analytics.total || 0}
                    </p>
                    <p className="mt-1 text-xs text-indigo-500">
                      Received from webhooks
                    </p>
                  </div>
                  <div className="rounded-xl bg-linear-to-br from-emerald-50 to-green-50 p-4">
                    <p className="text-xs font-medium text-emerald-600">
                      Success Rate
                    </p>
                    <p className="mt-1 text-3xl font-bold text-emerald-700">
                      {analytics.successRate ?? 100}%
                    </p>
                    <p className="mt-1 text-xs text-emerald-500">
                      {analytics.completed || 0} completed ·{" "}
                      {analytics.failed || 0} failed
                    </p>
                  </div>
                  <div className="rounded-xl bg-linear-to-br from-amber-50 to-yellow-50 p-4">
                    <p className="text-xs font-medium text-amber-600">
                      Avg Response Time
                    </p>
                    <p className="mt-1 text-3xl font-bold text-amber-700">
                      {analytics.avgResponseTime || "0"}s
                    </p>
                    <p className="mt-1 text-xs text-amber-500">
                      Estimated from waiting time
                    </p>
                  </div>
                  <div className="rounded-xl bg-linear-to-br from-purple-50 to-fuchsia-50 p-4">
                    <p className="text-xs font-medium text-purple-600">
                      Active Products
                    </p>
                    <p className="mt-1 text-3xl font-bold text-purple-700">
                      {products.filter((p) => p.status !== "Inactive").length}
                    </p>
                    <p className="mt-1 text-xs text-purple-500">
                      {products.length} total products
                    </p>
                  </div>
                </div>

                {/* Bar chart */}
                {analytics.timeSeries && analytics.timeSeries.length > 0 && (
                  <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-700">
                      Messages over time
                    </p>
                    <div className="flex h-44 items-end gap-2">
                      {analytics.timeSeries.map((point, i) => {
                        const max = Math.max(
                          ...analytics.timeSeries.map((p) => p.count),
                          1,
                        );
                        const height = (point.count / max) * 100;
                        return (
                          <div
                            key={i}
                            className="group flex flex-1 flex-col items-center gap-1"
                          >
                            <span className="text-xs font-semibold text-slate-600 opacity-0 transition-opacity group-hover:opacity-100">
                              {point.count}
                            </span>
                            <div
                              className="w-full rounded-t-lg bg-linear-to-t from-indigo-600 to-purple-500 transition-all group-hover:from-indigo-500 group-hover:to-purple-400"
                              style={{ height: `${Math.max(height, 4)}%` }}
                            />
                            <span className="text-[10px] text-slate-500">
                              {point.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Per-product table */}
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        {[
                          "Product",
                          "Messages",
                          "Test",
                          "Production",
                          "Completed",
                          "Failed",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {analytics.products?.map((p) => (
                        <tr
                          key={p.id}
                          className="transition-colors hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                            {p.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            {p.count}
                          </td>
                          <td className="px-4 py-3 text-sm text-amber-600">
                            {p.test}
                          </td>
                          <td className="px-4 py-3 text-sm text-emerald-600">
                            {p.prod}
                          </td>
                          <td className="px-4 py-3 text-sm text-indigo-600">
                            {p.completed}
                          </td>
                          <td className="px-4 py-3 text-sm text-rose-600">
                            {p.failed}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Recent webhook calls */}
                {analytics.recentCalls && analytics.recentCalls.length > 0 && (
                  <div className="mt-6">
                    <p className="mb-3 text-sm font-semibold text-slate-700">
                      🔔 Recent Webhook Calls
                    </p>
                    <div className="space-y-3">
                      {analytics.recentCalls.map((call) => (
                        <div
                          key={call.id}
                          className="flex items-start justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${
                                  call.status === "completed"
                                    ? "bg-emerald-500"
                                    : call.status === "failed"
                                      ? "bg-rose-500"
                                      : "bg-amber-500"
                                }`}
                              />
                              <p className="text-sm font-semibold text-slate-900">
                                {call.product_name}
                              </p>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                                {call.mode === "test" ? "🧪 Test" : "🚀 Prod"}
                              </span>
                            </div>
                            <p className="mt-1 truncate text-sm text-slate-600">
                              <span className="text-slate-400">
                                {call.sender_id}:
                              </span>{" "}
                              &ldquo;{call.message}&rdquo;
                            </p>
                          </div>
                          <div className="ml-3 shrink-0 text-right">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                call.status === "completed"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : call.status === "failed"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {call.status}
                            </span>
                            <p className="mt-1 text-xs text-slate-400">
                              {new Date(call.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">
                No analytics data available.
              </p>
            )}
          </div>
        )}

        {/* ===== PRODUCTS VIEW ===== */}
        {(activeView === "dashboard" || activeView === "products") && (
          <>
            {/* Stats cards */}
            <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Total Products",
                  value: totalProducts,
                  icon: "📦",
                  grad: "from-blue-500 to-indigo-500",
                },
                {
                  label: "Webhook Calls",
                  value: totalWebhookCalls,
                  icon: "🔗",
                  grad: "from-emerald-500 to-teal-500",
                },
                {
                  label: "Test Calls",
                  value: totalTestCalls,
                  icon: "🧪",
                  grad: "from-amber-500 to-orange-500",
                },
                {
                  label: "Production Calls",
                  value: totalProdCalls,
                  icon: "🚀",
                  grad: "from-purple-500 to-fuchsia-500",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      {card.label}
                    </p>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br ${card.grad} text-lg text-white shadow-md`}
                    >
                      {card.icon}
                    </div>
                  </div>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Products header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Your Products
                </h2>
                <p className="text-sm text-slate-500">
                  Manage and monitor your products
                </p>
              </div>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:shadow-lg"
              >
                {showCreateForm ? "✕ Cancel" : "+ New Product"}
              </button>
            </div>

            {/* Create form */}
            {showCreateForm && (
              <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-slate-900">
                  Create New Product
                </h3>
                <form
                  action={handleCreate}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Product Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      placeholder="e.g. Pizza Menu"
                      required
                      className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Price (DZD)
                    </label>
                    <input
                      type="number"
                      name="price"
                      placeholder="e.g. 1500"
                      required
                      className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      placeholder="e.g. 20"
                      required
                      className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Description
                    </label>
                    <input
                      type="text"
                      name="description"
                      placeholder="Optional description"
                      className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      Waiting Time (seconds)
                    </label>
                    <input
                      type="number"
                      name="waiting_time"
                      placeholder="e.g. 5"
                      min="1"
                      max="30"
                      className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      🤖 Select AI Model
                    </label>
                    <select
                      value={selectedWebhook}
                      onChange={(e) => setSelectedWebhook(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Select an AI model...</option>
                      {webhooks.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                          {w.description ? ` — ${w.description}` : ""}
                        </option>
                      ))}
                    </select>
                    {webhooks.length === 0 && (
                      <p className="text-xs text-slate-400">
                        No AI models available yet. Contact the admin.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-slate-700">
                      🔑 Select Keyword List
                    </label>
                    <select
                      value={selectedKeywordList}
                      onChange={(e) => setSelectedKeywordList(e.target.value)}
                      className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      <option value="">Select a keyword list...</option>
                      {keywordLists.map((k) => (
                        <option key={k.id} value={k.id}>
                          {k.name}
                          {k.dialect ? ` — ${k.dialect}` : ""}
                          {k.stats?.total_keywords
                            ? ` (${k.stats.total_keywords} keywords)`
                            : ""}
                        </option>
                      ))}
                    </select>
                    {keywordLists.length === 0 && (
                      <p className="text-xs text-slate-400">
                        No keyword lists available yet. Contact the admin.
                      </p>
                    )}
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="w-full rounded-lg bg-linear-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg disabled:opacity-60"
                    >
                      {isCreating ? "Creating..." : "Create Product"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Product list */}
            {loadingProducts ? (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <div className="text-5xl">📭</div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  No products yet
                </h3>
                <p className="mt-2 max-w-sm text-sm text-slate-500">
                  Create your first product to get a webhook URL and start
                  receiving messages.
                </p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-6 rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md"
                >
                  + Create Product
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {products.map((product) => {
                  const isProd = product.mode !== "test";
                  const webhookUrl = `${window.location.origin}/api/webhook/${product.api_key}`;
                  const testWebhookUrl = `${window.location.origin}/api/webhook/test/${product.api_key}`;
                  const activeUrl = isProd ? webhookUrl : testWebhookUrl;

                  return (
                    <div
                      key={product._id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-lg"
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between border-b border-slate-100 bg-linear-to-r from-slate-50 to-white px-6 py-4">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">
                            {product.name}
                          </h3>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {product.description || "No description"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {product.category && (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                {product.category}
                              </span>
                            )}
                            {product.subcategory && (
                              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                                {product.subcategory}
                              </span>
                            )}
                            {product.stock_status && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                Stock: {product.stock_status}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Mode toggle */}
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={() =>
                              toggleMode(product._id, product.mode)
                            }
                            disabled={togglingId === product._id}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              isProd ? "bg-emerald-500" : "bg-amber-500"
                            } disabled:opacity-50`}
                            aria-label="Toggle mode"
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                isProd ? "translate-x-6" : "translate-x-1"
                              }`}
                            />
                          </button>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              isProd
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {isProd ? "🚀 Production" : "🧪 Test"}
                          </span>
                          {!isProd && (
                            <span className="text-[10px] text-slate-400">
                              Limited to 5/day
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="flex-1 px-6 py-4">
                        <div className="mb-4 flex items-center gap-6">
                          <div>
                            <p className="text-xs text-slate-500">Price</p>
                            <p className="text-xl font-bold text-slate-900">
                              {product.price} DZD
                            </p>
                          </div>
                          {product.compare_price && (
                            <div>
                              <p className="text-xs text-slate-500">Compare</p>
                              <p className="text-lg font-semibold text-slate-400 line-through">
                                {product.compare_price} DZD
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-slate-500">Stock</p>
                            <p className="text-xl font-bold text-slate-900">
                              {product.quantity}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Wait Time</p>
                            <p className="text-xl font-bold text-slate-900">
                              {product.waiting_time || 5}s
                            </p>
                          </div>
                        </div>

                        {(product.name_ar || product.name_fr) && (
                          <div className="mb-4 rounded-lg bg-slate-50 p-3">
                            {product.name_ar && (
                              <p className="text-sm text-slate-700" dir="rtl">
                                {product.name_ar}
                              </p>
                            )}
                            {product.name_fr && (
                              <p className="text-sm text-slate-700">
                                {product.name_fr}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Webhook URL */}
                        <div className="mb-4">
                          <p className="mb-1.5 text-xs font-medium text-slate-500">
                            {isProd
                              ? "🔗 Production Webhook URL"
                              : "🧪 Test Webhook URL"}
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                              {activeUrl}
                            </code>
                            <button
                              onClick={() =>
                                copyToClipboard(activeUrl, product._id)
                              }
                              className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                            >
                              {copiedId === product._id
                                ? "✅ Copied"
                                : "📋 Copy"}
                            </button>
                          </div>
                        </div>

                        {/* Call stats */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-lg bg-slate-50 p-3 text-center">
                            <p className="text-lg font-bold text-slate-900">
                              {product.webhook_calls || 0}
                            </p>
                            <p className="text-xs text-slate-500">
                              Total Calls
                            </p>
                          </div>
                          <div className="rounded-lg bg-amber-50 p-3 text-center">
                            <p className="text-lg font-bold text-amber-700">
                              {product.webhook_calls_test || 0}
                            </p>
                            <p className="text-xs text-amber-600">Test</p>
                          </div>
                          <div className="rounded-lg bg-emerald-50 p-3 text-center">
                            <p className="text-lg font-bold text-emerald-700">
                              {product.webhook_calls_prod || 0}
                            </p>
                            <p className="text-xs text-emerald-600">
                              Production
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card footer */}
                      <div className="border-t border-slate-100 px-6 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-500">
                            Created:{" "}
                            {new Date(product.created_at).toLocaleDateString()}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            API: {product.api_key?.slice(0, 12)}...
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              router.push(`/products/${product._id}`)
                            }
                            className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                          >
                            📊 Details
                          </button>
                          <button
                            onClick={() => viewMessages(product)}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
                          >
                            💬 Messages ({product.webhook_calls || 0})
                          </button>
                          <button
                            onClick={() => sendTestMessage(product)}
                            disabled={testingId === product._id}
                            className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                          >
                            {testingId === product._id
                              ? "Sending..."
                              : "🧪 Test"}
                          </button>
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => setDeletingProduct(product)}
                            className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ===== Edit Product Modal ===== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditingProduct(null)}
          />
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              ✏️ Edit {editingProduct.name}
            </h3>
            <form
              action={handleEdit}
              className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {/* Basics */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Product Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingProduct.name}
                  required
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Price (DZD)
                </label>
                <input
                  type="number"
                  name="price"
                  defaultValue={editingProduct.price}
                  required
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Quantity
                </label>
                <input
                  type="number"
                  name="quantity"
                  defaultValue={editingProduct.quantity}
                  required
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Compare Price (optional)
                </label>
                <input
                  type="number"
                  name="compare_price"
                  defaultValue={editingProduct.compare_price ?? ""}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  defaultValue={editingProduct.description}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Arabic Description
                </label>
                <input
                  type="text"
                  name="description_ar"
                  defaultValue={editingProduct.description_ar}
                  dir="rtl"
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Waiting Time (seconds)
                </label>
                <input
                  type="number"
                  name="waiting_time"
                  defaultValue={editingProduct.waiting_time || 5}
                  min="1"
                  max="30"
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={editingProduct.status || "Active"}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Coming Soon">Coming Soon</option>
                </select>
              </div>

              {/* Classification */}
              <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                <p className="text-sm font-semibold text-slate-700">
                  🏷 Classification
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  name="category"
                  defaultValue={editingProduct.category || ""}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">None</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Accessories">Accessories</option>
                  <option value="Footwear">Footwear</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Subcategory
                </label>
                <input
                  type="text"
                  name="subcategory"
                  defaultValue={editingProduct.subcategory}
                  placeholder="e.g. Hijabs/Dresses/Shirts"
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Name (Arabic)
                </label>
                <input
                  type="text"
                  name="name_ar"
                  defaultValue={editingProduct.name_ar}
                  dir="rtl"
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Name (French)
                </label>
                <input
                  type="text"
                  name="name_fr"
                  defaultValue={editingProduct.name_fr}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Stock */}
              <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                <p className="text-sm font-semibold text-slate-700">📦 Stock</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Stock Status
                </label>
                <select
                  name="stock_status"
                  defaultValue={editingProduct.stock_status || "High"}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                  <option value="Out">Out of Stock</option>
                  <option value="Preorder">Preorder</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Min Quantity per Order
                </label>
                <input
                  type="number"
                  name="min_quantity"
                  min="1"
                  defaultValue={editingProduct.min_quantity || 1}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Supply */}
              <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                <p className="text-sm font-semibold text-slate-700">
                  🔧 Supply &amp; Materials
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  SKU Base
                </label>
                <input
                  type="text"
                  name="sku_base"
                  defaultValue={editingProduct.sku_base}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Barcode
                </label>
                <input
                  type="text"
                  name="barcode"
                  defaultValue={editingProduct.barcode}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Supplier
                </label>
                <input
                  type="text"
                  name="supplier"
                  defaultValue={editingProduct.supplier}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Reorder Point
                </label>
                <input
                  type="text"
                  name="reorder_point"
                  defaultValue={editingProduct.reorder_point}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Location / Storage
                </label>
                <input
                  type="text"
                  name="location"
                  defaultValue={editingProduct.location}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Material
                </label>
                <input
                  type="text"
                  name="material"
                  defaultValue={editingProduct.material}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Origin
                </label>
                <input
                  type="text"
                  name="origin"
                  defaultValue={editingProduct.origin}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Weight
                </label>
                <input
                  type="text"
                  name="weight"
                  defaultValue={editingProduct.weight}
                  placeholder="e.g. 300g"
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Care Instructions
                </label>
                <input
                  type="text"
                  name="care"
                  defaultValue={editingProduct.care}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Warranty
                </label>
                <input
                  type="text"
                  name="warranty"
                  defaultValue={editingProduct.warranty}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Marketing */}
              <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                <p className="text-sm font-semibold text-slate-700">
                  💝 Marketing &amp; Selling
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  USP / Unique Selling Proposition
                </label>
                <input
                  type="text"
                  name="usp"
                  defaultValue={editingProduct.usp}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Target Audience
                </label>
                <input
                  type="text"
                  name="target_audience"
                  defaultValue={editingProduct.target_audience}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Season
                </label>
                <select
                  name="season"
                  defaultValue={editingProduct.season || "All"}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="All">All</option>
                  <option value="Summer">Summer</option>
                  <option value="Winter">Winter</option>
                  <option value="Ramadan">Ramadan</option>
                  <option value="Eid">Eid</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Occasion
                </label>
                <input
                  type="text"
                  name="occasion"
                  defaultValue={editingProduct.occasion}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* AI & Keywords */}
              <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                <p className="text-sm font-semibold text-slate-700">
                  🤖 AI Model &amp; Keyword List
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  🤖 AI Model
                </label>
                <select
                  name="webhook_model_id"
                  defaultValue={editingProduct.webhook_model_id || ""}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select an AI model...</option>
                  {webhooks.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                      {w.description ? ` — ${w.description}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  🔑 Keyword List
                </label>
                <select
                  name="keyword_list_id"
                  defaultValue={editingProduct.keyword_list_id || ""}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select a keyword list...</option>
                  {keywordLists.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                      {k.dialect ? ` — ${k.dialect}` : ""}
                      {k.stats?.total_keywords
                        ? ` (${k.stats.total_keywords} keywords)`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-end justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {isEditing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation Modal ===== */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeletingProduct(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              🗑️ Delete Product
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold">{deletingProduct.name}</span>?
              This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeletingProduct(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-lg bg-linear-to-r from-rose-600 to-red-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== View Messages Modal ===== */}
      {viewingMessages && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setViewingMessages(null)}
          />
          <div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  💬 Messages for {viewingMessages.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {messages.length} message(s)
                </p>
              </div>
              <button
                onClick={() => setViewingMessages(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingMessages ? (
                <div className="flex justify-center py-10">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                </div>
              ) : messages.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  No messages yet for this product.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">
                          {m.sender_id}
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              m.status === "completed"
                                ? "bg-emerald-100 text-emerald-700"
                                : m.status === "failed"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {m.status}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              m.mode === "test"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {m.mode}
                          </span>
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-slate-800">{m.message}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {new Date(m.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
