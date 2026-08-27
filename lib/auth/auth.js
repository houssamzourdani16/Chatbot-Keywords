"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function useProtectPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        // 1. Get token from localStorage
        const token = localStorage.getItem("accessToken");

        // 2. No token? Not logged in
        if (!token) {
          setLoading(false);
          return;
        }

        // 3. Check token with server
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        // 4. If authenticated, save user
        if (data.isAuthenticated) {
          setUser(data.user);
        } else {
          // Token is invalid
          localStorage.removeItem("accessToken");
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  // If not logged in and not loading, redirect to login
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  return { user, loading };
}
