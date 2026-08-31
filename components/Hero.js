// components/Hero.js
import Link from "next/link";

export default function Hero({
  badge,
  title,
  highlight,
  subtitle,
  primaryCta = { label: "Get Started", href: "/register" },
  secondaryCta,
  image,
}) {
  return (
    <div className="relative overflow-hidden bg-linear-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          {badge && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-4 py-1.5 text-sm font-medium text-blue-700">
              {badge}
            </span>
          )}

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {title}{" "}
            {highlight && (
              <span className="bg-linear-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {highlight}
              </span>
            )}
          </h1>

          {subtitle && (
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
              {subtitle}
            </p>
          )}

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={primaryCta.href}
              className="w-full rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 sm:w-auto"
            >
              {primaryCta.label}
            </Link>
            {secondaryCta && (
              <Link
                href={secondaryCta.href}
                className="w-full rounded-lg border border-gray-300 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
              >
                {secondaryCta.label}
              </Link>
            )}
          </div>
        </div>

        {image && (
          <div className="mx-auto mt-16 max-w-5xl">
            <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-2xl">
              {image}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
