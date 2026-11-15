import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, FileWarning, School, Users } from "lucide-react";
import api from "../../../lib/api";
import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from "../../../components/admin/AdminUI";
import "./AdminOverview.css";

const STAT_MODULES = [
  {
    label: "Total Users",
    valueKey: "totalUsers",
    detail: (stats) => `${stats?.activeUsers ?? 0} active`,
    icon: Users,
    to: "/admin/users",
  },
  {
    label: "Institutions",
    valueKey: "totalInstitutions",
    detail: (stats) => `${stats?.pendingInstitutions ?? 0} pending`,
    icon: School,
    to: "/admin/institutions",
  },
  {
    label: "Allocations",
    valueKey: "totalAllocations",
    detail: (stats) => `${stats?.totalMinted ?? 0} minted`,
    icon: BadgeCheck,
    to: "/admin/credentials",
  },
  {
    label: "Reports",
    valueKey: "totalReports",
    detail: (stats) => `${stats?.openReports ?? 0} open`,
    icon: FileWarning,
    to: "/admin/reports",
  },
];

const QUEUES = [
  {
    title: "Institution verification",
    countKey: "pendingInstitutions",
    text: "institution profiles waiting for review",
    to: "/admin/institutions",
    action: "Review",
  },
  {
    title: "Open reports",
    countKey: "openReports",
    text: "credential issue reports need attention",
    to: "/admin/reports",
    action: "Review",
  },
];

export function AdminOverview() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const { data } = await api.get("/admin/stats");
      setStats(data.stats);
    } catch (loadError) {
      setError(
        loadError.response?.data?.message ||
          "Failed to load admin statistics"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="admin-overview">
      <AdminPageHeader
        title="Overview"
        description="Platform-wide activity and moderation queues."
        onRefresh={loadStats}
        isRefreshing={isLoading}
      />

      <AdminError message={error} />

      {isLoading && !stats ? (
        <AdminLoading />
      ) : (
        <>
          <div className="stats">
            {STAT_MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.label} to={module.to} className="stat">
                  <span className="stat-icon">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="stat-body">
                    <p className="stat-label">{module.label}</p>
                    <p className="stat-number">
                      {stats?.[module.valueKey] ?? "—"}
                    </p>
                  </div>
                  <span className="stat-detail">{module.detail(stats)}</span>
                </Link>
              );
            })}
          </div>

          <p className="queues-title">Needs attention</p>
          <div className="queues">
            {QUEUES.map((queue) => {
              const count = stats?.[queue.countKey] ?? 0;
              return (
                <div key={queue.title} className="queue">
                  <span
                    className={`queue-count ${count > 0 ? "is-busy" : "is-clear"}`}
                  >
                    {count}
                  </span>
                  <div className="queue-body">
                    <p className="queue-title">{queue.title}</p>
                    <p className="queue-text">
                      {count} {queue.text}
                    </p>
                  </div>
                  <Link to={queue.to} className="btn-outline h-7 px-2.5 text-xs">
                    {queue.action}
                  </Link>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
