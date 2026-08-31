// components/admin/EditProductModal.js
"use client";

export default function EditProductModal({ product, onClose, onSave, saving }) {
  if (!product) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get("name"),
      price: parseFloat(formData.get("price")),
      quantity: parseInt(formData.get("quantity")),
      description: formData.get("description"),
      waiting_time: parseInt(formData.get("waiting_time")) || 5,
      status: formData.get("status"),
    };
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-semibold text-gray-900">
          ✏️ Edit {product.name}
        </h3>
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              name="name"
              defaultValue={product.name}
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
              defaultValue={product.price}
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
              defaultValue={product.quantity}
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
              defaultValue={product.waiting_time || 5}
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
              defaultValue={product.description}
              rows="2"
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              defaultValue={product.status || "Active"}
              className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Coming Soon">Coming Soon</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
