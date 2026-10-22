import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import { getHomePath } from "./lib/roles";
import { NotFound } from "./pages/NotFound";
import { UniversityDashboard } from "./pages/UniversityDashboard";
import { VerificationPortal } from "./pages/VerificationPortal";
import { StudentDashboard } from "./pages/StudentDashboard";
import { BatchUploadPortal } from "./pages/BatchUploadPortal";
import { AdminLayout } from "./layouts/AdminLayout";
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminUniversities } from "./pages/admin/AdminUniversities";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminRoles } from "./pages/admin/AdminRoles";
import { AdminCredentials } from "./pages/admin/AdminCredentials";
import { AdminReports } from "./pages/admin/AdminReports";
import { Faucet } from "./pages/Faucet";
import { Login } from "./pages/Login";
import { Activate } from "./pages/Activate";
import { Profile } from "./pages/Profile";
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
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route path="/verify" element={<VerificationPortal />} />
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/university" element={<UniversityDashboard />} />
      <Route path="/batch-upload" element={<BatchUploadPortal />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="universities" element={<AdminUniversities />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="roles" element={<AdminRoles />} />
        <Route path="credentials" element={<AdminCredentials />} />
        <Route path="reports" element={<AdminReports />} />
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
