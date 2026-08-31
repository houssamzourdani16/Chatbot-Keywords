// components/CTA.js
import Link from "next/link";

export default function CTA({ title, subtitle, primaryCta, secondaryCta }) {
  return (
    <div className="rounded-2xl bg-linear-to-r from-blue-600 to-purple-600 px-8 py-14 text-center shadow-xl">
      <h2 className="text-3xl font-bold text-white sm:text-4xl">{title}</h2>
      {subtitle && (
        <p className="mx-auto mt-4 max-w-2xl text-lg text-blue-100">
          {subtitle}
        </p>
      )}
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        {primaryCta && (
          <Link
            href={primaryCta.href}
            className="w-full rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-blue-600 transition-colors hover:bg-blue-50 sm:w-auto"
          >
            {primaryCta.label}
          </Link>
        )}
        {secondaryCta && (
          <Link
            href={secondaryCta.href}
            className="w-full rounded-lg border border-white/40 px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            {secondaryCta.label}
          </Link>
        )}
      </div>
    </div>
  );
}
