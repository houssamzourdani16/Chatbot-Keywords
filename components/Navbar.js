// components/Navbar.js
"use client";
import Link from "next/link";
import { useState } from "react";

export default function Navbar({
  brand = "MyApp",
  links = [],
  user = null,
  onLogout,
}) {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold text-gray-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
            {brand.charAt(0)}
          </span>
          {brand}
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* User / Auth */}
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="text-sm font-medium text-gray-700">
                {user.name}
              </span>
              <button
                onClick={onLogout}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen(!open)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 md:hidden"
          aria-label="Toggle menu"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {open ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gray-200 bg-white px-4 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={() => {
                  setOpen(false);
                  onLogout?.();
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
