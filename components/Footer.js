// components/Footer.js
"use client";
import Link from "next/link";

export default function Footer({
  brand = "MyApp",
  description = "Building the future, one message at a time.",
  columns = [],
}) {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 text-xl font-bold text-gray-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                {brand.charAt(0)}
              </span>
              {brand}
            </div>
            <p className="mt-3 max-w-sm text-sm text-gray-600">{description}</p>
          </div>

          {/* Link columns */}
          {columns.map((col, i) => (
            <div key={i}>
              <h3 className="text-sm font-semibold text-gray-900">
                {col.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-gray-600 transition-colors hover:text-gray-900"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          © {brand}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
