import { Route, Routes } from "react-router-dom";
import { Home } from "./pages/Home";
import { NotFound } from "./pages/NotFound";
import { UniversityDashboard } from "./pages/UniversityDashboard";
import { VerificationPortal } from "./pages/VerificationPortal";
import { StudentDashboard } from "./pages/StudentDashboard";
import { BatchUploadPortal } from "./pages/BatchUploadPortal";
import { AdminLayout } from "./layouts/AdminLayout";
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminUniversities } from "./pages/admin/AdminUniversities";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminCredentials } from "./pages/admin/AdminCredentials";
import { AdminReports } from "./pages/admin/AdminReports";
import { Faucet } from "./pages/Faucet";
import { About } from "./pages/About";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/verify" element={<VerificationPortal />} />
      <Route path="/student" element={<StudentDashboard />} />
      <Route path="/university" element={<UniversityDashboard />} />
      <Route path="/batch-upload" element={<BatchUploadPortal />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminOverview />} />
        <Route path="universities" element={<AdminUniversities />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="credentials" element={<AdminCredentials />} />
        <Route path="reports" element={<AdminReports />} />
      </Route>
      <Route path="/faucet" element={<Faucet />} />
      <Route path="/about" element={<About />} />

      {/* <Route path="/dashboard" element={<Dashboard />} /> */}
      {/* <Route path="/mint" element={<MintNFT />} /> */}
      {/* <Route path="/profile/:id" element={<Profile />} /> */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
