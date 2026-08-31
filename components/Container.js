// components/Container.js
export default function Container({
  children,
  className = "",
  maxWidth = "max-w-7xl",
}) {
  return (
    <div className={`mx-auto w-full px-4 sm:px-6 ${maxWidth} ${className}`}>
      {children}
    </div>
  );
}
