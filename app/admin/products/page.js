// app/admin/products/page.js
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProductTable from "@/components/admin/ProductTable";
import EditProductModal from "@/components/admin/EditProductModal";
import DeleteConfirmModal from "@/components/admin/DeleteConfirmModal";

export default function AdminProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters & pagination
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Bulk selection
  const [selected, setSelected] = useState([]);

  // Modals
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getToken = () => localStorage.getItem("accessToken");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page, limit: "10" });
      if (search) params.set("search", search);
      if (status) params.set("status", status);

      const res = await fetch(`/api/admin/products?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setTotalPages(data.totalPages || 1);
      } else {
        setError(data.error || "Failed to load products");
      }
    } catch (err) {
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300);
    return () => clearTimeout(timer);
  }, [search, status]);

  const handleSave = async (data) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${editingProduct.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess("✅ Product updated!");
        setEditingProduct(null);
        fetchProducts();
      } else {
        setError(result.error || "Failed to update");
      }
    } catch (err) {
      setError("Failed to update product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/products/${deletingProduct.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const result = await res.json();
      if (result.success) {
        setSuccess("🗑️ Product deleted!");
        setDeletingProduct(null);
        fetchProducts();
      } else {
        setError(result.error || "Failed to delete");
      }
    } catch (err) {
      setError("Failed to delete product");
    } finally {
      setDeleting(false);
    }
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    if (!selected.length) return;
    setDeleting(true);
    setError("");
    try {
      for (const id of selected) {
        await fetch(`/api/admin/products/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
      }
      setSuccess(`🗑️ Deleted ${selected.length} products!`);
      setSelected([]);
      fetchProducts();
    } catch (err) {
      setError("Failed to delete products");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkStatus = async (newStatus) => {
    if (!selected.length) return;
    setError("");
    try {
      for (const id of selected) {
        await fetch(`/api/admin/products/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ status: newStatus }),
        });
      }
      setSuccess(`✅ Updated ${selected.length} products!`);
      setSelected([]);
      fetchProducts();
    } catch (err) {
      setError("Failed to update products");
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📦 Products</h1>
          <p className="text-sm text-gray-500">Manage all products</p>
        </div>
        <button
          onClick={() => router.push("/admin/products/new")}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          + Add Product
        </button>
      </div>

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

      {/* Bulk actions */}
      {selected.length > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <span className="text-sm font-medium text-blue-700">
            {selected.length} selected
          </span>
          <button
            onClick={() => handleBulkStatus("Active")}
            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
          >
            Activate
          </button>
          <button
            onClick={() => handleBulkStatus("Inactive")}
            className="rounded-lg bg-yellow-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yellow-700"
          >
            Deactivate
          </button>
          <button
            onClick={handleBulkDelete}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
          <button
            onClick={() => setSelected([])}
            className="ml-auto text-sm text-blue-700 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Products Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <ProductTable
          products={products}
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          onEdit={setEditingProduct}
          onDelete={setDeletingProduct}
          onView={(p) => router.push(`/admin/products/${p.id}`)}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          loading={loading}
          selected={selected}
          onToggleSelect={toggleSelect}
        />
      </div>

      {/* Modals */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSave={handleSave}
          saving={saving}
        />
      )}
      {deletingProduct && (
        <DeleteConfirmModal
          title="Delete Product"
          message={`Delete "${deletingProduct.name}" and all its messages?`}
          onClose={() => setDeletingProduct(null)}
          onConfirm={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
}
