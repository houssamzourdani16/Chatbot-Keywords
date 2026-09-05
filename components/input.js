// components/Input.js
"use client";

import { useState } from "react";

export default function Input({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = true,
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={styles.container}>
      <label style={styles.label}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="messageia-input"
        style={{ ...styles.input, ...(focused ? styles.inputFocus : {}) }}
      />
      <style>{`
        .messageia-input::placeholder {
          color: #7d8aa0;
          opacity: 1;
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    width: "100%",
  },
  label: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#cbd5e1",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: "10px",
    fontSize: "15px",
    color: "#ffffff",
    background: "rgba(255,255,255,0.05)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  },
  inputFocus: {
    borderColor: "#8b5cf6",
    boxShadow: "0 0 0 3px rgba(139,92,246,0.15)",
  },
};
