import { useEffect } from "react";
import { ChevronDown, LayoutGrid, List, Pencil, RotateCcw, Search, X } from "lucide-react";
import { Button } from "../Button";
import { StatusBadge } from "../admin/AdminUI";
import "./CatalogPage.css";

// Shared pieces of the college catalog pages (Programs, Sessions). Put `catalog-page` on the page root.
// `statuses` maps a status to its label and badge tone: { ACTIVE: { label: "Active", tone: "success" } }.

// Native select with the chevron that `.select-field` (appearance-none) hides.
export function Select({ className = "", children, ...props }) {
  return (
    <span className={`select-wrap ${className}`}>
      <select className="select-field" {...props}>
        {children}
      </select>
      <ChevronDown className="select-chevron" aria-hidden="true" />
    </span>
  );
}

export function StatCards({ stats }) {
  return (
    <div className={`stats stats-${stats.length}`}>
      {stats.map((stat) => (
        <div key={stat.label} className={`stat tone-${stat.tone}`}>
          <span className="stat-icon">
            <stat.icon className="h-5 w-5" />
          </span>
          <div>
            <p className="stat-number">{stat.value}</p>
            <p className="stat-label">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// `children` are the page's filter selects, shown before the search box.
export function CatalogToolbar({ children, search, onSearch, placeholder, hasFilters, onClear, shown, total, view, onView }) {
  return (
    <div className="toolbar">
      {children}
      <label className="search">
        <Search className="search-icon" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search"
          placeholder={placeholder}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          className="input-field"
        />
      </label>
      <button type="button" className="clear-btn" disabled={!hasFilters} onClick={onClear}>
        <RotateCcw className="h-4 w-4" /> Clear filters
      </button>
      <span className="count-pill">
        {shown} of {total}
      </span>
      <div className="view-toggle" role="group" aria-label="View">
        <button type="button" aria-pressed={view === "grid"} aria-label="Grid view" title="Grid view" onClick={() => onView("grid")}>
          <LayoutGrid className="h-4 w-4" />
        </button>
        <button type="button" aria-pressed={view === "table"} aria-label="Table view" title="Table view" onClick={() => onView("table")}>
          <List className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function StatusOptions({ statuses }) {
  return Object.entries(statuses).map(([value, { label }]) => (
    <option key={value} value={value}>
      {label}
    </option>
  ));
}

export function StatusPill({ statuses, value }) {
  return <StatusBadge tone={statuses[value]?.tone}>{statuses[value]?.label || value}</StatusBadge>;
}

// Pencil (edit) + status dropdown, for a table row or a card footer.
export function RowActions({ name, statuses, value, disabled, onEdit, onChange }) {
  return (
    <div className="actions">
      <button type="button" className="edit-btn" onClick={onEdit} aria-label={`Edit ${name}`} title="Edit">
        <Pencil className="h-4 w-4" />
      </button>
      <Select
        className={`tone-${statuses[value]?.tone}`}
        aria-label={`Status of ${name}`}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        <StatusOptions statuses={statuses} />
      </Select>
    </div>
  );
}

export function ItemIcon({ icon, color }) {
  const Icon = icon;
  return (
    <span className="item-icon" style={color ? { background: color } : undefined}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

// Icon tile + bold title + small coloured code underneath (the table's first column).
export function ItemTitle({ icon, title, code, color }) {
  return (
    <div className="item-cell">
      <ItemIcon icon={icon} color={color} />
      <div className="min-w-0">
        <p className="item-name">{title}</p>
        {code && <p className="item-code">{code}</p>}
      </div>
    </div>
  );
}

// Right-hand slide-over for longer create forms: same props as CatalogModal. The body scrolls; Cancel/Save stay at the bottom.
export function CatalogPanel({ title, isSaving, onClose, onSubmit, submitLabel, children }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && !isSaving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  return (
    <div className="side-panel-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isSaving && onClose()}>
      <aside role="dialog" aria-modal="true" aria-labelledby="catalog-panel-title" className="side-panel">
        <form onSubmit={onSubmit}>
          <div className="modal-head">
            <h2 id="catalog-panel-title" className="modal-title">
              {title}
            </h2>
            <button type="button" className="icon-btn" onClick={onClose} disabled={isSaving} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="side-panel-body">{children}</div>
          <div className="modal-foot">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}

// Centred add/edit dialog: Escape or a backdrop click closes it unless saving.
export function CatalogModal({ title, isSaving, onClose, onSubmit, submitLabel, children }) {
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && !isSaving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSaving, onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !isSaving && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="catalog-modal-title" className="modal">
        <form onSubmit={onSubmit}>
          <div className="modal-head">
            <h2 id="catalog-modal-title" className="modal-title">
              {title}
            </h2>
            <button type="button" className="icon-btn" onClick={onClose} disabled={isSaving} aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="modal-body">{children}</div>
          <div className="modal-foot">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
