import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import FormPage from "@/pages/Form";
import AdminLogin from "@/pages/admin/Login";
import AdminLayout from "@/components/admin/AdminLayout";
import Applicants from "@/pages/admin/Applicants";
import Matchmaking from "@/pages/admin/Matchmaking";
import SettingsPage from "@/pages/admin/Settings";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<FormPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Applicants />} />
          <Route path="matching" element={<Matchmaking />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster richColors position="bottom-right" mobileOffset={{ bottom: 96 }} />
    </>
  );
}
