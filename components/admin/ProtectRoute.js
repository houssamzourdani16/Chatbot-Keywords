// components/admin/ProtectRoute.js
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Protects a route so only SUPER_ADMIN users can access it.
 * Redirects non-super-admins to /dashboard.
 */
export default function ProtectRoute({ children }) {
  const router = useRouter();
  const [status, setStatus] = useState("loading"); // loading | authorized | denied

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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (status === "denied") return null;

  return children;
}
