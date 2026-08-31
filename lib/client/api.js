// lib/client/api.js
"use client";

let refreshPromise = null;

/**
 * Try to refresh the access token using the httpOnly refreshToken cookie.
 * Returns the new token, or null if refresh failed / not logged in.
 */
async function tryRefresh() {
  const res = await fetch("/api/auth/refresh", { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      // Refresh token is invalid/expired — force login
      localStorage.removeItem("accessToken");
    }
    return null;
  }
  const data = await res.json();
  if (data && data.success && data.accessToken) {
    localStorage.setItem("accessToken", data.accessToken);
    return data.accessToken;
  }
  return null;
}

/**
 * Fetch wrapper that automatically refreshes the access token when the
 * API responds with 401, then retries the original request once.
 */
export async function apiFetch(url, options = {}) {
  let token = localStorage.getItem("accessToken");
  const headers = new Headers(options.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const doFetch = (authToken) => {
    const h = new Headers(headers);
    if (authToken) h.set("Authorization", `Bearer ${authToken}`);
    return fetch(url, { ...options, headers: h });
  };

  let res = await doFetch(token);

  // If unauthorized, try to refresh once and retry
  if (res.status === 401) {
    if (!refreshPromise) {
      refreshPromise = tryRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    const newToken = await refreshPromise;
    if (!newToken) {
      // Could not refresh — redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return res;
    }
    res = await doFetch(newToken);
  }

  return res;
}
