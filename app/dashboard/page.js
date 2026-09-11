// app/dashboard/page.js
// ============================================================
// 🖥️  PRODUCTION-READY TRADING-TERMINAL DASHBOARD
//     Inspired by Bloomberg Terminal / TradingView / thinkorswim
//     Multi-pane, data-dense, keyboard-first, real-time.
// ============================================================
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useProtectPage } from "@/lib/auth/auth";
import {
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/actions/product-actions";

// ============================================================
// ⏱️  HELPERS
// ============================================================
// Format a number with thousands separators (terminal style).
function fmt(n) {
  if (n === null || n === undefined) return "0";
  return Number(n).toLocaleString("en-US");
}

// Compact time (HH:MM:SS) for the ticker.
function clockTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "--:--:--";
  }
}

// ============================================================
// 📊 SVG CHART COMPONENTS (zero dependencies)
// ============================================================

// Animated SVG bar chart with rounded bars, hover tooltip and gradient.
function BarChart({ data, height = 200 }) {
  const max = Math.max(...data.map((p) => p.count), 1);
  const chartW = 600;
  const chartH = height;
  const padB = 28; // label space at bottom
  const padT = 10;
  const innerH = chartH - padB - padT;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="h-52 w-full overflow-visible"
        preserveAspectRatio="none"
      >
        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1="0"
            x2={chartW}
            y1={padT + innerH * (1 - f)}
            y2={padT + innerH * (1 - f)}
            stroke="#1f2937"
            strokeWidth="1"
            strokeDasharray={f === 1 ? "" : "4 4"}
          />
        ))}

        {data.map((point, i) => {
          const barW = chartW / data.length;
          const barX = i * barW + barW * 0.18;
          const barWid = barW * 0.64;
          const h = (point.count / max) * innerH;
          const y = padT + innerH - h;
          return (
            <g key={i}>
              <rect
                x={barX}
                y={padT}
                width={barWid}
                height={innerH}
                fill="transparent"
              >
                <title>{`${point.label}: ${point.count}`}</title>
              </rect>
              <rect
                x={barX}
                y={y}
                width={barWid}
                height={h}
                rx={4}
                fill={`url(#barGrad${i % 2})`}
                className="transition-all duration-500"
                style={{
                  animation: "growUp 0.6s ease-out both",
                  transformOrigin: "bottom",
                }}
              />
              <text
                x={barX + barWid / 2}
                y={chartH - 8}
                textAnchor="middle"
                fontSize="9"
                fill="#64748b"
              >
                {point.label}
              </text>
            </g>
          );
        })}
        <defs>
          <linearGradient id="barGrad0" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Compact stat card with gradient icon + trend sparkline.
