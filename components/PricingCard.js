// components/PricingCard.js
export default function PricingCard({
  name,
  price,
  period = "/month",
  description,
  features = [],
  cta = { label: "Get Started", href: "/register" },
  highlighted = false,
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-8 ${
        highlighted
          ? "border-blue-600 bg-blue-600 text-white shadow-2xl shadow-blue-600/30"
          : "border-gray-200 bg-white text-gray-900"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-xs font-semibold text-blue-600 shadow">
          Most Popular
        </span>
      )}

      <h3 className="text-lg font-semibold">{name}</h3>
      <p
        className={`mt-1 text-sm ${highlighted ? "text-blue-100" : "text-gray-500"}`}
      >
        {description}
      </p>

      <div className="mt-6 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold">{price}</span>
        <span className={highlighted ? "text-blue-100" : "text-gray-500"}>
          {period}
        </span>
      </div>

      <ul className="mt-8 flex-1 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <svg
              className={`mt-0.5 h-5 w-5 shrink-0 ${highlighted ? "text-blue-200" : "text-green-500"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <a
        href={cta.href}
        className={`mt-8 rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors ${
          highlighted
            ? "bg-white text-blue-600 hover:bg-blue-50"
            : "bg-blue-600 text-white hover:bg-blue-700"
        }`}
      >
        {cta.label}
      </a>
    </div>
  );
}
