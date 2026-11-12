import { useState } from "react";
import { Copy, Plus } from "lucide-react";
import toast from "react-hot-toast";
import api, { getErrorMessage } from "../../lib/api";
import { useAdminList } from "../../hooks/useAdminList";
import { formatDate, statusTone } from "../../lib/admin";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  StatusBadge,
} from "../../components/admin/AdminUI";

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
    <div className="space-y-6">
      <AdminPageHeader
        title="Registration links"
        description="Public links universities use to apply. Deactivate a link to stop new applications through it."
        onRefresh={refresh}
        isRefreshing={isLoading}
      />

      <form onSubmit={createLink} className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="New link label"
            placeholder="e.g. 2026 onboarding campaign"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            required
            maxLength={100}
          />
        </div>
        <Button type="submit" isLoading={isCreating}>
          <Plus className="h-4 w-4" />
          Create link
        </Button>
      </form>

      <AdminError message={error} />

      {isLoading ? (
        <AdminLoading />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-ink/15 bg-paper-soft">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-ink/60">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Public URL</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Applications</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {links.map((link) => (
                <tr key={link._id} className="border-t border-ink/10">
                  <td className="px-4 py-3">
                    <p className="font-medium">{link.label}</p>
                    <p className="text-xs text-ink/50">{link.createdBy?.name || "—"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="max-w-56 truncate rounded bg-paper px-2 py-1 font-mono text-xs">
                        {publicUrl(link.token)}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyLink(link.token)}
                        className="rounded-md p-1.5 text-ink/60 hover:bg-paper hover:text-ink"
                        aria-label={`Copy link for ${link.label}`}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={statusTone(link.isActive)}>
                      {link.isActive ? "Active" : "Inactive"}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{link.submissionCount}</td>
                  <td className="px-4 py-3 text-xs text-ink/60">{formatDate(link.createdAt)}</td>
                  <td className="px-4 py-3">
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
      )}
    </div>
  );
}
