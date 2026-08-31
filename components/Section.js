// components/Section.js
export default function Section({ children, className = "", id }) {
  return (
    <section id={id} className={`py-16 sm:py-24 ${className}`}>
      {children}
    </section>
  );
}
