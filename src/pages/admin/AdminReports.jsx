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
                className="rounded-lg border border-gray-700 bg-gray-800/50 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-medium">{report.reportType}</p>
                    <p className="mt-1 text-sm text-gray-300">
                      {report.reportDetails}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
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
                  <div className="mt-3 rounded-md bg-gray-700/40 p-3 text-sm text-gray-300">
                    <p className="text-xs font-medium uppercase text-gray-400">
                      Resolution
                    </p>
                    <p className="mt-1">{report.solutionDetails}</p>
                    <p className="mt-1 text-xs text-gray-400">
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
                      className="flex-1 rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-8 text-center text-gray-400">
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
