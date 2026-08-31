// components/Card.js
export default function Card({
  children,
  title,
  subtitle,
  footer,
  className = "",
  padding = "p-6",
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {(title || subtitle) && (
        <div className="border-b border-gray-100 px-6 py-4">
          {title && (
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      <div className={padding}>{children}</div>
      {footer && (
        <div className="border-t border-gray-100 px-6 py-4">{footer}</div>
      )}
    </div>
  );
}
