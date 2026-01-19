// src/modules/hrm/routes.jsx
import React from "react";
import { Route } from "react-router-dom";
import RequireAuth from "../../auth/RequireAuth";
import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";

import HRMDashboard from "./pages/layouts/Dashboard";
import EmployeeDocument from "./pages/layouts/EmployeeDocument";
import EmployeeProfile from "./pages/layouts/EmployeeProfile";
import EmployeeCreate from "./pages/layouts/EmployeeCreate";
import EmployeeEdit from "./pages/layouts/EmployeeEdit";
import EmployeeDocumentRestore from "./pages/layouts/EmployeeDocumentRestore";

import Department from "./pages/layouts/Department";
import DepartmentCreate from "./pages/layouts/DepartmentCreate";
import DepartmentEdit from "./pages/layouts/DepartmentEdit";
import DepartmentDetail from "./pages/layouts/DepartmentDetail";
import DepartmentRestore from "./pages/layouts/DepartmentRestore";

import PositionDocument from "./pages/layouts/PositionDocument";
import PositionCreate from "./pages/layouts/PositionCreate";
import PositionEdit from "./pages/layouts/PositionEdit";
import PositionDetail from "./pages/layouts/PositionDetail";
import PositionRestore from "./pages/layouts/PositionRestore";

import Account from "./pages/layouts/Account";
import AccountCreate from "./pages/layouts/AccountCreate";
import AccountEdit from "./pages/layouts/AccountEdit";
import AccountDetail from "./pages/layouts/AccountDetail";
import AccountRestore from "./pages/layouts/AccountRestore";

import OnLeave from "./pages/layouts/OnLeave";
import OnLeaveCreate from "./pages/layouts/OnLeaveCreate";
import OnLeaveEdit from "./pages/layouts/OnLeaveEdit";
import OnLeaveDetail from "./pages/layouts/OnLeaveDetail";
import OnLeaveRestore from "./pages/layouts/OnLeaveRestore";

import TimeKeeping from "./pages/layouts/TimeKeeping";
import TimeKeepingCreate from "./pages/layouts/TimeKeepingCreate";
import TimeKeepingEdit from "./pages/layouts/TimeKeepingEdit";
import TimeKeepingDetail from "./pages/layouts/TimeKeepingDetail";
import TimeKeepingRestore from "./pages/layouts/TimeKeepingRestore";

import Salary from "./pages/layouts/Salary";
import SalaryCreate from "./pages/layouts/SalaryCreate";
import SalaryEdit from "./pages/layouts/SalaryEdit";
import SalaryDetail from "./pages/layouts/SalaryDetail";
import SalaryRestore from "./pages/layouts/SalaryRestore";

const hrmRoutes = (
  <>
    <Route
      path="/hrm/trang-chu-nhan-su"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_REPORT_VIEW}>
          <HRMDashboard />
        </RequireAuth>
      }
    />

    {/* EMPLOYEE */}
    <Route
      path="/hrm/ho-so-nhan-vien"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <EmployeeDocument />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_CREATE}>
          <EmployeeCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/:code"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <EmployeeProfile />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_UPDATE}>
          <EmployeeEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_RESTORE}>
          <EmployeeDocumentRestore />
        </RequireAuth>
      }
    />

    {/* DEPARTMENT */}
    <Route
      path="/hrm/phong-ban"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_DEPARTMENT_VIEW}>
          <Department />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phong-ban/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_DEPARTMENT_CREATE}>
          <DepartmentCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phong-ban/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_DEPARTMENT_UPDATE}>
          <DepartmentEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phong-ban/:code"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_DEPARTMENT_VIEW}>
          <DepartmentDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phong-ban/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_DEPARTMENT_RESTORE}>
          <DepartmentRestore />
        </RequireAuth>
      }
    />

    {/* POSITION */}
    <Route
      path="/hrm/chuc-vu"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_POSITION_VIEW}>
          <PositionDocument />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/chuc-vu/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_POSITION_CREATE}>
          <PositionCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/chuc-vu/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_POSITION_UPDATE}>
          <PositionEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/chuc-vu/:code"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_POSITION_VIEW}>
          <PositionDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/chuc-vu/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_POSITION_RESTORE}>
          <PositionRestore />
        </RequireAuth>
      }
    />

    {/* ACCOUNT */}
    <Route
      path="/hrm/tai-khoan"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_ACCOUNT_VIEW}>
          <Account />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_ACCOUNT_CREATE}>
          <AccountCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_ACCOUNT_UPDATE}>
          <AccountEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/:code"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_ACCOUNT_VIEW}>
          <AccountDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_ACCOUNT_RESTORE}>
          <AccountRestore />
        </RequireAuth>
      }
    />

    {/* ON LEAVE (NGHỈ PHÉP) */}
    <Route
      path="/hrm/nghi-phep"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_LEAVE_VIEW}>
          <OnLeave />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/nghi-phep/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_LEAVE_CREATE}>
          <OnLeaveCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/nghi-phep/:id/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_LEAVE_UPDATE}>
          <OnLeaveEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/nghi-phep/:id"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_LEAVE_VIEW}>
          <OnLeaveDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/nghi-phep/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_LEAVE_RESTORE}>
          <OnLeaveRestore />
        </RequireAuth>
      }
    />
    {/* TIMEKEEPING */}
    <Route
      path="/hrm/cham-cong"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_TIME_KEEPING_VIEW}>
          <TimeKeeping />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/cham-cong/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_TIME_KEEPING_CREATE}>
          <TimeKeepingCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/cham-cong/:id/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_TIME_KEEPING_UPDATE}>
          <TimeKeepingEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/cham-cong/:id"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_TIME_KEEPING_VIEW}>
          <TimeKeepingDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/cham-cong/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_TIME_KEEPING_RESTORE}>
          <TimeKeepingRestore />
        </RequireAuth>
      }
    />
    {/* SALARY */}
    <Route
      path="/hrm/quan-ly-luong"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_SALARY_INFO_VIEW}>
          <Salary />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/quan-ly-luong/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_SALARY_INFO_CREATE}>
          <SalaryCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/quan-ly-luong/:id/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_SALARY_INFO_UPDATE}>
          <SalaryEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/quan-ly-luong/:id"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_SALARY_INFO_VIEW}>
          <SalaryDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/quan-ly-luong/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_SALARY_INFO_RESTORE}>
          <SalaryRestore />
        </RequireAuth>
      }
    />
  </>
);

export default hrmRoutes;