function StatCard({ label, value, sub, icon, grad, spark }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0d1117] p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-white">
            {value}
          </p>
          {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br ${grad} text-xl text-white shadow-md transition-transform duration-300 group-hover:scale-110`}
        >
          {icon}
        </div>
      </div>
      {spark && (
        <div className="mt-3 h-9 w-full opacity-40 transition-opacity group-hover:opacity-100">
          <Sparkline data={spark} color={sparkColor(grad)} />
        </div>
      )}
    </div>
  );
}

function sparkColor(grad) {
  if (grad.includes("emerald")) return "#10b981";
  if (grad.includes("amber")) return "#f59e0b";
  if (grad.includes("purple")) return "#a855f7";
  return "#6366f1";
}

// Tiny inline sparkline.
function Sparkline({ data, color = "#6366f1" }) {
  if (!data || data.length === 0) return null;
  const w = 200;
  const h = 40;
  const max = Math.max(...data, 1);
  const step = w / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => `${i * step},${h - (v / max) * (h - 4) - 2}`);
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-full w-full"
      preserveAspectRatio="none"
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.length > 0 && (
        <line
          x1="0"
          y1={h - (data[data.length - 1] / max) * (h - 4) - 2}
          x2={w}
          y2={h - (data[data.length - 1] / max) * (h - 4) - 2}
          stroke={color}
          strokeWidth="1"
          strokeDasharray="3 3"
          opacity="0.4"
        />
      )}
    </svg>
  );
}

// ============================================================
// 🖥️  MAIN DASHBOARD
// ============================================================
export default function DashboardPage() {
  const { user, loading } = useProtectPage();
  const router = useRouter();

  // ---- Core data state ----
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [showUserInfo, setShowUserInfo] = useState(false);

  // ---- Set-password state (profile modal) ----
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [localHasPassword, setLocalHasPassword] = useState(false);

  // ---- Edit / Delete / Messages state ----
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewingMessages, setViewingMessages] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [testingId, setTestingId] = useState(null);

  // ---- Navigation & Analytics state ----
  const [activeView, setActiveView] = useState("dashboard");
  const [analyticsPeriod, setAnalyticsPeriod] = useState("week");
  const [analyticsProduct, setAnalyticsProduct] = useState("");
  const [analytics, setAnalytics] = useState(null);

  // ---- Webhook models (AI models) for product creation ----
  const [webhooks, setWebhooks] = useState([]);

  // ---- Keyword lists (Google Sheets) for product creation ----
  const [keywordLists, setKeywordLists] = useState([]);

  // ---- Live countdown state: ticks every second ----
  const [now, setNow] = useState(() => Date.now());

  // ---- Terminal extras ----
  const [showHelp, setShowHelp] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSync, setLastSync] = useState(null);

  const getToken = () => localStorage.getItem("accessToken");

  // Show a success message that auto-dismisses after 3 seconds.
  const messageTimer = useRef(null);
  const showMessage = useCallback((msg) => {
    setMessage(msg);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(""), 3000);
  }, []);

  // ✅ Tick `now` every second to drive the live countdown.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ Clear the auto-dismiss timer on unmount.
  useEffect(() => {
    return () => {
      if (messageTimer.current) clearTimeout(messageTimer.current);
    };
  }, []);

  // Fetch available webhook models
  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/webhooks", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setWebhooks(data.webhooks);
    } catch {
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
    } catch {
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
  // Fetch products. Pass silent=true for background polling so the
  // loading spinner only shows on the initial load, not every refresh.
  const fetchProducts = useCallback(async (silent = false) => {
    if (!silent) setLoadingProducts(true);
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
    } catch {
      setError("Failed to fetch products");
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchProducts();
  }, [user, fetchProducts]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
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
    } catch {
      setError("Failed to load analytics");
    }
  }, [analyticsPeriod, analyticsProduct]);

  useEffect(() => {
    if (user && activeView === "dashboard") {
      fetchAnalytics();
    }
  }, [user, activeView, fetchAnalytics]);

  // ============================================================
  // 🔄 REAL-TIME DATA REFRESH (no page reload needed)
  //     Polls products + analytics every 10s so the dashboard
  //     always shows live data (webhook calls, today's counts,
  //     success rate, trend chart) without refreshing the page.
  // ============================================================
  useEffect(() => {
    if (!user) return;
    const refresh = () => {
      fetchProducts(true); // silent — no spinner flash on background refresh
      if (activeView === "dashboard") fetchAnalytics();
      setLastSync(new Date());
    };
    refresh(); // immediate first refresh
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [user, activeView, fetchProducts, fetchAnalytics]);

  // ============================================================
  // ⌨️  KEYBOARD SHORTCUTS (terminal-first)
  //     1 → Dashboard   2 → Products   3 → Messages
  //     n → New product  ? → Help       Esc → Close modals
  //     r → Refresh data
  // ============================================================
  useEffect(() => {
    if (!user) return;
    const onKey = (e) => {
      // Ignore when typing in an input/textarea/select
      const tag = (e.target.tagName || "").toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        e.target.isContentEditable
      ) {
        return;
      }
      switch (e.key) {
        case "1":
          setActiveView("dashboard");
          break;
        case "2":
          setActiveView("products");
          break;
        case "3":
          router.push("/dashboard/messages");
          break;
        case "4":
          router.push("/dashboard/messages/all");
          break;
        case "n":
        case "N":
          setWaitTimeEnabled(true);
          setShowCreateForm(true);
          break;
        case "?":
          setShowHelp((v) => !v);
          break;
        case "r":
        case "R":
          fetchProducts();
          fetchAnalytics();
          setLastSync(new Date());
          break;
        case "Escape":
          setShowHelp(false);
          setEditingProduct(null);
          setDeletingProduct(null);
          setViewingMessages(null);
          setShowUserInfo(false);
          setShowCreateForm(false);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [user, router, fetchProducts, fetchAnalytics]);

  // Create product
  async function handleCreate(formData) {
    setIsCreating(true);
    setMessage("");
    setError("");

    formData.append("userId", user.id);
    const result = await createProduct(formData);

    if (result.success) {
      showMessage("✅ Product created successfully!");
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
    } catch {
      setError("Failed to copy");
    }
  };

  // Set / change password from the profile modal.
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setPwMsg("");
    setPwError("");

    if (pw1.length < 10 || !/[A-Z]/.test(pw1) || !/[0-9]/.test(pw1)) {
      setPwError(
        "Le mot de passe doit contenir au moins 10 caractères, une majuscule et un chiffre.",
      );
      return;
    }
    if (pw1 !== pw2) {
      setPwError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ password: pw1 }),
      });
      const data = await res.json();
      if (data.success) {
        setPwMsg("Mot de passe enregistré avec succès.");
        setPw1("");
        setPw2("");
        setLocalHasPassword(true);
      } else {
        setPwError(data.message || "Échec de l'enregistrement.");
      }
    } catch {
      setPwError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setPwSaving(false);
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
    } catch {
      setError("Failed to toggle mode");
    } finally {
      setTogglingId(null);
    }
  };

  // Toggle webhook on/off
  const toggleEnabled = async (productId, currentEnabled) => {
    setTogglingId(productId);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          productId,
          enabled: !currentEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showMessage(
          data.product.enabled ? "✅ Webhook enabled" : "⏸️ Webhook disabled",
        );
        fetchProducts();
      } else {
        setError(data.error || "Failed to toggle webhook");
      }
    } catch {
      setError("Failed to toggle webhook");
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
      showMessage("✅ Product updated successfully!");
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
      showMessage("🗑️ Product deleted successfully!");
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
    } catch {
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
        showMessage("🧪 Test message sent successfully!");
      } else {
        setError(data.error || "Failed to send test message");
      }
    } catch {
      setError("Failed to send test message");
    } finally {
      setTestingId(null);
    }
  };

  // Logout
  const handleLogout = () => {
    if (user && user.hasPassword === false && !localHasPassword) {
      setShowUserInfo(true);
      setPwMsg(
        "Vous devez d'abord définir un mot de passe avant de pouvoir vous déconnecter.",
      );
      return;
    }
    localStorage.removeItem("accessToken");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0e14]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  // ============================================================
  // 📊 DERIVED STATS (at-a-glance summary)
  // ============================================================
  const totalProducts = products.length;
  const activeProducts = products.filter((p) => p.enabled !== false).length;
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
  const totalMessagesToday = products.reduce(
    (sum, p) => sum + (p.test_calls_today || 0) + (p.prod_calls_today || 0),
    0,
  );

  // Filter products by search query (terminal search bar)
  const q = searchQuery.trim().toLowerCase();
  const filteredProducts = q
    ? products.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q) ||
          (p.api_key || "").toLowerCase().includes(q),
      )
    : products;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "📊", key: "1" },
    { id: "products", label: "Products", icon: "📦", key: "2" },
    {
      id: "messages",
      label: "Messages",
      icon: "💬",
      key: "3",
      href: "/dashboard/messages",
    },
    {
      id: "all-messages",
      label: "All Messages",
      icon: "📚",
      key: "4",
      href: "/dashboard/messages/all",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-200">
      {/* ============================================================
          TOP COMMAND BAR (terminal-style single line)
      ============================================================ */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0d1117]/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
          {/* Logo / ticker symbol */}
          <div className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-linear-to-br from-emerald-500 to-teal-500 text-base text-white shadow-lg shadow-emerald-500/20">
              📊
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide text-white">
                CONTROL<span className="text-emerald-400">TERM</span>
              </p>
              <p className="text-[10px] font-mono text-slate-500">
                {user.name}@{user.role}
              </p>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.href) router.push(tab.href);
                  else setActiveView(tab.id);
                }}
                className={`relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeView === tab.id && !tab.href
                    ? "bg-emerald-500/15 text-emerald-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <span className="mr-1">{tab.icon}</span>
                {tab.label}
                <kbd className="ml-1 rounded border border-slate-700 bg-slate-800/60 px-1 text-[9px] font-mono text-slate-500">
                  {tab.key}
                </kbd>
              </button>
            ))}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Live clock */}
            <div className="hidden font-mono text-xs text-emerald-400 lg:block">
              {clockTime(now)}
            </div>

            {(user.role === "admin" || user.role === "super_admin") && (
              <button
                onClick={() => router.push("/admin")}
                className="rounded-lg bg-linear-to-r from-purple-600 to-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-md shadow-purple-600/20 transition-all hover:shadow-lg"
              >
                🛡️ <span className="hidden lg:inline">Admin</span>
              </button>
            )}

            <button
              onClick={() => setShowHelp(true)}
              className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-800"
              title="Keyboard shortcuts (?)"
            >
              ⌨️ <span className="hidden lg:inline">Help</span>
            </button>

            <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-slate-700 bg-[#0d1117] py-1 pl-1 pr-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-emerald-500 to-teal-500 text-xs font-semibold text-white">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-sm font-medium text-slate-200 md:block">
                {user.name}
              </span>
            </div>

            <button
              onClick={() => setShowUserInfo(true)}
              className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              👤
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
            >
              ⏻
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {/* ===== Status / toast messages ===== */}
        {message && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {message}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* ============================================================
            📊 AT-A-GLANCE SUMMARY TICKER (top row)
        ============================================================ */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Products"
            value={fmt(totalProducts)}
            icon="📦"
            grad="from-emerald-500 to-teal-600"
            sub={`${activeProducts} active`}
            spark={analytics?.timeSeries?.map((p) => p.count)}
          />
          <StatCard
            label="Total Calls"
            value={fmt(totalWebhookCalls)}
            icon="🔗"
            grad="from-emerald-500 to-green-600"
            sub={`${fmt(totalProdCalls)} prod · ${fmt(totalTestCalls)} test`}
            spark={analytics?.timeSeries?.map((p) => p.count)}
          />
          <StatCard
            label="Today"
            value={fmt(totalMessagesToday)}
            icon="📈"
            grad="from-amber-500 to-yellow-600"
            sub="messages received"
            spark={analytics?.timeSeries?.map((p) => p.count)}
          />
          <StatCard
            label="Success Rate"
            value={`${analytics?.successRate ?? 100}%`}
            icon="✅"
            grad="from-emerald-500 to-green-600"
            sub={`${analytics?.completed ?? 0} ok · ${analytics?.failed ?? 0} fail`}
            spark={analytics?.timeSeries?.map((p) => p.count)}
          />
          <StatCard
            label="Prod Calls"
            value={fmt(totalProdCalls)}
            icon="🚀"
            grad="from-emerald-600 to-teal-700"
            sub={`${fmt(totalTestCalls)} test`}
            spark={analytics?.timeSeries?.map((p) => p.count)}
          />
        </div>

        {/* ============================================================
            🧭 INSIGHT NAVIGATOR (dashboard view)
        ============================================================ */}
        {activeView === "dashboard" && (
          <div className="mb-6 rounded-2xl border border-slate-800 bg-[#0d1117] p-6 shadow-xl">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  🧭 Insight Navigator
                </h2>
                <p className="text-sm text-slate-400">
                  Real-time performance overview
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Period selector */}
                <div className="flex rounded-lg border border-slate-700 bg-slate-800/50 p-0.5">
                  {["day", "week", "month"].map((p) => (
                    <button
                      key={p}
                      onClick={() => setAnalyticsPeriod(p)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                        analyticsPeriod === p
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "text-slate-400 hover:bg-slate-700"
                      }`}
                    >
                      {p === "day" ? "1D" : p === "week" ? "1W" : "1M"}
                    </button>
                  ))}
                </div>
                {/* Product filter */}
                <select
                  value={analyticsProduct}
                  onChange={(e) => setAnalyticsProduct(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                >
                  <option value="">All products</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                  {analytics?.period === "day"
                    ? "Today"
                    : analytics?.period === "month"
                      ? "This month"
                      : "This week"}
                </span>
              </div>
            </div>

            {/* Mini trend + top product (multi-pane) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-[#11151d] p-4 lg:col-span-2">
                <p className="mb-3 text-sm font-semibold text-slate-200">
                  📈 Message Trend
                </p>
                {analytics?.timeSeries && analytics.timeSeries.length > 0 ? (
                  <BarChart data={analytics.timeSeries} height={160} />
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No data for this period yet.
                  </p>
                )}
              </div>

              {/* Top product */}
              <div className="rounded-2xl border border-slate-800 bg-[#11151d] p-4">
                <p className="mb-3 text-sm font-semibold text-slate-200">
                  🏆 Top Product
                </p>
                {analytics?.products && analytics.products.length > 0 ? (
                  (() => {
                    const top = [...analytics.products].sort(
                      (a, b) => b.count - a.count,
                    )[0];
                    return (
                      <div className="flex flex-col items-center justify-center py-4 text-center">
                        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-500 to-teal-600 text-3xl text-white shadow-lg shadow-emerald-500/30">
                          📦
                        </div>
                        <p className="text-lg font-bold text-white">
                          {top.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {top.count} messages
                        </p>
                        <div className="mt-3 flex gap-2">
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                            🧪 {top.test} test
                          </span>
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                            🚀 {top.prod} prod
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No products yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            📦 PRODUCTS VIEW (data-dense table + cards)
        ============================================================ */}
        {(activeView === "dashboard" || activeView === "products") && (
          <>
            {/* Products header + search + new */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">
                  📦 Product Terminal
                </h2>
                <p className="text-sm text-slate-400">
                  {filteredProducts.length} of {products.length} products
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Terminal search bar */}
                <div className="relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500">
                    🔍
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="w-52 rounded-lg border border-slate-700 bg-slate-800 py-2 pl-8 pr-3 text-sm text-white placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="rounded-lg bg-linear-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg"
                >
                  {showCreateForm ? "✕ Cancel" : "+ New Product"}
                </button>
              </div>
            </div>

            {/* Create form */}
            {showCreateForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                  className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                  onClick={() => setShowCreateForm(false)}
                />
                <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
                  <h3 className="text-lg font-bold text-slate-900">
                    ➕ Create New Product
                  </h3>
                  <form
                    action={handleCreate}
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
                        Compare Price (optional)
                      </label>
                      <input
                        type="number"
                        name="compare_price"
                        placeholder="e.g. 1800"
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
                        Arabic Description
                      </label>
                      <input
                        type="text"
                        name="description_ar"
                        placeholder="الوصف بالعربية"
                        dir="rtl"
                        className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Status
                      </label>
                      <select
                        name="status"
                        defaultValue="Active"
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
                        defaultValue=""
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
                        placeholder="الاسم بالعربية"
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
                        placeholder="Nom en français"
                        className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    {/* Stock */}
                    <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                      <p className="text-sm font-semibold text-slate-700">
                        📦 Stock
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Stock Status
                      </label>
                      <select
                        name="stock_status"
                        defaultValue="High"
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
                        defaultValue="1"
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
                        placeholder="e.g. SKU-001"
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
                        placeholder="e.g. 123456789012"
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
                        placeholder="Supplier name"
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
                        placeholder="e.g. 5"
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
                        placeholder="e.g. Warehouse A"
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
                        placeholder="e.g. Cotton"
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
                        placeholder="e.g. Algeria"
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
                        placeholder="e.g. Machine wash"
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
                        placeholder="e.g. 1 year"
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
                        placeholder="e.g. Premium quality"
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
                        placeholder="e.g. Women 18-35"
                        className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        Season
                      </label>
                      <select
                        name="season"
                        defaultValue="All"
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
                        placeholder="e.g. Eid"
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
                        defaultValue=""
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
                        🔑 Keyword List
                      </label>
                      <select
                        name="keyword_list_id"
                        defaultValue=""
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
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-slate-700">
                        🔐 Messenger Access Token
                      </label>
                      <input
                        type="password"
                        name="access_token"
                        placeholder="Paste the page access token here..."
                        className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                      <p className="text-[11px] text-slate-400">
                        Each page has its own access token. Passed to the n8n
                        webhook so the AI agent can reply on behalf of this
                        page.
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-end justify-end gap-3 sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating}
                        className="rounded-lg bg-linear-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg disabled:opacity-50"
                      >
                        {isCreating ? "Creating..." : "Create Product"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Product list */}
            {loadingProducts ? (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-[#0d1117] px-6 py-16 text-center">
                <div className="text-5xl">📭</div>
                <h3 className="mt-4 text-lg font-semibold text-white">
                  {q ? "No matching products" : "No products yet"}
                </h3>
                <p className="mt-2 max-w-sm text-sm text-slate-400">
                  {q
                    ? `No products match "${searchQuery}".`
                    : "Create your first product to get a webhook URL and start receiving messages."}
                </p>
                {!q && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="mt-6 rounded-lg bg-linear-to-r from-emerald-600 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md"
                  >
                    + Create Product
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {filteredProducts.map((product) => {
                  const isProd = product.mode !== "test";
                  const webhookUrl = `${window.location.origin}/api/webhook/${product.api_key}`;
                  const testWebhookUrl = `${window.location.origin}/api/webhook/test/${product.api_key}`;
                  const activeUrl = isProd ? webhookUrl : testWebhookUrl;

                  return (
                    <div
                      key={product._id}
                      className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0d1117] shadow-sm transition-all hover:border-emerald-500/40 hover:shadow-lg"
                    >
                      {/* Card header */}
                      <div className="flex items-start justify-between border-b border-slate-800 bg-linear-to-r from-[#11151d] to-[#0d1117] px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-bold text-white">
                              {product.name}
                            </h3>
                          </div>
                          <p className="mt-0.5 text-sm text-slate-400">
                            {product.description || "No description"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {product.category && (
                              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                {product.category}
                              </span>
                            )}
                            {product.subcategory && (
                              <span className="rounded-full bg-teal-500/15 px-2 py-0.5 text-xs font-medium text-teal-400">
                                {product.subcategory}
                              </span>
                            )}
                            {product.stock_status && (
                              <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-slate-300">
                                Stock: {product.stock_status}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Mode toggle */}
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">
                              Webhook
                            </span>
                            <button
                              onClick={() =>
                                toggleEnabled(
                                  product._id,
                                  product.enabled !== false,
                                )
                              }
                              disabled={togglingId === product._id}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                product.enabled !== false
                                  ? "bg-indigo-500"
                                  : "bg-slate-300"
                              } disabled:opacity-50`}
                              aria-label="Toggle webhook"
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                  product.enabled !== false
                                    ? "translate-x-6"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                          <button
                            onClick={() =>
                              toggleMode(product._id, product.mode)
                            }
                            disabled={
                              togglingId === product._id ||
                              product.enabled === false
                            }
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
                                ? "bg-emerald-500/15 text-emerald-400"
                                : "bg-amber-500/15 text-amber-400"
                            }`}
                          >
                            {isProd ? "🚀 Production" : "🧪 Test"}
                          </span>
                          {product.enabled === false && (
                            <span className="rounded-full bg-slate-700/50 px-2 py-0.5 text-xs font-semibold text-slate-300">
                              ⏸️ Webhook Off
                            </span>
                          )}
                          {!isProd && (
                            <span className="text-[10px] text-slate-400">
                              Test limit {product.test_calls_today || 0}/
                              {product.test_calls_limit || 25} today
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="flex-1 px-6 py-4">
                        <div className="mb-4 flex items-center gap-6">
                          <div>
                            <p className="text-xs text-slate-400">Price</p>
                            <p className="text-xl font-bold text-emerald-400">
                              {product.price} DZD
                            </p>
                          </div>
                          {product.compare_price && (
                            <div>
                              <p className="text-xs text-slate-400">Compare</p>
                              <p className="text-lg font-semibold text-slate-500 line-through">
                                {product.compare_price} DZD
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-slate-400">Stock</p>
                            <p className="text-xl font-bold text-white">
                              {product.quantity}
                            </p>
                          </div>
                        </div>

                        {(product.name_ar || product.name_fr) && (
                          <div className="mb-4 rounded-lg bg-slate-800/50 p-3">
                            {product.name_ar && (
                              <p className="text-sm text-slate-200" dir="rtl">
                                {product.name_ar}
                              </p>
                            )}
                            {product.name_fr && (
                              <p className="text-sm text-slate-200">
                                {product.name_fr}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Webhook URL */}
                        <div className="mb-4">
                          <p className="mb-1.5 text-xs font-medium text-slate-400">
                            {isProd
                              ? "🔗 Production Webhook URL"
                              : "🧪 Test Webhook URL"}
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 truncate rounded-lg bg-slate-800 px-3 py-2 text-xs text-emerald-400">
                              {activeUrl}
                            </code>
                            <button
                              onClick={() =>
                                copyToClipboard(activeUrl, product._id)
                              }
                              className="shrink-0 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
                            >
                              {copiedId === product._id
                                ? "✅ Copied"
                                : "📋 Copy"}
                            </button>
                          </div>
                        </div>

                        {/* Call stats */}
                        <div className="grid grid-cols-1 gap-3">
                          <div className="rounded-lg bg-amber-500/10 p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-amber-400">
                                🧪 Test Messages
                              </p>
                              <p className="text-xs font-semibold text-amber-400">
                                {product.test_calls_today || 0} /{" "}
                                {product.test_calls_limit || 25} today
                              </p>
                            </div>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-amber-500/20">
                              <div
                                className={`h-full rounded-full ${
                                  (product.test_calls_today || 0) >=
                                  (product.test_calls_limit || 25)
                                    ? "bg-red-500"
                                    : "bg-amber-500"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    ((product.test_calls_today || 0) /
                                      (product.test_calls_limit || 25)) *
                                      100,
                                  )}%`,
                                }}
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-amber-500">
                              {product.webhook_calls_test || 0} total test calls
                            </p>
                          </div>
                          <div className="rounded-lg bg-emerald-500/10 p-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-medium text-emerald-400">
                                🚀 Production Messages
                              </p>
                              <p className="text-xs font-semibold text-emerald-400">
                                {product.prod_calls_today || 0} /{" "}
                                {user.role === "super_admin"
                                  ? "Unlimited"
                                  : product.prod_calls_limit || 10000}{" "}
                                today
                              </p>
                            </div>
                            <p className="mt-1 text-2xl font-bold text-emerald-400">
                              {product.webhook_calls_prod || 0}
                            </p>
                            {user.role !== "super_admin" && (
                              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/20">
                                <div
                                  className={`h-full rounded-full ${
                                    (product.prod_calls_today || 0) >=
                                    (product.prod_calls_limit || 10000)
                                      ? "bg-red-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      ((product.prod_calls_today || 0) /
                                        (product.prod_calls_limit || 10000)) *
                                        100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            )}
                            <p className="mt-1 text-[11px] text-emerald-500/80">
                              total production calls (all time)
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Card footer */}
                      <div className="border-t border-slate-800 px-6 py-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            Created:{" "}
                            {new Date(product.created_at).toLocaleDateString()}
                          </span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400">
                            API: {product.api_key?.slice(0, 12)}...
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              router.push(`/products/${product._id}`)
                            }
                            className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/25"
                          >
                            📊 Details
                          </button>
                          <button
                            onClick={() => viewMessages(product)}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
                          >
                            💬 Messages ({product.webhook_calls || 0})
                          </button>
                          <button
                            onClick={() => sendTestMessage(product)}
                            disabled={testingId === product._id}
                            className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/25 disabled:opacity-50"
                          >
                            {testingId === product._id
                              ? "Sending..."
                              : "🧪 Test"}
                          </button>
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => setDeletingProduct(product)}
                            className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/25"
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

      {/* ============================================================
          STATUS BAR (terminal bottom)
      ============================================================ */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800 bg-[#0d1117]/95 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-1.5 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              DB CONNECTED
            </span>
            <span className="text-slate-600">|</span>
            <span>
              {products.length} PROD · {totalWebhookCalls} CALLS ·{" "}
              {totalMessagesToday} TODAY
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-600">
              SYNC {lastSync ? clockTime(lastSync) : "--:--:--"}
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400">● LIVE</span>
          </div>
        </div>
      </footer>

      {/* ============================================================
          ⌨️  KEYBOARD SHORTCUTS HELP MODAL
      ============================================================ */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-[#0d1117] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-linear-to-r from-emerald-600 to-teal-600 px-6 py-4">
              <h3 className="text-lg font-bold text-white">
                ⌨️ Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/20"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2.5 px-6 py-5">
              {[
                ["1", "Dashboard view"],
                ["2", "Products view"],
                ["3", "Messages page"],
                ["4", "All Messages page"],
                ["n", "New product"],
                ["r", "Refresh data"],
                ["?", "Toggle this help"],
                ["Esc", "Close modals"],
              ].map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2"
                >
                  <span className="text-sm text-slate-300">{desc}</span>
                  <kbd className="rounded border border-slate-600 bg-slate-700 px-2 py-0.5 text-xs font-mono text-emerald-300">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          👤 USER INFO MODAL
      ============================================================ */}
      {showUserInfo && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUserInfo(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-6 py-6 text-white">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{user.name}</h3>
                  <p className="text-sm text-indigo-100">{user.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  👤 Full Name
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {user.name}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">📧 Email</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {user.email}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">🎖️ Role</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                    {user.role}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">💎 Plan</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                    {user.plan || "Basic"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    📅 Member Since
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">
                  🔑 Your Verify Token
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 truncate rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700">
                    {user.verifyToken || "Generating..."}
                  </code>
                  {user.verifyToken && (
                    <button
                      onClick={() => copyToClipboard(user.verifyToken, "info")}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      {copiedId === "info" ? "✅" : "📋"}
                    </button>
                  )}
                </div>
              </div>

              {/* Set / Change Password */}
              <form
                onSubmit={handleSetPassword}
                className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4"
              >
                <p className="text-xs font-medium text-indigo-600">
                  🔒 Définir / Modifier le mot de passe
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Ajoutez un mot de passe pour vous connecter par email en plus
                  de Google.
                </p>

                {pwMsg && (
                  <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-600">
                    {pwMsg}
                  </p>
                )}
                {pwError && (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {pwError}
                  </p>
                )}

                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      value={pw1}
                      onChange={(e) => setPw1(e.target.value)}
                      placeholder="Au moins 10 caractères"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600">
                      Confirmer le mot de passe
                    </label>
                    <input
                      type="password"
                      value={pw2}
                      onChange={(e) => setPw2(e.target.value)}
                      placeholder="Confirmez le mot de passe"
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={pwSaving}
                    className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {pwSaving
                      ? "Enregistrement..."
                      : "Enregistrer le mot de passe"}
                  </button>
                </div>
              </form>
            </div>

            <div className="border-t border-slate-100 px-6 py-4">
              <button
                onClick={() => setShowUserInfo(false)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          ✏️ EDIT PRODUCT MODAL
      ============================================================ */}
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
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  🔐 Messenger Access Token
                </label>
                <input
                  type="password"
                  name="access_token"
                  defaultValue={editingProduct.access_token || ""}
                  placeholder="Paste the page access token here..."
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <p className="text-[11px] text-slate-400">
                  Each page has its own access token. It is passed to the n8n
                  webhook so the AI agent can reply on behalf of this page.
                </p>
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

      {/* ============================================================
          🗑️ DELETE CONFIRMATION MODAL
      ============================================================ */}
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

      {/* ============================================================
          💬 VIEW MESSAGES MODAL
      ============================================================ */}
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
