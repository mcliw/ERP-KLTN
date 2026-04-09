import { Route } from "react-router-dom";
import RequireAuth from "../../auth/RequireAuth";
import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";

import SalesDashboard from "./pages/layouts/SalesDashboard";

import Order from "./pages/layouts/Order";
import OrderCreate from "./pages/layouts/OrderCreate";
import OrderEdit from "./pages/layouts/OrderEdit";
import OrderDetail from "./pages/layouts/OrderDetail";

import Customer from "./pages/layouts/Customer";
import CustomerCreate from "./pages/layouts/CustomerCreate";
import CustomerEdit from "./pages/layouts/CustomerEdit";
import CustomerDetail from "./pages/layouts/CustomerDetail";
import CustomerRestore from "./pages/layouts/CustomerRestore";

import Voucher from "./pages/layouts/Voucher";
import VoucherCreate from "./pages/layouts/VoucherCreate";
import VoucherEdit from "./pages/layouts/VoucherEdit";
import VoucherDetail from "./pages/layouts/VoucherDetail";
import VoucherRestore from "./pages/layouts/VoucherRestore";

const salesRoutes = (
    <>

        <Route
            path="/sales/trang-chu-ban-hang"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <SalesDashboard />
                </RequireAuth>
            }
        />

    
        <Route
            path="/sales/don-hang"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <Order />
                </RequireAuth>
            }
        />
        <Route
            path="/sales/don-hang/them-moi"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <OrderCreate />
                </RequireAuth>
            }
        />
        <Route
            path="/sales/don-hang/:id"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <OrderDetail />
                </RequireAuth>
            }
        />
        <Route
            path="/sales/don-hang/:id/chinh-sua"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <OrderEdit />
                </RequireAuth>
            }
        />

        <Route
            path="/sales/khach-hang"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <Customer />
                </RequireAuth>
            }
        />
        <Route
            path="/sales/khach-hang/them-moi"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <CustomerCreate />
                </RequireAuth>
            }
        />
        <Route
            path="/sales/khach-hang/khoi-phuc"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <CustomerRestore />
                </RequireAuth>
            }
        />
        <Route
            path="/sales/khach-hang/:id"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <CustomerDetail />
                </RequireAuth>
            }
        />
        <Route
            path="/sales/khach-hang/:id/chinh-sua"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <CustomerEdit />
                </RequireAuth>
            }
        />

        <Route
            path="/sales/ma-giam-gia"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <Voucher />
                </RequireAuth>
            }
        />
        <Route
            path="/sales/ma-giam-gia/them-moi"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <VoucherCreate />
                </RequireAuth>
            }
        />
        <Route
            path="/sales/ma-giam-gia/khoi-phuc"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <VoucherRestore />
                </RequireAuth>
            }
        />
        <Route
            path="/sales/ma-giam-gia/:id"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <VoucherDetail />
                </RequireAuth>
            }
        />
        <Route
            path="/sales/ma-giam-gia/:id/chinh-sua"
            element={
                <RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}>
                <VoucherEdit />
                </RequireAuth>
            }
        />
    </>
);

export default salesRoutes;