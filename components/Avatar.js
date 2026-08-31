// components/Avatar.js
export default function Avatar({ name, src, size = "md", status }) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
    xl: "h-20 w-20 text-2xl",
  };

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  const statusColors = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    busy: "bg-red-500",
    away: "bg-yellow-500",
  };

  return (
    <div className="relative inline-block">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizes[size]} flex items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700`}
        >
          {initials}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${statusColors[status] || statusColors.offline}`}
        />
      )}
    </div>
  );
}
