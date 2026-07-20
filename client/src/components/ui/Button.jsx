export default function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-400",
    danger: "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
    outline: "border border-slate-300 text-slate-900 hover:bg-slate-50 focus-visible:ring-slate-400",
  };

  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
