"use client";
import { useProtectPage } from "@/lib/auth/auth";

export default function DashboardPage() {
  const { user, loading } = useProtectPage();
  if (loading) {
    return <h2>loading user</h2>;
  }

  if (!user) {
    return null;
  }
  return (
    <div>
      <h1>dashboard</h1>
      <p> welcome {user.name}</p>
      <p> welcome {user.email}</p>
      <button
        onClick={() => {
          localStorage.removeItem("accessToken");
          window.location.href = "/login";
        }}
      >
        Logout
      </button>
    </div>
  );
}
