import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import {
  getHomePath,
  STUDENT_DESK_PERMISSIONS,
  INSTITUTION_DESK_PERMISSIONS,
} from "./lib/roles";
import { NotFound } from "./pages/NotFound/NotFound";
import { InstitutionDashboard } from "./pages/InstitutionDashboard/InstitutionDashboard";
import { InstitutionStaff } from "./pages/InstitutionStaff/InstitutionStaff";
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
import { AdminActivity } from "./pages/admin/AdminActivity/AdminActivity";
import { AdminApplications } from "./pages/admin/AdminApplications/AdminApplications";
import { AdminSettings } from "./pages/admin/AdminSettings/AdminSettings";
import { Apply } from "./pages/Apply/Apply";
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

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/activate" element={<Activate />} />
      <Route path="/activate/:token" element={<Activate />} />
      <Route path="/apply/:token" element={<Apply />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/verify" element={<VerificationPortal />} />
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
        path="/institution/staff"
        element={
          <ProtectedRoute anyOf={["staff:read"]}>
            <InstitutionStaff />
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
  );
};

export default AppRoutes;
