// components/admin/AdminSidebar.js
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminSidebar({ user }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/admin", label: "📊 Dashboard", icon: "📊" },
    { href: "/admin/users", label: "👥 Users", icon: "👥" },
    { href: "/admin/webhooks", label: "🔗 Webhooks", icon: "🔗" },
    { href: "/admin/keywords", label: "🔑 Keywords", icon: "🔑" },
    { href: "/admin/google-sheets", label: "📊 Sheets Config", icon: "📊" },
  ];

  const isActive = (href) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    router.push("/login");
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 text-lg text-white">
          🛡️
        </span>
        <div>
          <p className="text-sm font-bold text-gray-900">Super Admin</p>
          <p className="text-xs text-gray-500">Control Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(link.href)
                ? "bg-purple-50 text-purple-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <span>{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-gray-200 p-4">
        {user && (
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">
                {user.name}
              </p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
