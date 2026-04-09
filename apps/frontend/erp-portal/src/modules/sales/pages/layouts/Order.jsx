// apps/frontend/erp-portal/src/modules/sales/pages/layouts/Order.jsx

import { useNavigate } from "react-router-dom";
import { useState, useMemo, useEffect } from "react";
import { FaPlus } from "react-icons/fa"; 
import OrderTable from "../../components/layouts/OrderTable";
import OrderFilter from "../../components/layouts/OrderFilter";
import PageHeader from "../../../../shared/components/PageHeader";
import { orderService } from "../../services/order.service";
import { customerService } from "../../services/customer.service";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";
import { useClientPagination } from "../../../../shared/hooks/useClientPagination";
import "../../../../shared/styles/document.css";
import "../../../../shared/styles/button.css";

export default function Order() {
  const navigate = useNavigate();

  // 1. Tải dữ liệu
  const { data: orders, loading } = useAsyncData(orderService.getAll);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    let mounted = true;
    customerService.getAll().then((data) => {
      if (mounted) setCustomers(data);
    });
    return () => { mounted = false; };
  }, []);

  // --- STATE BỘ LỌC ---
  const [keyword, setKeyword] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  // --- OPTIONS ---
  const { customerMap, customerOptions, statusMap } = useMemo(() => {
    const cMap = {};
    const cOptions = [];
    (customers || []).forEach((c) => {
      cMap[String(c.id).toUpperCase()] = c.full_name;
      cOptions.push({ 
        value: c.id, 
        label: `${c.full_name} ${c.phone ? `(${c.phone})` : ""}` 
      });
    });
    return { 
        customerMap: cMap, 
        customerOptions: cOptions, 
        statusMap: orderService.CONSTANTS.STATUS_LABEL 
    };
  }, [customers]);

  const paymentMethodOptions = [
    { value: "COD", label: "Tiền mặt (COD)" },
    { value: "MOMO", label: "Ví Momo" },
    { value: "CREDIT_CARD", label: "Thẻ tín dụng" },
    { value: "BANK_TRANSFER", label: "Chuyển khoản" },
  ];

  const statusFilterOptions = [
    { value: "PENDING", label: "Chờ xử lý" },
    { value: "SHIPPING", label: "Đang giao" },
    { value: "COMPLETED", label: "Hoàn thành" },
    { value: "CANCELLED", label: "Đã hủy" },
  ];

  // --- LOGIC LỌC DỮ LIỆU ---
  const filteredOrders = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    
    return (orders || []).filter((item) => {
      const matchKeyword =
        !kw ||
        String(item.id).toLowerCase().includes(kw) ||
        item.shipping_address?.toLowerCase().includes(kw);

      const matchCustomer = !customerId || String(item.customer_id) === String(customerId);
      const matchStatus = !status || item.order_status === status;
      const matchPayment = !paymentMethod || item.payment_method === paymentMethod;

      return matchKeyword && matchCustomer && matchStatus && matchPayment;
    });
  }, [orders, keyword, customerId, status, paymentMethod]);

  // Phân trang Client-side
  const { paginatedData, page, totalPages, goToPrev, goToNext } =
    useClientPagination(filteredOrders, 10);

  const handleClearFilter = () => {
    setKeyword("");
    setCustomerId("");
    setStatus("");
    setPaymentMethod("");
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải danh sách đơn hàng...</div>;

  return (
    <div className="main-document">
      <PageHeader
        title="Quản lý đơn hàng"
        createLabel="Tạo đơn hàng"
        createIcon={<FaPlus />}
        onCreate={() => navigate("/sales/don-hang/them-moi")}
        // Đã xóa prop onRestore
      />

      <OrderFilter
        keyword={keyword}
        customerId={customerId}
        status={status}
        paymentMethod={paymentMethod}
        
        customerOptions={customerOptions}
        statusOptions={statusFilterOptions}
        paymentMethodOptions={paymentMethodOptions}
        
        onKeywordChange={setKeyword}
        onCustomerChange={setCustomerId}
        onStatusChange={setStatus}
        onPaymentMethodChange={setPaymentMethod}
        onClear={handleClearFilter}
      />

      <OrderTable
        data={paginatedData}
        customerMap={customerMap}
        statusMap={statusMap}
        page={page}
        totalPages={totalPages}
        onPrev={goToPrev}
        onNext={goToNext}
        
        onRowClick={(item) => navigate(`/sales/don-hang/${item.id}`)}
        onView={(item) => navigate(`/sales/don-hang/${item.id}`)}
        // Đã xóa props: onEdit, onDelete
      />
    </div>
  );
}