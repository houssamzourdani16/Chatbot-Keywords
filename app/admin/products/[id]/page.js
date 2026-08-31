// app/admin/products/[id]/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import EditProductModal from "@/components/admin/EditProductModal";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [product, setProduct] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const getToken = () => localStorage.getItem("accessToken");

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setProduct(data.product);
      } else {
        setError(data.error || "Failed to load product");
      }
    } catch (err) {
      setError("Failed to load product");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/products/${id}/messages`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setMessages(data.messages);
    } catch (err) {
      // non-fatal
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    fetchMessages();
  }, [fetchProduct, fetchMessages]);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 2000);
    } catch (err) {
      setError("Failed to copy");
    }
  };

  const handleSave = async (data) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setEditing(false);
        fetchProduct();
      } else {
        setError(result.error || "Failed to update");
      }
    } catch (err) {
      setError("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-20 text-center text-gray-500">
        {error || "Product not found"}
      </div>
    );
  }

  const webhookUrl = `${window.location.origin}/api/webhook/${product.api_key}`;
  const testWebhookUrl = `${window.location.origin}/api/webhook/test/${product.api_key}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/admin")}
            className="mb-2 text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <p className="text-sm text-gray-500">
            {product.description || "No description"}
          </p>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          ✏️ Edit
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Price</p>
          <p className="text-xl font-bold text-gray-900">{product.price} DZD</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Quantity</p>
          <p className="text-xl font-bold text-gray-900">{product.quantity}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Messages</p>
          <p className="text-xl font-bold text-gray-900">
            {product.messageCount || 0}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-xs text-gray-500">Status</p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              product.status === "Active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {product.status || "Active"}
          </span>
        </div>
      </div>

      {/* Webhook URLs */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          🔗 Webhook URLs
        </h2>
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Production</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700">
                {webhookUrl}
              </code>
              <button
                onClick={() => copyToClipboard(webhookUrl, "prod")}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {copied === "prod" ? "✅" : "📋"}
              </button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-gray-500">Test</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-gray-100 px-3 py-2 text-xs text-gray-700">
                {testWebhookUrl}
              </code>
              <button
                onClick={() => copyToClipboard(testWebhookUrl, "test")}
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                {copied === "test" ? "✅" : "📋"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          📋 Product Details
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">API Key</p>
            <p className="text-sm font-medium text-gray-900">
              {product.api_key}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Waiting Time</p>
            <p className="text-sm font-medium text-gray-900">
              {product.waiting_time || 5}s
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Category</p>
            <p className="text-sm font-medium text-gray-900">
              {product.category || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Subcategory</p>
            <p className="text-sm font-medium text-gray-900">
              {product.subcategory || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Material</p>
            <p className="text-sm font-medium text-gray-900">
              {product.material || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Origin</p>
            <p className="text-sm font-medium text-gray-900">
              {product.origin || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">SKU Base</p>
            <p className="text-sm font-medium text-gray-900">
              {product.sku_base || "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Created</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(product.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          💬 Message History ({messages.length})
        </h2>
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No messages yet for this product.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">
                    {m.sender_id}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : m.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {m.status}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.mode === "test"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {m.mode}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-800">{m.message}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(m.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editing && (
        <EditProductModal
          product={product}
          onClose={() => setEditing(false)}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
