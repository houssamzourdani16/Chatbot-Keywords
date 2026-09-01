// app/leads/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProtectPage } from "@/lib/auth/auth";

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"];

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  qualified: "bg-purple-100 text-purple-700",
  converted: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

export default function LeadsPage() {
  const { user, loading } = useProtectPage();
  const router = useRouter();

  const [leads, setLeads] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [productFilter, setProductFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail modal
  const [selectedLead, setSelectedLead] = useState(null);

  const getToken = () => localStorage.getItem("accessToken");

  const fetchLeads = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoadingLeads(true);
      setError("");
      try {
        const params = new URLSearchParams({ page, limit: "20" });
        if (productFilter) params.set("product_id", productFilter);
        if (statusFilter) params.set("status", statusFilter);

        const res = await fetch(`/api/leads?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        if (data.success) {
          setLeads(data.leads);
          setTotalPages(data.totalPages || 1);
        } else {
          setError(data.error || "Failed to load leads");
        }
      } catch (err) {
        setError("Failed to load leads");
      } finally {
        if (!silent) setLoadingLeads(false);
      }
    },
    [page, productFilter, statusFilter],
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
      fetchLeads();
      fetchProducts();
    }
  }, [user, fetchLeads, fetchProducts]);

  // ✅ Smooth auto-refresh: poll for new leads every 5 seconds in the
  //    background (silent) so the page updates without a visible reload
  //    or loading spinner.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetchLeads({ silent: true });
    }, 5000);
    return () => clearInterval(interval);
  }, [user, fetchLeads]);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [productFilter, statusFilter]);

  const handleStatusChange = async (leadId, newStatus) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/leads", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ leadId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess("✅ Lead status updated!");
        fetchLeads();
        if (selectedLead?.id === leadId) {
          setSelectedLead({ ...selectedLead, status: newStatus });
        }
      } else {
        setError(data.error || "Failed to update lead");
      }
    } catch (err) {
      setError("Failed to update lead");
    }
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
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              ← Dashboard
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">🎯 Leads</h1>
              <p className="text-sm text-gray-500">
                Customers interested in your products
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
              {leads.length} leads
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
        {success && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2">
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
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Leads Grid */}
        {loadingLeads ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-16 text-center">
            <p className="text-4xl">🎯</p>
            <h2 className="mt-4 text-lg font-semibold text-gray-900">
              No leads yet
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              When customers send messages with their contact info (name, phone,
              email, etc.), leads will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {leads.map((lead) => (
              <div
                key={lead.id}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {lead.extracted_data.name || lead.customer_id}
                    </p>
                    <p className="text-sm text-gray-500">{lead.product_name}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      STATUS_COLORS[lead.status] || STATUS_COLORS.new
                    }`}
                  >
                    {lead.status}
                  </span>
                </div>

                {/* Extracted data */}
                <div className="mb-4 space-y-1.5 text-sm">
                  {lead.extracted_data.phone && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <span>📞</span> {lead.extracted_data.phone}
                    </p>
                  )}
                  {lead.extracted_data.email && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <span>✉️</span> {lead.extracted_data.email}
                    </p>
                  )}
                  {lead.extracted_data.address && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <span>📍</span> {lead.extracted_data.address}
                    </p>
                  )}
                  {lead.extracted_data.interest && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <span>🛍️</span> {lead.extracted_data.interest}
                    </p>
                  )}
                  {lead.extracted_data.quantity > 0 && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <span>🔢</span> Qty: {lead.extracted_data.quantity}
                    </p>
                  )}
                  {lead.extracted_data.budget > 0 && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <span>💰</span> {lead.extracted_data.budget} DZD
                    </p>
                  )}
                </div>

                {/* Confidence + actions */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${lead.confidence_score}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {lead.confidence_score}%
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedLead(lead)}
                    className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                  >
                    View
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
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                🎯 Lead Details
              </h2>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">
                {selectedLead.extracted_data.name || selectedLead.customer_id}
              </p>
              <p className="text-sm text-gray-500">
                {selectedLead.product_name} · Customer:{" "}
                {selectedLead.customer_id}
              </p>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-600">Phone</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedLead.extracted_data.phone || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-600">Email</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedLead.extracted_data.email || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-600">Address</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedLead.extracted_data.address || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-600">Interest</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedLead.extracted_data.interest || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-600">Quantity</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedLead.extracted_data.quantity || "—"}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <p className="text-xs text-blue-600">Budget</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedLead.extracted_data.budget
                    ? `${selectedLead.extracted_data.budget} DZD`
                    : "—"}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-gray-700">
                Confidence Score
              </p>
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: `${selectedLead.confidence_score}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {selectedLead.confidence_score}%
                </span>
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(selectedLead.id, s)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedLead.status === s
                        ? STATUS_COLORS[s]
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedLead(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
