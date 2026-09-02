// app/products/[id]/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProtectPage } from "@/lib/auth/auth";
import { updateProduct, deleteProduct } from "@/lib/actions/product-actions";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;
  const { user, loading } = useProtectPage();

  const [product, setProduct] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState("");
  const [testing, setTesting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // AI models & keyword lists for the edit modal
  const [webhooks, setWebhooks] = useState([]);
  const [keywordLists, setKeywordLists] = useState([]);
  const [selectedWebhook, setSelectedWebhook] = useState("");
  const [selectedKeywordList, setSelectedKeywordList] = useState("");

  const getToken = () => localStorage.getItem("accessToken");

  // Fetch available AI models (webhook models)
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

  const fetchProduct = useCallback(async () => {
    setLoadingProduct(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setProduct(data.product);
        setMessages(data.messages || []);
      } else {
        setError(data.error || "Failed to load product");
      }
    } catch (err) {
      setError("Failed to load product");
    } finally {
      setLoadingProduct(false);
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      fetchProduct();
      fetchWebhooks();
      fetchKeywordLists();
    }
  }, [user, fetchProduct, fetchWebhooks, fetchKeywordLists]);

  // When the product loads, sync the selected dropdown values
  useEffect(() => {
    if (product) {
      setSelectedWebhook(product.webhook_model_id || "");
      setSelectedKeywordList(product.keyword_list_id || "");
    }
  }, [product]);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      setError("Failed to copy");
    }
  };

  const sendTestMessage = async () => {
    setTesting(true);
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
        setTimeout(() => fetchProduct(), 3000);
      } else {
        setError(data.error || "Failed to send test message");
      }
    } catch (err) {
      setError("Failed to send test message");
    } finally {
      setTesting(false);
    }
  };

  const handleEdit = async (formData) => {
    setIsEditing(true);
    setError("");
    setMessage("");
    const result = await updateProduct(id, formData);
    if (result.success) {
      setMessage("✅ Product updated successfully!");
      setEditing(false);
      fetchProduct();
    } else {
      setError(result.error || "Failed to update product");
    }
    setIsEditing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    const result = await deleteProduct(id);
    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error || "Failed to delete product");
    }
    setDeleting(false);
  };

  if (loading || loadingProduct) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-4xl">📦</p>
          <p className="mt-4 text-lg font-semibold text-slate-900">
            Product not found
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isProd = product.mode !== "test";
  const webhookUrl = `${window.location.origin}/api/webhook/${product.api_key}`;
  const testWebhookUrl = `${window.location.origin}/api/webhook/test/${product.api_key}`;
  const stats = product.stats || {};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              ← Back
            </button>
            <div>
              <p className="text-base font-bold text-slate-900">
                📦 Product Details
              </p>
              <p className="text-xs text-slate-500">{product.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              ✏️ Edit
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "🗑️ Delete"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* Product title */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {product.name}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {product.description || "No description"}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              isProd
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isProd ? "🚀 Production" : "🧪 Test"}
          </span>
        </div>

        {/* Product Information */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            ℹ️ Product Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">💰 Price</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {product.price} DZD
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">📦 Quantity</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {product.quantity}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">⏰ Waiting Time</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {product.waiting_time || 7}s
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">📝 Description</p>
              <p className="mt-1 text-sm text-slate-700">
                {product.description || "—"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">🤖 AI Model</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {product.webhookModelName || "Not selected"}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">🔑 Keyword List</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {product.keywordListName || "Not selected"}
              </p>
            </div>
          </div>

          {/* API Key & Webhooks */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <p className="w-32 shrink-0 text-sm font-medium text-slate-600">
                🔑 API Key
              </p>
              <code className="flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                {product.api_key}
              </code>
              <button
                onClick={() => copyToClipboard(product.api_key, "api")}
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {copied === "api" ? "✅ Copied" : "📋 Copy"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <p className="w-32 shrink-0 text-sm font-medium text-slate-600">
                🔗 Webhook
              </p>
              <code className="flex-1 truncate rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                {webhookUrl}
              </code>
              <button
                onClick={() => copyToClipboard(webhookUrl, "webhook")}
                className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                {copied === "webhook" ? "✅ Copied" : "📋 Copy"}
              </button>
            </div>
          </div>
        </div>

        {/* Usage Statistics */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            📊 Usage Statistics
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-xl bg-linear-to-br from-indigo-50 to-blue-50 p-4 text-center">
              <p className="text-3xl font-bold text-indigo-700">
                {stats.totalMessages || 0}
              </p>
              <p className="mt-1 text-xs text-indigo-600">Total Messages</p>
            </div>
            <div className="rounded-xl bg-linear-to-br from-emerald-50 to-green-50 p-4 text-center">
              <p className="text-3xl font-bold text-emerald-700">
                {stats.successRate ?? 100}%
              </p>
              <p className="mt-1 text-xs text-emerald-600">Success Rate</p>
            </div>
            <div className="rounded-xl bg-linear-to-br from-amber-50 to-yellow-50 p-4 text-center">
              <p className="text-3xl font-bold text-amber-700">
                {stats.avgResponseTime || 5}s
              </p>
              <p className="mt-1 text-xs text-amber-600">Avg Response Time</p>
            </div>
            <div className="rounded-xl bg-linear-to-br from-purple-50 to-fuchsia-50 p-4 text-center">
              <p className="text-3xl font-bold text-purple-700">
                {stats.testCount || 0} / {stats.prodCount || 0}
              </p>
              <p className="mt-1 text-xs text-purple-600">Test / Prod</p>
            </div>
          </div>
        </div>

        {/* Recent Messages */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              💬 Recent Messages
            </h2>
            <button
              onClick={fetchProduct}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              🔄 Refresh
            </button>
          </div>

          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              No messages yet. Send a test message to see it here.
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          m.status === "completed"
                            ? "bg-emerald-500"
                            : m.status === "failed"
                              ? "bg-rose-500"
                              : "bg-amber-500"
                        }`}
                      />
                      <p className="text-sm font-semibold text-slate-900">
                        {m.sender_id}
                      </p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                        {m.mode === "test" ? "🧪 Test" : "🚀 Prod"}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700">"{m.message}"</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              📊 View Full Analytics
            </button>
          </div>
        </div>
      </main>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditing(false)}
          />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">
              ✏️ Edit {product.name}
            </h3>
            <form
              action={handleEdit}
              className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {/* Basic info */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={product.name}
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
                  defaultValue={product.price}
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
                  defaultValue={product.quantity}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Waiting Time (s)
                </label>
                <input
                  type="number"
                  name="waiting_time"
                  defaultValue={product.waiting_time || 7}
                  min="1"
                  max="30"
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Description
                </label>
                <input
                  type="text"
                  name="description"
                  defaultValue={product.description}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  🤖 AI Model
                </label>
                <select
                  name="webhook_model_id"
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
                  🔑 Keyword List
                </label>
                <select
                  name="keyword_list_id"
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

              {/* Catalog details */}
              <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
                <h4 className="mb-3 text-sm font-bold text-slate-900">
                  📦 Catalog Details
                </h4>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  defaultValue={product.category}
                  placeholder="e.g. Clothing"
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Subcategory
                </label>
                <input
                  type="text"
                  name="subcategory"
                  defaultValue={product.subcategory}
                  placeholder="e.g. Hijabs"
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
                  defaultValue={product.name_ar}
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
                  defaultValue={product.name_fr}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Compare Price (DZD)
                </label>
                <input
                  type="number"
                  name="compare_price"
                  defaultValue={product.compare_price || ""}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Stock Status
                </label>
                <select
                  name="stock_status"
                  defaultValue={product.stock_status || "High"}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {["High", "Medium", "Low", "Out", "Preorder"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue={product.status || "Active"}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {["Active", "Inactive", "Coming Soon"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Min Quantity
                </label>
                <input
                  type="number"
                  name="min_quantity"
                  defaultValue={product.min_quantity || 1}
                  min="1"
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Description (Arabic)
                </label>
                <textarea
                  name="description_ar"
                  defaultValue={product.description_ar}
                  rows="2"
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
                  defaultValue={product.material}
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
                  defaultValue={product.origin}
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
                  defaultValue={product.weight}
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
                  defaultValue={product.care}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Warranty
                </label>
                <input
                  type="text"
                  name="warranty"
                  defaultValue={product.warranty}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Unique Selling Proposition (USP)
                </label>
                <input
                  type="text"
                  name="usp"
                  defaultValue={product.usp}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Target Audience
                </label>
                <input
                  type="text"
                  name="target_audience"
                  defaultValue={product.target_audience}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Season
                </label>
                <select
                  name="season"
                  defaultValue={product.season || "All"}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                >
                  {["All", "Summer", "Winter", "Ramadan", "Eid"].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Occasion
                </label>
                <input
                  type="text"
                  name="occasion"
                  defaultValue={product.occasion}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              {/* Inventory */}
              <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
                <h4 className="mb-3 text-sm font-bold text-slate-900">
                  🏷️ Inventory & Supplier
                </h4>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700">
                  SKU Base
                </label>
                <input
                  type="text"
                  name="sku_base"
                  defaultValue={product.sku_base}
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
                  defaultValue={product.barcode}
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
                  defaultValue={product.supplier}
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
                  defaultValue={product.reorder_point}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  defaultValue={product.location}
                  className="rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="flex items-end justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isEditing ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
