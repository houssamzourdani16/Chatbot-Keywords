// components/PageHeader.js
export default function PageHeader({ title, subtitle, actions, breadcrumb }) {
  return (
    <div className="mb-8">
      {breadcrumb && (
        <nav className="mb-2 text-sm text-gray-500">{breadcrumb}</nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            {title}
          </h1>
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}
