// src/modules/supply-chain/routes.jsx

import { Route } from "react-router-dom";
import RequireAuth from "../../auth/RequireAuth";
import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";

import Product from "./pages/layouts/Product";
import ProductDetail from "./pages/layouts/ProductDetail";
import ProductCreate from "./pages/layouts/ProductCreate";
import ProductEdit from "./pages/layouts/ProductEdit";
import ProductRestore from "./pages/layouts/ProductRestore";

const supplychainRoutes = (
  <>
    {/* EMPLOYEE */}
    <Route
      path="/supply-chain/san-pham-tai-san"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <Product />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/san-pham-tai-san/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_CREATE}>
          <ProductCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/san-pham-tai-san/:code"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <ProductDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/san-pham-tai-san/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_UPDATE}>
          <ProductEdit />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/san-pham-tai-san/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_RESTORE}>
          <ProductRestore />
        </RequireAuth>
      }
    />
  </>
);

export default supplychainRoutes;
