// components/Button.js
"use client";

export default function Button({
  children,
  onClick,
  loading = false,
  type = "button",
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  className = "",
}) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
    ghost: "text-gray-600 hover:bg-gray-100",
    outline: "border border-blue-600 text-blue-600 hover:bg-blue-50",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        variants[variant] || variants.primary
      } ${sizes[size] || sizes.md} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {loading && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
