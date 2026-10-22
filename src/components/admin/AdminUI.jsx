import { Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "../Button";
import { Input } from "../Input";

const BADGE_TONES = {
  success: "bg-green-600/10 text-green-700",
  danger: "bg-red-600/10 text-red-700",
  warning: "bg-yellow-500/15 text-yellow-800",
  info: "bg-cobalt/10 text-cobalt",
  neutral: "bg-ink/5 text-ink/70",
};

export function StatusBadge({ tone = "neutral", children }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="eyebrow">Administration</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm leading-6 text-ink/60">{description}</p>
        )}
      </div>
      {(actions || onRefresh) && (
        <div className="flex flex-wrap gap-2">
          {actions}
          {onRefresh && (
            <Button
              variant="secondary"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
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
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <form onSubmit={onSubmit} className="flex flex-1 gap-2">
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <Button type="submit" variant="secondary" aria-label="Search">
          <Search className="h-4 w-4" />
        </Button>
      </form>
      <select
        value={filter}
        onChange={(event) => onFilterChange(event.target.value)}
        className="h-10 rounded-none border border-ink/25 bg-paper-deep px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-cobalt"
      >
        {filterOptions.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AdminPagination({ pagination, onPage }) {
  if (!pagination || pagination.pages <= 1) {
    return null;
  }

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-ink/60">
      <span>
        Page {pagination.page} of {pagination.pages} · {pagination.total} total
      </span>
      <div className="flex gap-2">
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
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-cobalt" />
    </div>
  );
}

export function AdminError({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-none border border-red-500/30 bg-red-600/5 p-4 text-sm text-red-800">
      {message}
    </div>
  );
}

export function AdminEmpty({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-ink/60">
        {message}
      </td>
    </tr>
  );
}
