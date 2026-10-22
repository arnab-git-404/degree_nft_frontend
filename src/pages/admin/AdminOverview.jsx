import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, FileWarning, School, Users } from "lucide-react";
import api from "../../lib/api";
import {
  AdminError,
  AdminLoading,
  AdminPageHeader,
} from "../../components/admin/AdminUI";

const STAT_MODULES = [
  {
    label: "Total Users",
    valueKey: "totalUsers",
    detail: (stats) => `${stats?.activeUsers ?? 0} active`,
    icon: Users,
    to: "/admin/users",
  },
  {
    label: "Universities",
    valueKey: "totalUniversities",
    detail: (stats) => `${stats?.pendingUniversities ?? 0} pending`,
    icon: School,
    to: "/admin/universities",
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
    <div className="space-y-6">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAT_MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <Link
                  key={module.label}
                  to={module.to}
                  className="rounded-none border border-ink/20 bg-paper-soft p-5 transition-colors hover:border-cobalt/60 hover:bg-paper-deep"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-ink/60">{module.label}</p>
                    <Icon className="h-5 w-5 text-cobalt" />
                  </div>
                  <p className="mt-3 text-3xl font-bold">
                    {stats?.[module.valueKey] ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-ink/60">
                    {module.detail(stats)}
                  </p>
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-none border border-ink/20 bg-paper-soft p-5">
              <h3 className="font-semibold">University verification</h3>
              <p className="mt-1 text-sm text-ink/60">
                {stats?.pendingUniversities ?? 0} university profiles are
                waiting for review.
              </p>
              <Link
                to="/admin/universities"
                className="mt-4 inline-flex h-8 items-center rounded-none bg-cobalt px-3 text-sm font-medium text-paper transition-colors hover:bg-ink"
              >
                Review universities
              </Link>
            </div>
            <div className="rounded-none border border-ink/20 bg-paper-soft p-5">
              <h3 className="font-semibold">Open reports</h3>
              <p className="mt-1 text-sm text-ink/60">
                {stats?.openReports ?? 0} credential issue reports need
                attention.
              </p>
              <Link
                to="/admin/reports"
                className="mt-4 inline-flex h-8 items-center rounded-none bg-cobalt px-3 text-sm font-medium text-paper transition-colors hover:bg-ink"
              >
                Review reports
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
