import { Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "../Button";

const BADGE_TONES = {
  success: "border-green-600/20 bg-green-600/10 text-green-700",
  danger: "border-red-600/20 bg-red-600/10 text-red-700",
  warning: "border-yellow-500/30 bg-yellow-500/15 text-yellow-800",
  info: "border-cobalt/20 bg-cobalt/10 text-cobalt",
  neutral: "border-ink/10 bg-ink/5 text-ink/70",
};

export function StatusBadge({ tone = "neutral", children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap ${
        BADGE_TONES[tone] || BADGE_TONES.neutral
      }`}
    >
      {children}
    </span>
  );
}

export function AdminPageHeader({
  title,
  description,
  onRefresh,
  isRefreshing = false,
  actions,
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-0.5 text-[14px] text-ink/55">{description}</p>
        )}
      </div>
      {(actions || onRefresh) && (
        <div className="flex flex-wrap items-center gap-2.5">
          {actions}
          {onRefresh && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onRefresh}
              disabled={isRefreshing}
              aria-label="Refresh"
              title="Refresh"
            >
              {isRefreshing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminToolbar({
  search,
  onSearchChange,
  onSubmit,
  filter,
  onFilterChange,
  filterOptions,
  placeholder = "Search...",
  children,
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <form onSubmit={onSubmit} className="relative flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-ink/40" />
        <input
          type="search"
          aria-label="Search"
          placeholder={placeholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="input-field pl-8"
        />
      </form>
      <select
        aria-label="Filter"
        value={filter}
        onChange={(event) => onFilterChange(event.target.value)}
        className="select-field sm:w-48"
      >
        {filterOptions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {children}
    </div>
  );
}

export function AdminPagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-between border-t border-ink/10 px-3.5 py-2.5 text-[13px] text-ink/55">
      <span>
        Page {pagination.page} of {pagination.pages} · {pagination.total} total
      </span>
      <div className="flex gap-1.5">
        <Button
          size="sm"
          variant="secondary"
          disabled={pagination.page <= 1}
          onClick={() => onPage(pagination.page - 1)}
        >
          Previous
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pagination.page >= pagination.pages}
          onClick={() => onPage(pagination.page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export function AdminLoading() {
  return (
    <div className="flex min-h-[30vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-cobalt" />
    </div>
  );
}

export function AdminError({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-md border border-red-500/30 bg-red-600/5 px-3 py-2 text-xs text-red-800">
      {message}
    </div>
  );
}

export function AdminEmpty({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-6 text-center text-ink/55">
        {message}
      </td>
    </tr>
  );
}
