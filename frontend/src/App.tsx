import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useApp } from "./state";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Progress } from "./pages/Progress";
import {
  Courses,
  RegistrationPage,
  RoutinePage,
  ResultsPage,
  AttendancePage,
} from "./pages/Academic";
import {
  FeesPage,
  NoticesPage,
  AdmitPage,
  ProfilePage,
  StudyPage,
} from "./pages/Services";
import { AdminPage } from "./pages/Admin";
function Protected() {
  const { user, loading } = useApp();
  const { t } = useTranslation();
  if (loading)
    return (
      <div className="loading-state full-height" role="status">
        {t("loading")}
      </div>
    );
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
function StudentOnly() {
  const { user } = useApp();
  return user?.role === "student" ? (
    <Outlet />
  ) : (
    <Navigate to="/admin" replace />
  );
}
function AdminOnly() {
  const { user } = useApp();
  return user?.role === "admin" ? (
    <AdminPage />
  ) : (
    <Navigate to="/dashboard" replace />
  );
}
function Home() {
  const { user } = useApp();
  return (
    <Navigate to={user?.role === "admin" ? "/admin" : "/dashboard"} replace />
  );
}
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected />}>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route element={<StudentOnly />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="progress" element={<Progress />} />
            <Route path="courses" element={<Courses />} />
            <Route path="registration" element={<RegistrationPage />} />
            <Route path="routine" element={<RoutinePage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="fees" element={<FeesPage />} />
            <Route path="notices" element={<NoticesPage />} />
            <Route path="admit-card" element={<AdmitPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="admin" element={<AdminOnly />} />
          <Route path="study" element={<StudyPage />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Route>
    </Routes>
  );
}
