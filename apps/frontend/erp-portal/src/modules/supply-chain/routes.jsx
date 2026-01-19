// src/modules/supply-chain/routes.jsx

import { Route } from "react-router-dom";
import RequireAuth from "../../auth/RequireAuth";
import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";

// --- Product Categories ---
import ProductCategory from "./pages/layouts/ProductCategory";
import ProductCategoryDetail from "./pages/layouts/ProductCategoryDetail";
import ProductCategoryCreate from "./pages/layouts/ProductCategoryCreate";
import ProductCategoryEdit from "./pages/layouts/ProductCategoryEdit";
import ProductCategoryRestore from "./pages/layouts/ProductCategoryRestore";

// --- Products ---
import ProductList from "./pages/layouts/ProductList";
import ProductCreate from "./pages/layouts/ProductCreate";
import ProductDetail from "./pages/layouts/ProductDetail";
import ProductEdit from "./pages/layouts/ProductEdit";
import ProductRestore from "./pages/layouts/ProductRestore";

// --- Suppliers ---
import Supplier from "./pages/layouts/Supplier";
import SupplierCreate from "./pages/layouts/SupplierCreate";
import SupplierDetail from "./pages/layouts/SupplierDetail";
import SupplierEdit from "./pages/layouts/SupplierEdit";
import SupplierRestore from "./pages/layouts/SupplierRestore";

// --- Warehouses ---
import Warehouse from "./pages/layouts/Warehouse";
import WarehouseCreate from "./pages/layouts/WarehouseCreate";
import WarehouseDetail from "./pages/layouts/WarehouseDetail";
import WarehouseEdit from "./pages/layouts/WarehouseEdit";
import WarehouseRestore from "./pages/layouts/WarehouseRestore";

// --- Inventory ---
import Inventory from "./pages/layouts/Inventory";
import InventoryCreate from "./pages/layouts/InventoryCreate";
import InventoryDetail from "./pages/layouts/InventoryDetail";
import InventoryEdit from "./pages/layouts/InventoryEdit";
import InventoryRestore from "./pages/layouts/InventoryRestore";

// --- Purchase Request ---
import PurchaseRequest from "./pages/layouts/PurchaseRequest";
import PurchaseRequestCreate from "./pages/layouts/PurchaseRequestCreate";
import PurchaseRequestDetail from "./pages/layouts/PurchaseRequestDetail";
import PurchaseRequestEdit from "./pages/layouts/PurchaseRequestEdit";
import PurchaseRequestRestore from "./pages/layouts/PurchaseRequestRestore";

const supplychainRoutes = (
  <>
    {/* =========================================
        Routes for Product Categories 
       ========================================= */}
    <Route
      path="/supply-chain/danh-muc-san-pham-tai-san"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <ProductCategory />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/danh-muc-san-pham-tai-san/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_CREATE}>
          <ProductCategoryCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/danh-muc-san-pham-tai-san/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_RESTORE}>
          <ProductCategoryRestore />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/danh-muc-san-pham-tai-san/:id"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <ProductCategoryDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/danh-muc-san-pham-tai-san/:id/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_UPDATE}>
          <ProductCategoryEdit />
        </RequireAuth>
      }
    />

    {/* =========================================
        Routes for Products 
       ========================================= */}
    <Route
      path="/supply-chain/san-pham-tai-san"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <ProductList />
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
      path="/supply-chain/san-pham-tai-san/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_RESTORE}>
          <ProductRestore />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/san-pham-tai-san/:id"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <ProductDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/san-pham-tai-san/:id/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_UPDATE}>
          <ProductEdit />
        </RequireAuth>
      }
    />

    {/* =========================================
        Routes for Suppliers 
       ========================================= */}
    <Route
      path="/supply-chain/nha-cung-cap"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <Supplier />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/nha-cung-cap/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_CREATE}>
          <SupplierCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/nha-cung-cap/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_RESTORE}>
          <SupplierRestore />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/nha-cung-cap/:code"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <SupplierDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/nha-cung-cap/:code/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_UPDATE}>
          <SupplierEdit />
        </RequireAuth>
      }
    />

    {/* =========================================
        Routes for Warehouses (Kho hàng)
       ========================================= */}
    <Route
      path="/supply-chain/kho-hang"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <Warehouse />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/kho-hang/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_CREATE}>
          <WarehouseCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/kho-hang/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_RESTORE}>
          <WarehouseRestore />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/kho-hang/:id"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <WarehouseDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/kho-hang/:id/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_UPDATE}>
          <WarehouseEdit />
        </RequireAuth>
      }
    />

    {/* =========================================
        Routes for Inventory (Tồn kho) - NEW
       ========================================= */}
    <Route
      path="/supply-chain/ton-kho"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <Inventory />
        </RequireAuth>
      }
    />
    {/* Lưu ý: Dùng 'nhap-moi' thay vì 'them-moi' để đúng ngữ cảnh Inventory */}
    <Route
      path="/supply-chain/ton-kho/nhap-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_CREATE}>
          <InventoryCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/ton-kho/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_RESTORE}>
          <InventoryRestore />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/ton-kho/:id"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <InventoryDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/ton-kho/:id/dieu-chinh"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_UPDATE}>
          <InventoryEdit />
        </RequireAuth>
      }
    />

    {/* =========================================
        Routes for Purchase Request (Yêu cầu mua hàng)
       ========================================= */}
    <Route
      path="/supply-chain/yeu-cau-mua-hang"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <PurchaseRequest />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/yeu-cau-mua-hang/them-moi"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_CREATE}>
          <PurchaseRequestCreate />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/yeu-cau-mua-hang/khoi-phuc"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_RESTORE}>
          <PurchaseRequestRestore />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/yeu-cau-mua-hang/:id"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
          <PurchaseRequestDetail />
        </RequireAuth>
      }
    />
    <Route
      path="/supply-chain/yeu-cau-mua-hang/:id/chinh-sua"
      element={
        <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_UPDATE}>
          <PurchaseRequestEdit />
        </RequireAuth>
      }
    />
  </>
);

export default supplychainRoutes;