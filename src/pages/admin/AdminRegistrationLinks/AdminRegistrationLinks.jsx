import { useState } from "react";
import { Copy, Plus } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../../lib/api";
import { useAdminList } from "../../../hooks/useAdminList";
import { formatDate, statusTone } from "../../../lib/admin";
import { Button } from "../../../components/Button";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  StatusBadge,
} from "../../../components/admin/AdminUI";
import "./AdminRegistrationLinks.css";

const publicUrl = (token) => `${window.location.origin}/apply/${token}`;

export function AdminRegistrationLinks() {
  const {
    items: links,
    isLoading,
    error,
    refresh,
    replaceItem,
  } = useAdminList({ endpoint: "/admin/registration-links", listKey: "links" });
  const [label, setLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState("");

  const createLink = async (event) => {
    event.preventDefault();
    setIsCreating(true);

    try {
      await api.post("/admin/registration-links", { label });
      setLabel("");
      refresh();
      toast.success("Registration link created");
    } catch (createError) {
      toast.error(getErrorMessage(createError, "Failed to create link"));
    } finally {
      setIsCreating(false);
    }
  };

  const toggleLink = async (link) => {
    setUpdatingId(link._id);

    try {
      const { data } = await api.patch(`/admin/registration-links/${link._id}`, {
        isActive: !link.isActive,
      });
      replaceItem(link._id, data.link);
      toast.success(data.link.isActive ? "Link activated" : "Link deactivated");
    } catch (updateError) {
      toast.error(getErrorMessage(updateError, "Failed to update link"));
    } finally {
      setUpdatingId("");
    }
  };

  const copyLink = async (token) => {
    try {
      await navigator.clipboard.writeText(publicUrl(token));
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="admin-reg-links">
      <AdminPageHeader
        title="Registration links"
        description="Public links institutions use to apply. Deactivate a link to stop new applications through it."
        onRefresh={refresh}
        isRefreshing={isLoading}
      />

      {/* Inline create bar: label field and button on one row */}
      <form onSubmit={createLink} className="create-bar">
        <label htmlFor="new-link-label" className="create-label">
          New link
        </label>
        <input
          id="new-link-label"
          className="input-field"
          placeholder="Label, e.g. 2026 onboarding campaign"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          required
          maxLength={100}
        />
        <Button type="submit" isLoading={isCreating}>
          <Plus className="h-3.5 w-3.5" />
          Create link
        </Button>
      </form>

      <AdminError message={error} />

      {isLoading ? (
        <AdminLoading />
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Label</th>
                  <th>Public URL</th>
                  <th>Status</th>
                  <th className="num">Applications</th>
                  <th>Created</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link._id}>
                    <td>
                      <p className="cell-title">{link.label}</p>
                      <p className="cell-sub">{link.createdBy?.name || "—"}</p>
                    </td>
                    <td>
                      <div className="url">
                        <code>{publicUrl(link.token)}</code>
                        <button
                          type="button"
                          onClick={() => copyLink(link.token)}
                          className="copy-btn"
                          aria-label={`Copy link for ${link.label}`}
                          title="Copy link"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td>
                      <StatusBadge tone={statusTone(link.isActive)}>
                        {link.isActive ? "Active" : "Inactive"}
                      </StatusBadge>
                    </td>
                    <td className="num">{link.submissionCount}</td>
                    <td className="date">{formatDate(link.createdAt)}</td>
                    <td className="col-actions">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={updatingId === link._id}
                        onClick={() => toggleLink(link)}
                      >
                        {link.isActive ? "Deactivate" : "Activate"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {links.length === 0 && (
                  <AdminEmpty colSpan={6} message="No registration links yet" />
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
