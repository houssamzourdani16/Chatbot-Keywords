// app/admin/products/new/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getToken = () => localStorage.getItem("accessToken");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      price: parseFloat(formData.get("price")),
      quantity: parseInt(formData.get("quantity")),
      description: formData.get("description"),
      waiting_time: parseInt(formData.get("waiting_time")) || 5,
      status: formData.get("status"),
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess("✅ Product created!");
        setTimeout(() => router.push("/admin"), 1000);
      } else {
        setError(result.error || "Failed to create product");
      }
    } catch (err) {
      setError("Failed to create product");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.push("/admin")}
        className="mb-4 text-sm text-gray-500 hover:text-gray-700"
      >
        ← Back to Dashboard
      </button>

      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        ➕ Add New Product
      </h1>

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

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              name="name"
              required
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Price (DZD)
            </label>
            <input
              type="number"
              name="price"
              required
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              type="number"
              name="quantity"
              required
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Waiting Time (s)
            </label>
            <input
              type="number"
              name="waiting_time"
              defaultValue="5"
              min="1"
              max="30"
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              rows="3"
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Coming Soon">Coming Soon</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
