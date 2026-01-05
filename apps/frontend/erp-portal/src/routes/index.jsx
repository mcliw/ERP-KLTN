import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../auth/layouts/Login";
import MainLayout from "../layouts/MainLayout";
import hrmRoutes from "../modules/hrm/routes";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* ERP Layout */}
        <Route element={<MainLayout />}>
          {hrmRoutes}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
