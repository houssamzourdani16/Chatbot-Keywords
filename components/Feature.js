// components/Feature.js
export default function Feature({ icon, title, description }) {
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-blue-200 hover:shadow-lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-2xl transition-colors group-hover:bg-blue-100">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        {description}
      </p>
    </div>
  );
}
