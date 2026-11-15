import { useAuth } from "../../context/AuthContext";
import { AdminPageHeader } from "../../components/admin/AdminUI";
import { StaffManager } from "../../components/StaffManager/StaffManager";
import "./InstitutionStaff.css";

// College staff for the college picked in "Working in"; the API scopes everything to that college.
export function InstitutionStaff() {
  const { activeMembership, hasPermission } = useAuth();
  const institution = activeMembership?.institutionId;

  return (
    <div className="institution-staff">
      <AdminPageHeader
        title="Staff"
        description={`People who work at ${institution?.name || "your institution"}. Only the Super Admin can add or change Institution Admins.`}
      />
      <div className="table-card">
        {/* key: reload when the user switches college */}
        <StaffManager
          key={institution?._id}
          endpoint="/institution/staff"
          canInvite={hasPermission("staff:invite")}
          canManage={hasPermission("staff:manage")}
        />
      </div>
    </div>
  );
}
