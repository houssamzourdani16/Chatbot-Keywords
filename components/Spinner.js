// components/Spinner.js
export default function Spinner({ size = "md", color = "blue", label }) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-4",
  };

  const colors = {
    blue: "border-blue-600",
    white: "border-white",
    gray: "border-gray-600",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} animate-spin rounded-full border-t-transparent ${colors[color] || colors.blue}`}
      />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}
