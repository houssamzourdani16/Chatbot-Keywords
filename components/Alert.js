// components/Alert.js
"use client";
export default function Alert({ type = "info", title, children, onClose }) {
  const styles = {
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: "text-blue-500",
    },
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      icon: "text-green-500",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      icon: "text-yellow-500",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: "text-red-500",
    },
  };

  const s = styles[type] || styles.info;

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border ${s.bg} ${s.border} p-4`}
    >
      <div className={`mt-0.5 ${s.icon}`}>
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {type === "success" ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          ) : type === "error" ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : type === "warning" ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          )}
        </svg>
      </div>
      <div className="flex-1">
        {title && <p className={`text-sm font-semibold ${s.text}`}>{title}</p>}
        <div className={`text-sm ${s.text} ${title ? "mt-1" : ""}`}>
          {children}
        </div>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`${s.text} hover:opacity-70`}
          aria-label="Dismiss"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
