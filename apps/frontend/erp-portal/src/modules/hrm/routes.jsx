// src/modules/hrm/routes.jsx
import { Route } from "react-router-dom";
import RequireAuth from "../../auth/RequireAuth";
import { ROLES } from "../../shared/constants/roles";

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
import PositionDocument from "./pages/layouts/PositionDocument";
import PositionCreate from "./pages/layouts/PositionCreate";
import PositionEdit from "./pages/layouts/PositionEdit";
import PositionDetail from "./pages/layouts/PositionDetail";
import Account from "./pages/layouts/Account";
import AccountCreate from "./pages/layouts/AccountCreate";
import AccountEdit from "./pages/layouts/AccountEdit";
import AccountDetail from "./pages/layouts/AccountDetail";
import AccountRestore from "./pages/layouts/AccountRestore";
import Payroll from "./pages/layouts/Payroll";
import PayrollCreate from "./pages/layouts/PayrollCreate";
import PayrollDetail from "./pages/layouts/PayrollDetail";
import Benefit from "./pages/layouts/Benefit";
import BenefitAssign from "./pages/layouts/BenefitAssign";
import OnLeave from "./pages/layouts/OnLeave";
import OnLeaveCreate from "./pages/layouts/OnLeaveCreate";
import OnLeaveEdit from "./pages/layouts/OnLeaveEdit";
import OnLeaveDetail from "./pages/layouts/OnLeaveDetail";

const hrmRoutes = (
  <>
    <Route
      path="/hrm/dashboard"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <HRMDashboard />
        </RequireAuth>
      }
    />

    {/* EMPLOYEE */}
    <Route
      path="/hrm/ho-so-nhan-vien"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <EmployeeDocument />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/them-moi"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <EmployeeCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/:code"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <EmployeeProfile />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <EmployeeEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/ho-so-nhan-vien/khoi-phuc"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <EmployeeDocumentRestore />
        </RequireAuth>
      }
    />

    {/* DEPARTMENT */}
    <Route
      path="/hrm/phong-ban"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <Department />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phong-ban/them-moi"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <DepartmentCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phong-ban/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <DepartmentEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phong-ban/:code"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <DepartmentDetail />
        </RequireAuth>
      }
    />

    {/* POSITION */}
    <Route
      path="/hrm/chuc-vu"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <PositionDocument />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/chuc-vu/them-moi"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <PositionCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/chuc-vu/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <PositionEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/chuc-vu/:code"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <PositionDetail />
        </RequireAuth>
      }
    />

    {/* ACCOUNT */}
    <Route
      path="/hrm/tai-khoan"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <Account />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/them-moi"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <AccountCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <AccountEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/:code"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <AccountDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/tai-khoan/khoi-phuc"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <AccountRestore />
        </RequireAuth>
      }
    />

    {/* PAYROLL (LƯƠNG) */}
    <Route
      path="/hrm/luong"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <Payroll />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/luong/them-ky-luong"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <PayrollCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/luong/:id"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <PayrollDetail />
        </RequireAuth>
      }
    />

    {/* BENEFIT (PHÚC LỢI) */}
    <Route
      path="/hrm/phuc-loi"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <Benefit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/phuc-loi/gan-phuc-loi"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <BenefitAssign />
        </RequireAuth>
      }
    />

    {/* ON LEAVE (NGHỈ PHÉP) */}
    <Route
      path="/hrm/nghi-phep"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <OnLeave />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/nghi-phep/them-moi"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <OnLeaveCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/nghi-phep/:id/chinh-sua"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <OnLeaveEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/hrm/nghi-phep/:id"
      element={
        <RequireAuth allowRoles={[ROLES.ADMIN, ROLES.HR]}>
          <OnLeaveDetail />
        </RequireAuth>
      }
    />
  </>
);

export default hrmRoutes;
