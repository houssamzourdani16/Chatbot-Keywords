"use client";

import Link from "next/link";

export default function RegisterPage() {
  const handleGoogleSignup = () => {
    const redirectTo =
      localStorage.getItem("redirectAfterLogin") || "/dashboard";
    localStorage.removeItem("redirectAfterLogin");
    window.location.href = `/api/auth/google?redirect=${encodeURIComponent(redirectTo)}`;
  };

  return (
    <div style={styles.page}>
      {/* Ambient glows like the home page */}
      <div style={styles.glowTop} />
      <div style={styles.glowLeft} />
      <div style={styles.glowRight} />

      {/* NAVBAR */}
      <nav style={styles.nav}>
        <div style={styles.navInner}>
          <Link href="/" style={styles.logoLink}>
            <span style={styles.logoBadge}>IA</span>
            <span style={styles.logoText}>
              Mes<span style={styles.logoAccent}>sage</span>IA
            </span>
          </Link>
          <div style={styles.navCta}>
            <Link href="/login" style={styles.navLogin}>
              Se connecter
            </Link>
          </div>
        </div>
      </nav>

      {/* AUTH CARD */}
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.head}>
            <span style={styles.badge}>📝</span>
            <h1 style={styles.title}>Créer votre compte</h1>
            <p style={styles.subtitle}>
              Inscrivez-vous gratuitement avec votre compte Google.
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            style={styles.googleBtn}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 48 48"
              style={styles.googleIcon}
            >
              <path
                fill="#FFC107"
                d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
              />
              <path
                fill="#FF3D00"
                d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
              />
            </svg>
            S&apos;inscrire avec Google
          </button>

          <p style={styles.note}>
            Après l&apos;inscription, vous pourrez définir un mot de passe dans
            votre profil.
          </p>

          <p style={styles.footer}>
            Déjà un compte ?{" "}
            <Link href="/login" style={styles.link}>
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#06070d",
    color: "#ffffff",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  glowTop: {
    position: "absolute",
    top: "-160px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "600px",
    height: "300px",
    borderRadius: "50%",
    background: "rgba(59,130,246,0.18)",
    filter: "blur(120px)",
    pointerEvents: "none",
  },
  glowLeft: {
    position: "absolute",
    top: "260px",
    left: "-120px",
    width: "320px",
    height: "320px",
    borderRadius: "50%",
    background: "rgba(217,70,239,0.16)",
    filter: "blur(100px)",
    pointerEvents: "none",
  },
  glowRight: {
    position: "absolute",
    top: "160px",
    right: "-120px",
    width: "320px",
    height: "320px",
    borderRadius: "50%",
    background: "rgba(99,102,241,0.16)",
    filter: "blur(100px)",
    pointerEvents: "none",
  },
  nav: {
    position: "sticky",
    top: 0,
    zIndex: 50,
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    background: "rgba(6,7,13,0.8)",
    backdropFilter: "blur(20px)",
  },
  navInner: {
    maxWidth: "80rem",
    margin: "0 auto",
    height: "64px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 20px",
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    textDecoration: "none",
    color: "inherit",
  },
  logoBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "12px",
    background: "linear-gradient(135deg, #d946ef, #2563eb)",
    fontSize: "18px",
    fontWeight: "bold",
    boxShadow: "0 10px 30px rgba(37,99,235,0.3)",
  },
  logoText: {
    fontSize: "18px",
    fontWeight: "bold",
    letterSpacing: "-0.02em",
  },
  logoAccent: {
    color: "#60a5fa",
  },
  navCta: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  navLogin: {
    color: "#d1d5db",
    fontSize: "14px",
    textDecoration: "none",
  },
  wrap: {
    position: "relative",
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 20px",
    zIndex: 1,
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "rgba(11,15,26,0.8)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "40px 36px",
    backdropFilter: "blur(20px)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
  },
  head: {
    textAlign: "center",
    marginBottom: "24px",
  },
  badge: {
    fontSize: "34px",
  },
  title: {
    marginTop: "10px",
    fontSize: "26px",
    fontWeight: "800",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    marginTop: "6px",
    color: "#9ca3af",
    fontSize: "14px",
  },
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    padding: "13px 16px",
    borderRadius: "10px",
    background: "#ffffff",
    color: "#111827",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    border: "1px solid rgba(255,255,255,0.12)",
    transition: "background 0.2s ease",
    boxShadow: "0 4px 14px rgba(0,0,0,0.2)",
    marginTop: "6px",
  },
  googleIcon: {
    flexShrink: 0,
  },
  note: {
    marginTop: "18px",
    textAlign: "center",
    color: "#6b7280",
    fontSize: "13px",
    lineHeight: 1.6,
    padding: "0 8px",
  },
  footer: {
    textAlign: "center",
    marginTop: "22px",
    fontSize: "14px",
    color: "#9ca3af",
  },
  link: {
    color: "#60a5fa",
    textDecoration: "none",
    fontWeight: "600",
  },
};
