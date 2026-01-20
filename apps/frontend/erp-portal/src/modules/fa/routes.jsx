import { Route } from "react-router-dom";
import RequireAuth from "../../auth/RequireAuth";
import { HRM_PERMISSIONS } from "../../shared/permissions/hrm.permissions";

import FaDashboard from "./pages/layouts/FaDashboard";

import FaAccount from "./pages/layouts/FaAccount";
import FaAccountCreate from "./pages/layouts/FaAccountCreate";
import FaAccountEdit from "./pages/layouts/FaAccountEdit";
import FaAccountDetail from "./pages/layouts/FaAccountDetail";
import FaAccountRestore from "./pages/layouts/FaAccountRestore";

import PostingRules from "./pages/layouts/PostingRules";
import PostingRulesCreate from "./pages/layouts/PostingRulesCreate";
import PostingRulesEdit from "./pages/layouts/PostingRulesEdit";
import PostingRulesDetail from "./pages/layouts/PostingRulesDetail";
import PostingRulesRestore from "./pages/layouts/PostingRulesRestore";

import Receipt from "./pages/layouts/Receipt";
import ReceiptCreate from "./pages/layouts/ReceiptCreate";
import ReceiptEdit from "./pages/layouts/ReceiptEdit";
import ReceiptDetail from "./pages/layouts/ReceiptDetail";
import ReceiptRestore from "./pages/layouts/ReceiptRestore";

import PaymentSlip from "./pages/layouts/PaymentSlip";
import PaymentSlipCreate from "./pages/layouts/PaymentSlipCreate";
import PaymentSlipEdit from "./pages/layouts/PaymentSlipEdit";
import PaymentSlipDetail from "./pages/layouts/PaymentSlipDetail";
import PaymentSlipRestore from "./pages/layouts/PaymentSlipRestore";

const financeRoutes = (
    <>
        <Route
            path="/finance/trang-chu-tai-chinh-ke-toan"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><FaDashboard /></RequireAuth>}
        />

        <Route
            path="/finance/he-thong-tai-khoan"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><FaAccount /></RequireAuth>}
        />
        <Route
            path="/finance/he-thong-tai-khoan/them-moi"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><FaAccountCreate /></RequireAuth>}
        />
        <Route
            path="/finance/he-thong-tai-khoan/khoi-phuc"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><FaAccountRestore /></RequireAuth>}
        />
        <Route
            path="/finance/he-thong-tai-khoan/:id"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><FaAccountDetail /></RequireAuth>}
        />
        <Route
            path="/finance/he-thong-tai-khoan/:id/chinh-sua"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><FaAccountEdit /></RequireAuth>}
        />

        <Route
            path="/finance/dinh-khoan"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><PostingRules /></RequireAuth>}
        />
        <Route
            path="/finance/dinh-khoan/them-moi"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><PostingRulesCreate /></RequireAuth>}
        />
        <Route
            path="/finance/dinh-khoan/khoi-phuc"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><PostingRulesRestore /></RequireAuth>}
        />
        <Route
            path="/finance/dinh-khoan/:id"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><PostingRulesDetail /></RequireAuth>}
        />
        <Route
            path="/finance/dinh-khoan/:id/chinh-sua"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><PostingRulesEdit /></RequireAuth>}
        />

        <Route
            path="/finance/phieu-thu"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><Receipt /></RequireAuth>}
        />
        <Route
            path="/finance/phieu-thu/them-moi"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><ReceiptCreate /></RequireAuth>}
        />
        <Route
            path="/finance/phieu-thu/khoi-phuc"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><ReceiptRestore /></RequireAuth>}
        />
        <Route
            path="/finance/phieu-thu/:id"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><ReceiptDetail /></RequireAuth>}
        />
        <Route
            path="/finance/phieu-thu/:id/chinh-sua"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><ReceiptEdit /></RequireAuth>}
        />

        <Route
            path="/finance/phieu-chi"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><PaymentSlip /></RequireAuth>}
        />
        <Route
            path="/finance/phieu-chi/them-moi"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><PaymentSlipCreate /></RequireAuth>}
        />
        <Route
            path="/finance/phieu-chi/khoi-phuc"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><PaymentSlipRestore /></RequireAuth>}
        />
        <Route
            path="/finance/phieu-chi/:id"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><PaymentSlipDetail /></RequireAuth>}
        />
        <Route
            path="/finance/phieu-chi/:id/chinh-sua"
            element={<RequireAuth allowRoles={HRM_PERMISSIONS.HRM_EMPLOYEE_VIEW}><PaymentSlipEdit /></RequireAuth>}
        />
    </>
);

export default financeRoutes;