export default function LoadingSpinner({ size = 6, className = "" }) {
  return (
    <div className={`inline-block animate-spin rounded-full border-4 border-blue-600 border-r-transparent ${className}`} style={{ width: `${size}rem`, height: `${size}rem` }} />
  );
}
