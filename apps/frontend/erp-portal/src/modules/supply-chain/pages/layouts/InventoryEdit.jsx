// apps/frontend/erp-portal/src/modules/supply-chain/pages/InventoryEdit.jsx

import { useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import InventoryForm from "../../components/layouts/InventoryForm";
import PageContainer from "../../../../shared/components/PageContainer";
import { inventoryService } from "../../services/inventory.service";
import { useEditResource } from "../../../../shared/hooks/useEditResource";
import { useAsyncData } from "../../../../shared/hooks/useAsyncData";

export default function InventoryEdit() {
  // Lấy ID từ URL (VD: /supply-chain/ton-kho/5001/dieu-chinh)
  const { id } = useParams();

  /* =========================================
   * 1. Tải dữ liệu tham chiếu (Reference Data)
   * ========================================= */
  // Cần tải danh sách để hiển thị tên trong Select box (dù đang ở chế độ readonly)
  // và để lấy tên sản phẩm hiển thị lên Breadcrumb/Title
  const fetchRefData = useCallback(async () => {
    const BASE_URL = "http://localhost:3002";
    const [warehouses, bins, products] = await Promise.all([
      fetch(`${BASE_URL}/warehouses`).then((res) => res.json()),
      fetch(`${BASE_URL}/bin_locations`).then((res) => res.json()),
      fetch(`${BASE_URL}/products`).then((res) => res.json()).catch(() => []),
    ]);
    return { warehouses, bins, products };
  }, []);

  const { data: refData, loading: loadingRef } = useAsyncData(fetchRefData);

  const warehouseOptions = useMemo(() => refData?.warehouses || [], [refData]);
  const binOptions = useMemo(() => refData?.bins || [], [refData]);
  const productOptions = useMemo(() => refData?.products || [], [refData]);

  /* =========================================
   * 2. Logic cập nhật (Edit Logic)
   * ========================================= */
  
  // Breadcrumbs động
  const breadcrumbs = useMemo(() => [
    { label: "Trang chủ", link: "/" },
    { label: "Supply Chain", link: "/supply-chain" },
    { label: "Tồn kho", link: "/supply-chain/ton-kho" },
    { label: `Điều chỉnh: #${id}`, active: true },
  ], [id]);

  // Define fetcher & updater
  const fetcher = useCallback((resourceId) => inventoryService.getById(resourceId), []);
  const updater = useCallback((resourceId, data) => inventoryService.update(resourceId, data), []);

  // Sử dụng Hook chuẩn hóa
  const { 
    data: inventory, 
    loading: loadingResource, 
    submitting, 
    isNotFound, 
    handleUpdate, 
    handleCancel 
  } = useEditResource({
    id,
    fetcher,
    updater,
    successPath: "/supply-chain/ton-kho",
    options: {
      resourceName: "dữ liệu tồn kho",
      // Transform Payload: Quan trọng nhất là ép kiểu số
      transformPayload: (formData) => {
        const { 
          id: _id, 
          updatedAt, 
          quantity_available, // Bỏ qua field tính toán
          ...rest 
        } = formData;

        return {
          ...rest,
          // Đảm bảo gửi lên là số nguyên (Form HTML trả về string)
          quantity_on_hand: Number(rest.quantity_on_hand || 0),
          quantity_allocated: Number(rest.quantity_allocated || 0),
          // Các Key ID giữ nguyên (Form Edit đã disable nhưng vẫn cần gửi để validate BE)
          warehouse_id: Number(rest.warehouse_id),
          bin_id: rest.bin_id,
          product_id: rest.product_id,
          notes: rest.notes || "",
        };
      }
    }
  });

  // Tìm tên sản phẩm để hiển thị title cho đẹp (UX improvement)
  const recordTitle = useMemo(() => {
    if (!inventory || !productOptions.length) return id;
    const prod = productOptions.find(p => String(p.id) === String(inventory.product_id));
    return prod ? prod.name : id;
  }, [inventory, productOptions, id]);

  /* =========================================
   * 3. Render States
   * ========================================= */
  
  // Phải đợi cả 2 nguồn dữ liệu: Record chi tiết + Danh sách tham chiếu
  if (loadingResource || loadingRef) {
    return (
      <PageContainer title="Đang tải dữ liệu..." breadcrumbs={breadcrumbs}>
        <div className="text-center py-5">Đang lấy thông tin tồn kho...</div>
      </PageContainer>
    );
  }

  if (isNotFound) {
    return (
      <PageContainer title="Không tìm thấy" breadcrumbs={breadcrumbs}>
        <div className="alert alert-danger">
          Không tìm thấy bản ghi tồn kho với ID: <strong>{id}</strong>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCancel}>Quay lại danh sách</button>
      </PageContainer>
    );
  }

  // Inventory không có Soft Delete (deletedAt), nên bỏ qua check isDeleted

  return (
    <PageContainer 
      title={`Điều chỉnh tồn: ${recordTitle}`} 
      breadcrumbs={breadcrumbs}
    >
      <InventoryForm
        mode="edit"
        initialData={inventory}
        onSubmit={handleUpdate}
        onCancel={handleCancel}
        disabled={submitting}
        
        // Truyền options danh sách vào Form
        warehouseOptions={warehouseOptions}
        binOptions={binOptions}
        productOptions={productOptions}
      />
    </PageContainer>
  );
}