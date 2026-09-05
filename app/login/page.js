"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/input";
import Button from "@/components/button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const validateEmail = (value) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    // Validate email before submit
    if (!email.trim()) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Veuillez saisir une adresse email valide.");
      return;
    }
    if (!password) {
      setError("Veuillez saisir votre mot de passe.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem("accessToken", data.accessToken);
        const redirectTo = localStorage.getItem("redirectAfterLogin");
        localStorage.removeItem("redirectAfterLogin");
        router.push(redirectTo || "/dashboard");
      } else {
        setError(data.message || "Échec de la connexion");
      }
    } catch (error) {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
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
            <Link href="/register" style={styles.navRegister}>
              Créer un compte
            </Link>
          </div>
        </div>
      </nav>

      {/* AUTH CARD */}
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.head}>
            <span style={styles.badge}>🔐</span>
            <h1 style={styles.title}>Bienvenue de retour</h1>
            <p style={styles.subtitle}>
              Connectez-vous pour gérer votre agent IA.
            </p>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <form onSubmit={handleLogin} style={styles.form}>
            <Input
              label="Adresse email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />

            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Votre mot de passe"
            />

            <Button type="submit" loading={loading} fullWidth color="blue">
              Se connecter
            </Button>
          </form>

          <p style={styles.footer}>
            Pas encore de compte ?{" "}
            <Link href="/register" style={styles.link}>
              Créer un compte
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
  navRegister: {
    padding: "8px 16px",
    borderRadius: "10px",
    background: "linear-gradient(90deg, #c026d3, #2563eb)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
    boxShadow: "0 10px 30px rgba(37,99,235,0.25)",
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
  error: {
    background: "rgba(248,113,113,0.12)",
    border: "1px solid rgba(248,113,113,0.3)",
    color: "#fca5a5",
    padding: "12px 14px",
    borderRadius: "10px",
    fontSize: "14px",
    marginBottom: "18px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
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
