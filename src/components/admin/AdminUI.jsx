import { Loader2, RefreshCw, Search } from "lucide-react";
import { Button } from "../Button";
import { Input } from "../Input";

const BADGE_TONES = {
  success: "bg-green-500/15 text-green-300",
  danger: "bg-red-500/15 text-red-300",
  warning: "bg-yellow-500/15 text-yellow-200",
  info: "bg-indigo-500/15 text-indigo-300",
  neutral: "bg-gray-500/15 text-gray-300",
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
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-400">{description}</p>
        )}
      </div>
      {onRefresh && (
        <Button variant="secondary" onClick={onRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
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
        className="h-10 rounded-md border border-gray-600 bg-gray-700 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
    <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
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
      <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
    </div>
  );
}

export function AdminError({ message }) {
  if (!message) return null;

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
      {message}
    </div>
  );
}

export function AdminEmpty({ colSpan, message }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-400">
        {message}
      </td>
    </tr>
  );
}
