// components/Button.js
"use client";

export default function Button({
  children,
  onClick,
  loading = false,
  type = "button",
  color = "blue",
  fullWidth = true,
}) {
  const colors = {
    blue: { background: "#1976d2", hover: "#1565c0" },
    green: { background: "#28a745", hover: "#218838" },
    red: { background: "#dc3545", hover: "#c82333" },
  };

  const selectedColor = colors[color] || colors.blue;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      style={{
        padding: "12px 24px",
        background: loading ? "#999" : selectedColor.background,
        color: "white",
        border: "none",
        borderRadius: "6px",
        fontSize: "16px",
        fontWeight: "600",
        cursor: loading ? "not-allowed" : "pointer",
        width: fullWidth ? "100%" : "auto",
        transition: "background 0.3s",
      }}
      onMouseEnter={(e) => {
        if (!loading) {
          e.target.style.background = selectedColor.hover;
        }
      }}
      onMouseLeave={(e) => {
        if (!loading) {
          e.target.style.background = selectedColor.background;
        }
      }}
    >
      {loading ? "Loading..." : children}
    </button>
  );
}
