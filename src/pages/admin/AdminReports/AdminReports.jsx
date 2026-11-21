import { useState } from "react";
import toast from "react-hot-toast";
import api from "../../../lib/api";
import { useAdminList } from "../../../hooks/useAdminList";
import { formatDate } from "../../../lib/admin";
import { shortenAddress } from "../../../lib/utils";
import { Button } from "../../../components/Button";
import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  AdminToolbar,
  StatusBadge,
} from "../../../components/admin/AdminUI";
import "./AdminReports.css";

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
    <div className="admin-reports">
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
        <div className="table-card">
          <div className="report-list">
            {reports.map((report) => (
              <div key={report._id} className="report">
                <div className="report-head">
                  <p className="report-type">{report.reportType}</p>
                  <StatusBadge tone={report.resolved ? "success" : "warning"}>
                    {report.resolved ? "Resolved" : "Open"}
                  </StatusBadge>
                  <p className="report-meta">
                    Student {shortenAddress(report.studentWallet || "")} ·
                    Institution {shortenAddress(report.institutionWallet || "")} ·
                    Reported {formatDate(report.reportedOn)}
                  </p>
                </div>
                <p className="report-details">{report.reportDetails}</p>

                {report.resolved ? (
                  <div className="resolution">
                    <span className="resolution-label">Resolution</span>
                    <span>{report.solutionDetails}</span>
                    <span className="resolution-date">
                      · {formatDate(report.resolvedDate)}
                    </span>
                  </div>
                ) : (
                  <div className="resolve-row">
                    <textarea
                      rows="1"
                      aria-label={`Resolution note for ${report.reportType}`}
                      placeholder="Resolution note..."
                      value={resolutionDrafts[report._id] || ""}
                      onChange={(event) =>
                        setResolutionDrafts((current) => ({
                          ...current,
                          [report._id]: event.target.value,
                        }))
                      }
                      className="textarea-field resolve-input"
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
              <p className="empty">No reports found</p>
            )}
          </div>
          <AdminPagination pagination={pagination} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
