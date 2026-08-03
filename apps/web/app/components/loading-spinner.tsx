export function LoadingSpinner({ label = "Loading…", compact = false }: { label?: string; compact?: boolean }) {
  return <div aria-live="polite" className={`loading-spinner ${compact ? "loading-spinner-compact" : ""}`}><span aria-hidden="true" className="spinner" /> <span>{label}</span></div>;
}
