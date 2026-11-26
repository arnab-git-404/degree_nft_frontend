import { Fragment, useState } from "react";
import { CheckCircle, Link2, UsersRound, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../../lib/api";
import { useAdminList } from "../../../hooks/useAdminList";
import { statusTone } from "../../../lib/admin";
import { shortenAddress } from "../../../lib/utils";
import { Button } from "../../../components/Button";
import { StaffManager } from "../../../components/StaffManager/StaffManager";
import {
  AdminEmpty,
  AdminError,
  AdminLoading,
  AdminPageHeader,
  AdminPagination,
  AdminToolbar,
  StatusBadge,
} from "../../../components/admin/AdminUI";
import { ChainPanel } from "./ChainPanel";
import "./AdminInstitutions.css";

const FILTER_OPTIONS = [
  ["all", "All statuses"],
  ["PENDING", "Pending"],
  ["VERIFIED", "Verified"],
  ["REJECTED", "Rejected"],
];

export function AdminInstitutions() {
  const {
    items: institutions,
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
    endpoint: "/admin/institutions",
    listKey: "institutions",
    filterParam: "status",
  });
  const [updatingId, setUpdatingId] = useState("");
  const [membersOf, setMembersOf] = useState("");
  const [chainOf, setChainOf] = useState("");

  // Super Admin only (P04-04): moves the primary-head pointer; the API checks the target is an ACTIVE admin.
  const transferHead = async (institutionId, member, reason) => {
    try {
      const { data } = await api.post(`/admin/institutions/${institutionId}/head`, { membershipId: member._id, reason });
      replaceItem(institutionId, { ...institutions.find((item) => item._id === institutionId), primaryAdminMembershipId: data.institution.primaryAdminMembershipId });
      toast.success(`${member.userId?.name} is now the head`);
    } catch (transferError) {
      toast.error(transferError.response?.data?.message || "Failed to transfer the head");
    }
  };

  const updateInstitutionStatus = async (institutionId, verificationStatus) => {
    setUpdatingId(institutionId);

    try {
      const { data } = await api.patch(
        `/admin/institutions/${institutionId}/status`,
        { verificationStatus }
      );
      replaceItem(institutionId, data.institution);
      toast.success(`Institution marked ${verificationStatus}`);
    } catch (updateError) {
      toast.error(
        updateError.response?.data?.message ||
          "Failed to update institution"
      );
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="admin-institutions">
      <AdminPageHeader
        title="Institutions"
        description="Review institutions and manage their members, admins and head."
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
        placeholder="Search by name, code, or wallet..."
      />

      <AdminError message={error} />

      {isLoading ? (
        <AdminLoading />
      ) : (
        <div className="table-card">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Wallet</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((institution) => (
                  <Fragment key={institution._id}>
                  <tr>
                    <td>
                      <p className="cell-title">{institution.name}</p>
                      <p className="cell-sub">{institution.code}</p>
                    </td>
                    <td className="cell-mono">
                      {shortenAddress(institution.walletAddress || "")}
                    </td>
                    <td>
                      <p>{institution.userId?.name || "—"}</p>
                      <p className="cell-sub">{institution.userId?.email || ""}</p>
                    </td>
                    <td>
                      <StatusBadge
                        tone={statusTone(institution.verificationStatus)}
                      >
                        {institution.verificationStatus}
                      </StatusBadge>
                    </td>
                    <td className="col-actions">
                      <div className="actions">
                        <Button
                          size="sm"
                          variant={membersOf === institution._id ? "default" : "secondary"}
                          aria-expanded={membersOf === institution._id}
                          onClick={() => setMembersOf(membersOf === institution._id ? "" : institution._id)}
                        >
                          <UsersRound className="h-3.5 w-3.5" />
                          Members
                        </Button>
                        <Button
                          size="sm"
                          variant={chainOf === institution._id ? "default" : "secondary"}
                          aria-expanded={chainOf === institution._id}
                          onClick={() => setChainOf(chainOf === institution._id ? "" : institution._id)}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          On-chain
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={updatingId === institution._id}
                          onClick={() =>
                            updateInstitutionStatus(
                              institution._id,
                              "VERIFIED"
                            )
                          }
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-green-700" />
                          Verify
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={updatingId === institution._id}
                          onClick={() =>
                            updateInstitutionStatus(
                              institution._id,
                              "REJECTED"
                            )
                          }
                        >
                          <XCircle className="h-3.5 w-3.5 text-red-700" />
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {membersOf === institution._id && (
                    <tr className="members-row">
                      <td colSpan={5}>
                        <StaffManager
                          endpoint={`/admin/institutions/${institution._id}/members`}
                          canInvite
                          canManage
                          onTransferHead={(member, reason) => transferHead(institution._id, member, reason)}
                        />
                      </td>
                    </tr>
                  )}
                  {chainOf === institution._id && (
                    <tr className="members-row">
                      <td colSpan={5}>
                        <ChainPanel institution={institution} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
                {institutions.length === 0 && (
                  <AdminEmpty colSpan={5} message="No institutions found" />
                )}
              </tbody>
            </table>
          </div>
          <AdminPagination pagination={pagination} onPage={setPage} />
        </div>
      )}
    </div>
  );
}
