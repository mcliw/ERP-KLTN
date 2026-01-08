// src/modules/hrm/routes.jsx

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
import Payroll from "./pages/layouts/Payroll";
import PayrollCreate from "./pages/layouts/PayrollCreate";
import PayrollDetail from "./pages/layouts/PayrollDetail";
import OnLeave from "./pages/layouts/OnLeave";
import OnLeaveCreate from "./pages/layouts/OnLeaveCreate";
import OnLeaveEdit from "./pages/layouts/OnLeaveEdit";
import OnLeaveDetail from "./pages/layouts/OnLeaveDetail";
import OnLeaveRestore from "./pages/layouts/OnLeaveRestore";

const hrmRoutes = (
  <>
    <Route
      path="/hrm/dashboard"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.DASHBOARD}>
          <HRMDashboard />
        </RequireAuth>
      }
    />

    {/* EMPLOYEE */}
    <Route
      path="/hrm/ho-so-nhan-vien"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.EMPLOYEE_VIEW}>
          <EmployeeDocument />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.EMPLOYEE_VIEW}>
          <EmployeeCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/:code"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.EMPLOYEE_VIEW}>
          <EmployeeProfile />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.EMPLOYEE_EDIT}>
          <EmployeeEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.EMPLOYEE_VIEW}>
          <EmployeeDocumentRestore />
        </RequireAuth>
      }
    />

    {/* DEPARTMENT */}
    <Route
      path="/hrm/phong-ban"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.DEPARTMENT_VIEW}>
          <Department />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phong-ban/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.DEPARTMENT_EDIT}>
          <DepartmentCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phong-ban/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.DEPARTMENT_EDIT}>
          <DepartmentEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phong-ban/:code"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.DEPARTMENT_VIEW}>
          <DepartmentDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phong-ban/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.DEPARTMENT_EDIT}>
          <DepartmentRestore />
        </RequireAuth>
      }
    />

    {/* POSITION */}
    <Route
      path="/hrm/chuc-vu"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.POSITION_VIEW}>
          <PositionDocument />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/chuc-vu/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.POSITION_EDIT}>
          <PositionCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/chuc-vu/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.POSITION_EDIT}>
          <PositionEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/chuc-vu/:code"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.POSITION_VIEW}>
          <PositionDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/chuc-vu/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.POSITION_EDIT}>
          <PositionRestore />
        </RequireAuth>
      }
    />

    {/* ACCOUNT */}
    <Route
      path="/hrm/tai-khoan"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.ACCOUNT}>
          <Account />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.ACCOUNT}>
          <AccountCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.ACCOUNT}>
          <AccountEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/:code"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.ACCOUNT}>
          <AccountDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.ACCOUNT}>
          <AccountRestore />
        </RequireAuth>
      }
    />

    {/* PAYROLL (LƯƠNG) */}
    <Route
      path="/hrm/luong"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.PAYROLL}>
          <Payroll />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/luong/them-ky-luong"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.PAYROLL}>
          <PayrollCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/luong/:id"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.PAYROLL}>
          <PayrollDetail />
        </RequireAuth>
      }
    />

    {/* ON LEAVE (NGHỈ PHÉP) */}
    <Route
      path="/hrm/nghi-phep"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.LEAVE}>
          <OnLeave />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/nghi-phep/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.LEAVE}>
          <OnLeaveCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/nghi-phep/:id/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.LEAVE}>
          <OnLeaveEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/nghi-phep/:id"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.LEAVE}>
          <OnLeaveDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/nghi-phep/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.LEAVE}>
          <OnLeaveRestore />
        </RequireAuth>
      }
    />
  </>
);

export default hrmRoutes;
