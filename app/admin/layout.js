// app/admin/layout.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          setStatus("denied");
          return;
        }
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (data.isAuthenticated && data.user?.role === "super_admin") {
          setUser(data.user);
          setStatus("authorized");
        } else {
          setStatus("denied");
        }
      } catch (error) {
        setStatus("denied");
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    if (status === "denied") {
      router.push("/dashboard");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-purple-600 border-t-transparent" />
      </div>
    );
  }

  if (status === "denied") return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar user={user} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
