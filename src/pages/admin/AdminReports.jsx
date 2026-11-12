import { useState } from "react";
import toast from "react-hot-toast";
import api from "../../lib/api";
import { useAdminList } from "../../hooks/useAdminList";
import { formatDate } from "../../lib/admin";
import { shortenAddress } from "../../lib/utils";
import { Button } from "../../components/Button";
import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  AdminToolbar,
  StatusBadge,
} from "../../components/admin/AdminUI";

const FILTER_OPTIONS = [
  ["all", "All reports"],
  ["false", "Open"],
  ["true", "Resolved"],
];

export function AdminReports() {
  const {
    items: reports,
    pagination,
    isLoading,
    error,
    search,
    setSearch,
    filter,
    changeFilter,
    setPage,
    refresh,
    replaceItem,
    handleSearch,
  } = useAdminList({
    endpoint: "/admin/reports",
    listKey: "reports",
    filterParam: "resolved",
  });
  const [resolutionDrafts, setResolutionDrafts] = useState({});
  const [busyId, setBusyId] = useState("");

  const resolveReport = async (reportId) => {
    const solutionDetails = (resolutionDrafts[reportId] || "").trim();

    if (!solutionDetails) {
      toast.error("Add a resolution note first");
      return;
    }

    setBusyId(reportId);

    try {
      const { data } = await api.patch(`/admin/reports/${reportId}/resolve`, {
        solutionDetails,
      });
      replaceItem(reportId, data.report);
      setResolutionDrafts((current) => {
        const next = { ...current };
        delete next[reportId];
        return next;
      });
      toast.success("Report resolved");
    } catch (updateError) {
      toast.error(
        updateError.response?.data?.message || "Failed to resolve report"
      );
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Reports"
        description="Review credential issues reported by students."
        onRefresh={refresh}
        isRefreshing={isLoading}
      />

      <AdminToolbar
        search={search}
        onSearchChange={setSearch}
        onSubmit={handleSearch}
        filter={filter}
        onFilterChange={changeFilter}
        filterOptions={FILTER_OPTIONS}
        placeholder="Search by type, details, or wallet..."
      />

      <AdminError message={error} />

      {isLoading ? (
        <AdminLoading />
      ) : (
        <>
          <div className="space-y-3">
            {reports.map((report) => (
              <div
                key={report._id}
                className="rounded-none border border-ink/20 bg-paper-soft p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">{report.reportType}</p>
                    <p className="mt-1 text-sm text-ink/70">
                      {report.reportDetails}
                    </p>
                    <p className="mt-2 text-xs text-ink/60">
                      Student: {shortenAddress(report.studentWallet || "")} ·
                      University:{" "}
                      {shortenAddress(report.universityWallet || "")} · Reported{" "}
                      {formatDate(report.reportedOn)}
                    </p>
                  </div>
                  <StatusBadge tone={report.resolved ? "success" : "warning"}>
                    {report.resolved ? "Resolved" : "Open"}
                  </StatusBadge>
                </div>

                {report.resolved ? (
                  <div className="mt-3 rounded-none bg-paper-deep p-3 text-sm text-ink/70">
                    <p className="text-xs font-medium uppercase text-ink/60">
                      Resolution
                    </p>
                    <p className="mt-1">{report.solutionDetails}</p>
                    <p className="mt-1 text-xs text-ink/60">
                      Resolved {formatDate(report.resolvedDate)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <textarea
                      rows="2"
                      placeholder="Resolution note..."
                      value={resolutionDrafts[report._id] || ""}
                      onChange={(event) =>
                        setResolutionDrafts((current) => ({
                          ...current,
                          [report._id]: event.target.value,
                        }))
                      }
                      className="flex-1 rounded-none border border-ink/25 bg-paper-deep px-3 py-2 text-sm text-ink placeholder:text-ink/60 focus:outline-none focus:ring-2 focus:ring-cobalt"
                    />
                    <Button
                      size="sm"
                      disabled={busyId === report._id}
                      onClick={() => resolveReport(report._id)}
                    >
                      Resolve
                    </Button>
                  </div>
                )}
              </div>
            ))}
            {reports.length === 0 && (
              <div className="rounded-none border border-ink/20 bg-paper-soft p-8 text-center text-ink/60">
                No reports found
              </div>
            )}
          </div>
          <AdminPagination pagination={pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
}
