// src/routers/index.jsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../auth/layouts/Login";
import ForgotPassword from "../auth/layouts/ForgotPassword";
import MainLayout from "../layouts/MainLayout";
import hrmRoutes from "../modules/hrm/routes";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* AUTH */}
        <Route path="/login" element={<Login />} />
        <Route path="/doi-mat-khau" element={<ForgotPassword />} />

        {/* ERP Layout */}
        <Route element={<MainLayout />}>
          {hrmRoutes}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}