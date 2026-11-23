import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import {
  getHomePath,
  STUDENT_DESK_PERMISSIONS,
  INSTITUTION_DESK_PERMISSIONS,
} from "./lib/roles";
import { NotFound } from "./pages/NotFound/NotFound";
import { AccessRevoked } from "./pages/AccessRevoked/AccessRevoked";
import { InstitutionDashboard } from "./pages/InstitutionDashboard/InstitutionDashboard";
import { InstitutionStaff } from "./pages/InstitutionStaff/InstitutionStaff";
import { InstitutionPrograms } from "./pages/InstitutionPrograms/InstitutionPrograms";
import { InstitutionCredentials } from "./pages/InstitutionCredentials/InstitutionCredentials";
import { InstitutionApprovals } from "./pages/InstitutionApprovals/InstitutionApprovals";
import { InstitutionBatches } from "./pages/InstitutionBatches/InstitutionBatches";
import { InstitutionRoles } from "./pages/InstitutionRoles/InstitutionRoles";
import { InstitutionStudents } from "./pages/InstitutionStudents/InstitutionStudents";
import { InstitutionEnrollments } from "./pages/InstitutionEnrollments/InstitutionEnrollments";
import { InstitutionSettings } from "./pages/InstitutionSettings/InstitutionSettings";
import { InstitutionBilling } from "./pages/InstitutionBilling/InstitutionBilling";
import { VerificationPortal } from "./pages/VerificationPortal/VerificationPortal";
import { StudentDashboard } from "./pages/StudentDashboard/StudentDashboard";
import { BatchUploadPortal } from "./pages/BatchUploadPortal/BatchUploadPortal";
import { AdminLayout } from "./layouts/AdminLayout";
import { AdminOverview } from "./pages/admin/AdminOverview/AdminOverview";
import { AdminInstitutions } from "./pages/admin/AdminInstitutions/AdminInstitutions";
import { AdminUsers } from "./pages/admin/AdminUsers/AdminUsers";
import { AdminRoles } from "./pages/admin/AdminRoles/AdminRoles";
import { AdminCredentials } from "./pages/admin/AdminCredentials/AdminCredentials";
import { AdminReports } from "./pages/admin/AdminReports/AdminReports";
import { AdminRegistrationLinks } from "./pages/admin/AdminRegistrationLinks/AdminRegistrationLinks";
import { AdminActivity, CollegeActivity } from "./pages/admin/AdminActivity/AdminActivity";
import { AdminApplications } from "./pages/admin/AdminApplications/AdminApplications";
import { AdminSettings } from "./pages/admin/AdminSettings/AdminSettings";
import { Apply } from "./pages/Apply/Apply";
import { StudentClaim } from "./pages/StudentClaim/StudentClaim";
import { RecoverWallet } from "./pages/RecoverWallet/RecoverWallet";
import { Faucet } from "./pages/Faucet/Faucet";
import { Login } from "./pages/Login/Login";
import { Activate } from "./pages/Activate/Activate";
import { Profile } from "./pages/Profile/Profile";
import { ProtectedRoute } from "./components/ProtectedRoute";

function RoleRedirect() {
  const { isAuthenticated, isRestoring, user } = useAuth();

  if (isRestoring) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cobalt" />
      </div>
    );
  }

  return (
    <Navigate to={isAuthenticated ? getHomePath(user) : "/login"} replace />
  );
}

// When the server says the user's role is inactive, every page leads to the "access revoked" page.
function RevokedGate({ children }) {
  const { accessRevoked } = useAuth();
  const { pathname } = useLocation();

  if (accessRevoked && pathname !== "/access-revoked") return <Navigate to="/access-revoked" replace />;
  return children;
}

const AppRoutes = () => {
  return (
    <RevokedGate>
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/access-revoked" element={<AccessRevoked />} />
      <Route path="/activate" element={<Activate />} />
      <Route path="/activate/:token" element={<Activate />} />
      <Route path="/apply/:token" element={<Apply />} />
      <Route path="/claim/:token" element={<StudentClaim />} />
      <Route path="/recover/:token" element={<RecoverWallet />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/verify" element={<VerificationPortal />} />
      <Route path="/verify/:assetAddress" element={<VerificationPortal />} />
      <Route
        path="/student"
        element={
          <ProtectedRoute anyOf={STUDENT_DESK_PERMISSIONS}>
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution"
        element={
          <ProtectedRoute anyOf={INSTITUTION_DESK_PERMISSIONS}>
            <InstitutionDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/administration/staff"
        element={
          <ProtectedRoute anyOf={["staff:read"]}>
            <InstitutionStaff />
          </ProtectedRoute>
        }
      />
      <Route
        path="/administration/roles"
        element={
          <ProtectedRoute anyOf={["role:manage"]}>
            <InstitutionRoles />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/students"
        element={
          <ProtectedRoute anyOf={["student:read"]}>
            <InstitutionStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/enrollments"
        element={
          <ProtectedRoute anyOf={["enrollment:read"]}>
            <InstitutionEnrollments />
          </ProtectedRoute>
        }
      />
      <Route
        path="/administration/activity"
        element={
          <ProtectedRoute anyOf={["audit:read"]}>
            <CollegeActivity />
          </ProtectedRoute>
        }
      />
      {/* Old address of the Staff page (before College Administration) */}
      <Route path="/institution/staff" element={<Navigate to="/administration/staff" replace />} />
      <Route
        path="/institution/programs"
        element={
          <ProtectedRoute anyOf={["program:read"]}>
            <InstitutionPrograms />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/approvals"
        element={
          <ProtectedRoute anyOf={["approval:first", "approval:final", "credential:recover", "credential:burn"]}>
            <InstitutionApprovals />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/credentials"
        element={
          <ProtectedRoute anyOf={["credential:read"]}>
            <InstitutionCredentials />
          </ProtectedRoute>
        }
      />
      <Route
        path="/institution/batches"
        element={
          <ProtectedRoute anyOf={["programSession:read"]}>
            <InstitutionBatches />
          </ProtectedRoute>
        }
      />
      {/* Academic years now live on the Settings page */}
      <Route path="/administration/academic-sessions" element={<Navigate to="/administration/settings" replace />} />
      <Route
        path="/administration/billing"
        element={
          <ProtectedRoute anyOf={["billing:read"]}>
            <InstitutionBilling />
          </ProtectedRoute>
        }
      />
      <Route
        path="/administration/settings"
        element={
          <ProtectedRoute anyOf={INSTITUTION_DESK_PERMISSIONS}>
            <InstitutionSettings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/batch-upload"
        element={
          <ProtectedRoute anyOf={["batch:upload"]}>
            <BatchUploadPortal />
          </ProtectedRoute>
        }
      />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="institutions" element={<AdminInstitutions />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="credentials" element={<AdminCredentials />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="registration-links" element={<AdminRegistrationLinks />} />
        <Route path="activity" element={<AdminActivity />} />
        <Route path="applications" element={<AdminApplications />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
      <Route path="/faucet" element={<Faucet />} />

      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      {/* <Route path="/mint" element={<MintNFT />} /> */}
      {/* <Route path="/profile/:id" element={<Profile />} /> */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </RevokedGate>
  );
};

export default AppRoutes;
