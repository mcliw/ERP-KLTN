import { Route } from "react-router-dom";
import RequireAuth from "../../auth/RequireAuth";
import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";

import FADashboard from "./pages/layouts/FA_Dashboard";

const supplychainRoutes = (
    <>
        <Route
            path="/supply-chain/trang-chu-ke-toan"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><FADashboard /></RequireAuth>}
        />
    </>
);

export default supplychainRoutes;