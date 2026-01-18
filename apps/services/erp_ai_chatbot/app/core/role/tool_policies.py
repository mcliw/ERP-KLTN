# app/core/role/tool_policies.py

TOOL_POLICIES = {
  "danh_sach_don_tang_ca": {
    "required_permissions": ["HRM_REPORT_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["ot_request_id","status","month","year","hours","reason"], "mask": []},
      "DEPT": {"allow": ["ot_request_id","employee_id","status","month","year","hours"], "mask": []},
      "ALL":  {"allow": ["ot_request_id","employee_id","department_code","status","month","year","hours"], "mask": []},
    },
  },
  "chi_tiet_don_tang_ca": {
    "required_permissions": ["HRM_REPORT_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["*"], "mask": []}, "DEPT": {"allow": ["*"], "mask": []}, "ALL": {"allow": ["*"], "mask": []}},
  },
  "tong_hop_tang_ca_thang": {
    "required_permissions": ["HRM_REPORT_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["employee_id","month","year","total_hours"], "mask": []},
      "DEPT": {"allow": ["employee_id","month","year","total_hours"], "mask": []},
      "ALL":  {"allow": ["employee_id","month","year","total_hours"], "mask": []},
    },
  },
  "ot_theo_ngay": {
    "required_permissions": ["HRM_REPORT_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["date","hours","status"], "mask": []}, "DEPT": {"allow": ["employee_id","employee_code","date","hours","status"], "mask": []}, "ALL": {"allow": ["employee_id","employee_code","date","hours","status"], "mask": []}},
  },
  "don_tang_ca_cho_duyet": {
    "required_permissions": ["HRM_REPORT_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {"DEPT": {"allow": ["ot_request_id","employee_id","status","hours","date"], "mask": []}, "ALL": {"allow": ["ot_request_id","employee_id","department_code","status","hours","date"], "mask": []}},
  },

  "hop_dong_hien_tai": {
    "required_permissions": ["HRM_CONTRACT_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["contract_id","start_date","end_date","status","contract_type"], "mask": ["salary_amount"]},
      "DEPT": {"allow": ["employee_id","contract_id","start_date","end_date","status"], "mask": ["salary_amount"]},
      "ALL":  {"allow": ["employee_id","department_code","contract_id","start_date","end_date","status"], "mask": ["salary_amount"]},
    },
  },
  "lich_su_hop_dong": {
    "required_permissions": ["HRM_CONTRACT_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["*"], "mask": ["salary_amount"]}, "DEPT": {"allow": ["*"], "mask": ["salary_amount"]}, "ALL": {"allow": ["*"], "mask": ["salary_amount"]}},
  },
  "hop_dong_sap_het_han": {
    "required_permissions": ["HRM_CONTRACT_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {"DEPT": {"allow": ["employee_id","contract_id","end_date","days_left","department_code"], "mask": ["salary_amount"]}, "ALL": {"allow": ["employee_id","contract_id","end_date","days_left","department_code"], "mask": ["salary_amount"]}},
  },

  "cham_cong_ngay": {
    "required_permissions": ["HRM_REPORT_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["ngay","checkin","checkout","late_minutes"], "mask": []},
                     "DEPT": {"allow": ["employee_id","ngay","checkin","checkout","late_minutes"], "mask": []},
                     "ALL":  {"allow": ["employee_id","department_code","ngay","checkin","checkout","late_minutes"], "mask": []}},
  },
  "cham_cong_hom_nay": {
    "required_permissions": ["HRM_REPORT_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["ngay","checkin","checkout","status"], "mask": []},
                     "DEPT": {"allow": ["employee_id","ngay","checkin","checkout","status"], "mask": []},
                     "ALL":  {"allow": ["employee_id","department_code","ngay","checkin","checkout","status"], "mask": []}},
  },
  "lich_su_cham_cong": {
    "required_permissions": ["HRM_REPORT_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["items","total_days"], "mask": []},
                     "DEPT": {"allow": ["employee_id","items","total_days"], "mask": []},
                     "ALL":  {"allow": ["employee_id","department_code","items","total_days"], "mask": []}},
  },
  "tong_hop_cham_cong_thang": {
    "required_permissions": ["HRM_REPORT_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["month","year","worked_days","late_days","absent_days"], "mask": []},
                     "DEPT": {"allow": ["employee_id","month","year","worked_days","late_days","absent_days"], "mask": []},
                     "ALL":  {"allow": ["employee_id","department_code","month","year","worked_days","late_days","absent_days"], "mask": []}},
  },
  "ngay_thieu_checkout": {
    "required_permissions": ["HRM_REPORT_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["month","year","missing_days"], "mask": []},
                     "DEPT": {"allow": ["employee_id","month","year","missing_days"], "mask": []},
                     "ALL":  {"allow": ["employee_id","department_code","month","year","missing_days"], "mask": []}},
  },

  "danh_sach_don_nghi_phep": {
    "required_permissions": ["HRM_LEAVE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["leave_request_id","status","leave_type","tu_ngay","den_ngay","reason"], "mask": []},
                     "DEPT": {"allow": ["leave_request_id","employee_id","status","leave_type","tu_ngay","den_ngay"], "mask": []},
                     "ALL":  {"allow": ["leave_request_id","employee_id","department_code","status","leave_type","tu_ngay","den_ngay"], "mask": []}},
  },
  "chi_tiet_don_nghi_phep": {
    "required_permissions": ["HRM_LEAVE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["*"], "mask": []}, "DEPT": {"allow": ["*"], "mask": []}, "ALL": {"allow": ["*"], "mask": []}},
  },
  "tong_hop_nghi_phep_nam": {
    "required_permissions": ["HRM_LEAVE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["year","leave_type","used_days","remaining_days"], "mask": []},
                     "DEPT": {"allow": ["employee_id","year","leave_type","used_days","remaining_days"], "mask": []},
                     "ALL":  {"allow": ["employee_id","department_code","year","leave_type","used_days","remaining_days"], "mask": []}},
  },
  "don_nghi_phep_cho_duyet": {
    "required_permissions": ["HRM_LEAVE_APPROVE"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {"DEPT": {"allow": ["leave_request_id","employee_id","status","leave_type","tu_ngay","den_ngay"], "mask": []},
                     "ALL":  {"allow": ["leave_request_id","employee_id","department_code","status","leave_type","tu_ngay","den_ngay"], "mask": []}},
  },

  # SELF tool (ai cũng xem được chính mình)
  "thong_tin_nhan_vien_theo_user": {
    "required_permissions": ["HRM_ACCOUNT_VIEW"],      # <--- đổi từ HRM_EMPLOYEE_VIEW
    "allowed_scopes": ["SELF"],                        # <--- siết chỉ SELF
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["employee_id","employee_code","department_code","position","status","full_name"], "mask": []},
    },
  },

  # Tools xem người khác (chỉ HR_MANAGER/ADMIN hoặc ai có quyền)
  "thong_tin_nhan_vien": {
    "required_permissions": ["HRM_EMPLOYEE_VIEW"],
    "allowed_scopes": ["ALL"],                         # <--- siết ALL nếu bạn muốn chỉ HR xem người khác
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["employee_code","full_name","department_code","position","status"], "mask": ["email","phone"]},
    },
  },

  "tim_nhan_vien": {
    "required_permissions": ["HRM_EMPLOYEE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["employee_id","employee_code","full_name","department_code"], "mask": ["email","phone"]},
    },
  },


  "danh_sach_ky_luong": {
    "required_permissions": ["HRM_SALARY_INFO_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],  
    "default_scope": "DEPT",
    "field_policy": {"DEPT": {"allow": ["payroll_period_id","month","year","status"], "mask": []},
                     "ALL":  {"allow": ["payroll_period_id","month","year","status"], "mask": []}},
  },
  "ky_luong": {
    "required_permissions": ["HRM_SALARY_INFO_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {"DEPT": {"allow": ["*"], "mask": []}, "ALL": {"allow": ["*"], "mask": []}},
  },
  "bang_luong_thang": {
    "required_permissions": ["HRM_SALARY_INFO_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["month","year","payslip_id","net_pay"], "mask": []},
                     "DEPT": {"allow": ["employee_id","month","year","payslip_id","net_pay"], "mask": []},
                     "ALL":  {"allow": ["employee_id","department_code","month","year","payslip_id","net_pay"], "mask": []}},
  },
  "chi_tiet_bang_luong": {
    "required_permissions": ["HRM_SALARY_INFO_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["*"], "mask": []}, "DEPT": {"allow": ["*"], "mask": []}, "ALL": {"allow": ["*"], "mask": []}},
  },
  "lich_su_bang_luong": {
    "required_permissions": ["HRM_SALARY_INFO_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["items"], "mask": []},
                     "DEPT": {"allow": ["employee_id","items"], "mask": []},
                     "ALL":  {"allow": ["employee_id","department_code","items"], "mask": []}},
  },

  "danh_sach_phong_ban": {
    "required_permissions": ["HRM_DEPARTMENT_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {"DEPT": {"allow": ["department_code","department_name"], "mask": []}, "ALL": {"allow": ["department_code","department_name"], "mask": []}},
  },
  "danh_sach_chuc_vu": {
    "required_permissions": ["HRM_POSITION_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {"DEPT": {"allow": ["position_code","position_name"], "mask": []}, "ALL": {"allow": ["position_code","position_name"], "mask": []}},
  },
  "danh_sach_ca_lam": {
    "required_permissions": ["HRM_REPORT_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {"DEPT": {"allow": ["shift_code","shift_name","start_time","end_time"], "mask": []}, "ALL": {"allow": ["shift_code","shift_name","start_time","end_time"], "mask": []}},
  },

  "danh_sach_yeu_cau_thanh_toan_hrm": {
    "required_permissions": ["HRM_SALARY_INFO_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {"DEPT": {"allow": ["request_id","status","payroll_period_id","amount"], "mask": []},
                     "ALL":  {"allow": ["request_id","status","payroll_period_id","amount","department_code"], "mask": []}},
  },
  "yeu_cau_thanh_toan_theo_ky": {
    "required_permissions": ["HRM_SALARY_INFO_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {"DEPT": {"allow": ["*"], "mask": []}, "ALL": {"allow": ["*"], "mask": []}},
  },

  "trang_thai_face_data": {
    "required_permissions": ["HRM_EMPLOYEE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF": {"allow": ["employee_id","has_face_data","updated_at"], "mask": []},
                     "DEPT": {"allow": ["employee_id","has_face_data","updated_at"], "mask": []},
                     "ALL":  {"allow": ["employee_id","department_code","has_face_data","updated_at"], "mask": []}},
  },

  # Mua hàng
  "tim_po_sap_den_han_giao_nhat": {"required_permissions": ["SUPPLYCHAIN_PURCHASE_ORDER_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["po_code","etd","status"],"mask":[]}, "ALL":{"allow":["po_code","etd","status","supplier_code"],"mask":[]}}},
  "tra_cuu_trang_thai_pr": {"required_permissions": ["SUPPLYCHAIN_PURCHASE_REQUISITION_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["pr_code","status"],"mask":[]}, "ALL":{"allow":["pr_code","status","department_code"],"mask":[]}}},
  "chi_tiet_pr": {"required_permissions": ["SUPPLYCHAIN_PURCHASE_REQUISITION_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "pr_chua_xu_ly": {"required_permissions": ["SUPPLYCHAIN_PURCHASE_REQUISITION_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "danh_sach_bao_gia_theo_pr": {"required_permissions": ["SUPPLYCHAIN_QUOTATION_SUPPLIER_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "tra_cuu_trang_thai_don_mua": {"required_permissions": ["SUPPLYCHAIN_PURCHASE_ORDER_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["po_code","status"],"mask":[]}, "ALL":{"allow":["po_code","status","supplier_code"],"mask":[]}}},
  "chi_tiet_po": {"required_permissions": ["SUPPLYCHAIN_PURCHASE_ORDER_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "po_chua_hoan_tat": {"required_permissions": ["SUPPLYCHAIN_PURCHASE_ORDER_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "tien_do_nhap_po": {"required_permissions": ["SUPPLYCHAIN_PURCHASE_ORDER_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["po_code","received_percent"],"mask":[]}, "ALL":{"allow":["po_code","received_percent"],"mask":[]}}},

  # Nhập kho
  "tra_cuu_trang_thai_phieu_nhap": {"required_permissions": ["SUPPLYCHAIN_GOODS_RECEIPTS_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["gr_code","status"],"mask":[]}, "ALL":{"allow":["gr_code","status","warehouse_code"],"mask":[]}}},
  "chi_tiet_phieu_nhap": {"required_permissions": ["SUPPLYCHAIN_GOODS_RECEIPTS_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "danh_sach_gr_theo_po": {"required_permissions": ["SUPPLYCHAIN_GOODS_RECEIPTS_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["po_code","gr_list"],"mask":[]}, "ALL":{"allow":["po_code","gr_list"],"mask":[]}}},
  "doi_chieu_so_luong_po_va_gr": {"required_permissions": ["SUPPLYCHAIN_GOODS_RECEIPTS_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["po_code","lines"],"mask":[]}, "ALL":{"allow":["po_code","lines"],"mask":[]}}},
  "po_nhan_mot_phan": {"required_permissions": ["SUPPLYCHAIN_GOODS_RECEIPTS_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "danh_sach_gr_theo_nha_cung_cap": {"required_permissions": ["SUPPLYCHAIN_GOODS_RECEIPTS_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "gr_gan_day": {"required_permissions": ["SUPPLYCHAIN_GOODS_RECEIPTS_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # Tồn kho
  "tra_ton_kho_theo_tu_khoa": {"required_permissions": ["SUPPLYCHAIN_INVENTORY_CONTROL_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "tra_ton_kho_theo_kho": {"required_permissions": ["SUPPLYCHAIN_INVENTORY_CONTROL_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "tra_ton_kho_theo_kho_va_san_pham": {"required_permissions": ["SUPPLYCHAIN_INVENTORY_CONTROL_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "tra_ton_kho_theo_bin": {"required_permissions": ["SUPPLYCHAIN_INVENTORY_CONTROL_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "canh_bao_ton_kho": {"required_permissions": ["SUPPLYCHAIN_INVENTORY_CONTROL_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "so_luong_dang_giu": {"required_permissions": ["SUPPLYCHAIN_INVENTORY_CONTROL_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["product","allocated_qty"],"mask":[]}, "ALL":{"allow":["product","allocated_qty"],"mask":[]}}},
  "so_luong_kha_dung": {"required_permissions": ["SUPPLYCHAIN_INVENTORY_CONTROL_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["product","available_qty"],"mask":[]}, "ALL":{"allow":["product","available_qty"],"mask":[]}}},
  "kiem_tra_du_hang": {"required_permissions": ["SUPPLYCHAIN_INVENTORY_CONTROL_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["product","so_luong_can","du_hang"],"mask":[]}, "ALL":{"allow":["product","so_luong_can","du_hang"],"mask":[]}}},

  # Xuất kho
  "tra_cuu_trang_thai_phieu_xuat": {"required_permissions": ["SUPPLYCHAIN_GOODS_ISSUE_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["gi_code","status"],"mask":[]}, "ALL":{"allow":["gi_code","status","warehouse_code"],"mask":[]}}},
  "chi_tiet_phieu_xuat": {"required_permissions": ["SUPPLYCHAIN_GOODS_ISSUE_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "danh_sach_gi_theo_loai": {"required_permissions": ["SUPPLYCHAIN_GOODS_ISSUE_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "danh_sach_gi_theo_tham_chieu": {"required_permissions": ["SUPPLYCHAIN_GOODS_ISSUE_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "gi_dang_cho_xu_ly": {"required_permissions": ["SUPPLYCHAIN_GOODS_ISSUE_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "tong_hop_xuat_theo_ngay": {"required_permissions": ["SUPPLYCHAIN_GOODS_ISSUE_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "top_san_pham_xuat_nhieu": {"required_permissions": ["SUPPLYCHAIN_GOODS_ISSUE_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # Danh mục
  "tim_san_pham": {"required_permissions": ["SUPPLYCHAIN_MASTERDATA_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "tim_kho": {"required_permissions": ["SUPPLYCHAIN_MASTERDATA_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # Truy vết
  "truy_vet_bien_dong_ton_kho": {"required_permissions": ["SUPPLYCHAIN_INVENTORY_CONTROL_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # Kiểm kê
  "tra_cuu_trang_thai_kiem_ke": {"required_permissions": ["SUPPLYCHAIN_STOCK_TAKE_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["stocktake_code","status"],"mask":[]}, "ALL":{"allow":["stocktake_code","status"],"mask":[]}}},
  "chi_tiet_kiem_ke": {"required_permissions": ["SUPPLYCHAIN_STOCK_TAKE_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "bao_cao_chenh_lech_kiem_ke": {"required_permissions": ["SUPPLYCHAIN_STOCK_TAKE_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # NCC
  "tim_nha_cung_cap": {"required_permissions": ["SUPPLYCHAIN_MASTERDATA_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "thong_tin_nha_cung_cap": {"required_permissions": ["SUPPLYCHAIN_MASTERDATA_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "xep_hang_ncc_theo_so_po": {"required_permissions": ["SUPPLYCHAIN_PURCHASE_ORDER_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "hieu_suat_giao_hang_ncc": {"required_permissions": ["SUPPLYCHAIN_PURCHASE_ORDER_VIEW"], "allowed_scopes": ["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # RAG
  "tra_cuu_kho_tri_thuc": {"required_permissions": [], "allowed_scopes": ["SELF","DEPT","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["snippets"],"mask":[]}, "DEPT":{"allow":["snippets"],"mask":[]}, "ALL":{"allow":["snippets"],"mask":[]}}},

  "ho_so_khach_hang": {
    "required_permissions": ["SALES_CUSTOMER_VIEW"],
    "allowed_scopes": ["SELF","ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}},
  },
  "danh_sach_dia_chi": {
    "required_permissions": ["SALES_CUSTOMER_VIEW"],
    "allowed_scopes": ["SELF","ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}},
  },
  "tim_khach_hang": {
    "required_permissions": ["SALES_CUSTOMER_VIEW"],
    "allowed_scopes": ["ALL"],    
    "default_scope": "ALL",
    "field_policy": {"ALL":{"allow":["items"],"mask":["email","phone"]}},
  },
  "tra_cuu_trang_thai_don_hang": {
    "required_permissions": ["SALES_ORDER_MANAGEMENT_VIEW"],
    "allowed_scopes": ["SELF","ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF":{"allow":["order_id","status","total","created_at"],"mask":[]}, "ALL":{"allow":["order_id","status","total","created_at","customer_id"],"mask":[]}},
  },
  "chi_tiet_don_hang": {
    "required_permissions": ["SALES_ORDER_MANAGEMENT_VIEW"],
    "allowed_scopes": ["SELF","ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}},
  },
  "don_hang_gan_nhat": {
    "required_permissions": ["SALES_ORDER_MANAGEMENT_VIEW"],
    "allowed_scopes": ["SELF","ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF":{"allow":["order_id","status","total","created_at"],"mask":[]}, "ALL":{"allow":["order_id","status","total","created_at","customer_id"],"mask":[]}},
  },
  "tim_don_hang": {
    "required_permissions": ["SALES_ORDER_MANAGEMENT_VIEW"],
    "allowed_scopes": ["SELF","ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}},
  },
  "don_hang_gia_tri_cao_nhat": {
    "required_permissions": ["SALES_ORDER_MANAGEMENT_VIEW"],
    "allowed_scopes": ["SELF","ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF":{"allow":["order_id","total","created_at"],"mask":[]}, "ALL":{"allow":["order_id","total","created_at","customer_id"],"mask":[]}},
  },
  "chu_don_hang": {
    "required_permissions": ["SALES_ORDER_MANAGEMENT_VIEW"],
    "allowed_scopes": ["SELF","ALL"],
    "default_scope": "SELF",
    "field_policy": {"SELF":{"allow":["order_id","target_user_id"],"mask":[]}, "ALL":{"allow":["order_id","target_user_id"],"mask":[]}},
  },
  "thong_tin_san_pham": {"required_permissions": [], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "bien_the_san_pham": {"required_permissions": [], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "san_pham_theo_hang": {"required_permissions": [], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "tim_san_pham": {"required_permissions": [], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "top_san_pham_ban_chay": {"required_permissions": ["SALES_REPORT_VIEW"], "allowed_scopes":["ALL"], "default_scope":"ALL", "field_policy":{"ALL":{"allow":["items"],"mask":[]}}},
  "top_bien_the_giam_gia_nhieu": {"required_permissions": ["SALES_REPORT_VIEW"], "allowed_scopes":["ALL"], "default_scope":"ALL", "field_policy":{"ALL":{"allow":["items"],"mask":[]}}},
  "kiem_tra_ton_kho_bien_the": {"required_permissions": ["SALES_ORDER_MANAGEMENT_VIEW"], "allowed_scopes":["ALL"], "default_scope":"ALL", "field_policy":{"ALL":{"allow":["product_variant_id","available_qty"],"mask":[]}}},
  "lich_su_mua_hang": {"required_permissions":["SALES_ORDER_MANAGEMENT_VIEW"], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "tong_tien_mua_hang": {"required_permissions":["SALES_REPORT_VIEW"], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["total_amount"],"mask":[]}, "ALL":{"allow":["target_user_id","total_amount"],"mask":[]}}},
  "thong_ke_mua_theo_hang": {"required_permissions":["SALES_REPORT_VIEW"], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "trang_thai_thanh_toan_theo_don": {"required_permissions":["SALES_ORDER_MANAGEMENT_VIEW"], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["order_id","payment_status","paid_amount","due_amount"],"mask":[]}, "ALL":{"allow":["order_id","payment_status","paid_amount","due_amount","target_user_id"],"mask":[]}}},
  "tim_giao_dich_loi": {"required_permissions":["SALES_REPORT_VIEW"], "allowed_scopes":["ALL"], "default_scope":"ALL", "field_policy":{"ALL":{"allow":["items"],"mask":["card_no"]}}},
  "kiem_tra_voucher_hop_le": {"required_permissions": [], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["code","is_valid","discount_amount"],"mask":[]}, "ALL":{"allow":["code","is_valid","discount_amount"],"mask":[]}}},
  "xem_chi_tiet_voucher": {"required_permissions": [], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "ap_voucher_xem_truoc": {"required_permissions": [], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["code","discount_amount","final_amount"],"mask":[]}, "ALL":{"allow":["code","discount_amount","final_amount"],"mask":[]}}},
  "goi_y_voucher_tot_nhat": {"required_permissions": [], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "bao_cao_su_dung_voucher": {"required_permissions":["SALES_REPORT_VIEW"], "allowed_scopes":["ALL"], "default_scope":"ALL", "field_policy":{"ALL":{"allow":["items"],"mask":[]}}},
  "tao_danh_gia": {"required_permissions":["SALES_ORDER_MANAGEMENT_VIEW"], "allowed_scopes":["SELF"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["ok"],"mask":[]}}},
  "tao_danh_gia_kem_anh": {"required_permissions":["SALES_ORDER_MANAGEMENT_VIEW"], "allowed_scopes":["SELF"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["ok"],"mask":[]}}},
  "danh_gia_san_pham": {"required_permissions": [], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "anh_danh_gia_san_pham": {"required_permissions": [], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "thong_ke_danh_gia_san_pham": {"required_permissions": [], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "hang_mua_nhieu_nhat": {"required_permissions":["SALES_REPORT_VIEW"], "allowed_scopes":["SELF","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # 1) Đối tác & COA
  "bp_tim": {"required_permissions":["ACCOUNTING_CHART_OF_ACCOUNTS_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "bp_chi_tiet": {"required_permissions":["ACCOUNTING_CHART_OF_ACCOUNTS_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "bp_danh_sach": {"required_permissions":["ACCOUNTING_CHART_OF_ACCOUNTS_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "coa_tim": {"required_permissions":["ACCOUNTING_CHART_OF_ACCOUNTS_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "coa_chi_tiet": {"required_permissions":["ACCOUNTING_CHART_OF_ACCOUNTS_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "coa_danh_muc": {"required_permissions":["ACCOUNTING_CHART_OF_ACCOUNTS_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # 2) Sổ kế toán & bút toán
  "je_danh_sach": {"required_permissions":["ACCOUNTING_JOURNAL_ENTRY_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "je_chi_tiet": {"required_permissions":["ACCOUNTING_JOURNAL_ENTRY_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "je_theo_chung_tu": {"required_permissions":["ACCOUNTING_JOURNAL_ENTRY_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "so_du_tk": {"required_permissions":["ACCOUNTING_JOURNAL_ENTRY_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["account_code","debit","credit","net"],"mask":[]}, "ALL":{"allow":["account_code","debit","credit","net"],"mask":[]}}},
  "so_cai_tk": {"required_permissions":["ACCOUNTING_JOURNAL_ENTRY_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # 3) Công nợ
  "cong_no_tong_hop": {"required_permissions":["ACCOUNTING_REPORT_EXPORT"], "allowed_scopes":["ALL"], "default_scope":"ALL", "field_policy":{"ALL":{"allow":["*"],"mask":[]}}},
  "ar_no": {"required_permissions":["ACCOUNTING_RECEIPT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "ap_no": {"required_permissions":["ACCOUNTING_PAYMENT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "ar_cong_no_chi_tiet": {"required_permissions":["ACCOUNTING_RECEIPT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "ap_cong_no_chi_tiet": {"required_permissions":["ACCOUNTING_PAYMENT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # 4) AR invoices
  "ar_trang_thai": {"required_permissions":["ACCOUNTING_RECEIPT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "ar_chi_tiet": {"required_permissions":["ACCOUNTING_RECEIPT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "ar_danh_sach": {"required_permissions":["ACCOUNTING_RECEIPT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "ar_qua_han": {"required_permissions":["ACCOUNTING_RECEIPT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # 5) AP invoices
  "ap_trang_thai": {"required_permissions":["ACCOUNTING_PAYMENT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "ap_chi_tiet": {"required_permissions":["ACCOUNTING_PAYMENT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "ap_danh_sach": {"required_permissions":["ACCOUNTING_PAYMENT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "ap_qua_han": {"required_permissions":["ACCOUNTING_PAYMENT_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # 6) Cash & cashflow
  "cash_chi_tiet": {"required_permissions":["ACCOUNTING_CASHFLOW_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "cash_lich_su": {"required_permissions":["ACCOUNTING_CASHFLOW_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "cash_tong_hop_thang": {"required_permissions":["ACCOUNTING_CASHFLOW_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["month","year","inflow","outflow","net"],"mask":[]}, "ALL":{"allow":["month","year","inflow","outflow","net"],"mask":[]}}},
  "cash_gan_nhat": {"required_permissions":["ACCOUNTING_CASHFLOW_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},

  # 7) Fiscal periods
  "ky_hien_tai": {"required_permissions":["ACCOUNTING_JOURNAL_ENTRY_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "ky_danh_sach": {"required_permissions":["ACCOUNTING_JOURNAL_ENTRY_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "ky_trang_thai": {"required_permissions":["ACCOUNTING_JOURNAL_ENTRY_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},

  # 8) Posting rules
  "rule_danh_sach": {"required_permissions":["ACCOUNTING_SETUP_AUTOMATIC_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "rule_tim": {"required_permissions":["ACCOUNTING_SETUP_AUTOMATIC_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["items"],"mask":[]}, "ALL":{"allow":["items"],"mask":[]}}},
  "rule_chi_tiet": {"required_permissions":["ACCOUNTING_SETUP_AUTOMATIC_VIEW"], "allowed_scopes":["DEPT","ALL"], "default_scope":"DEPT", "field_policy":{"DEPT":{"allow":["*"],"mask":[]}, "ALL":{"allow":["*"],"mask":[]}}},
  "rule_giai_thich": {"required_permissions": [], "allowed_scopes":["SELF","DEPT","ALL"], "default_scope":"SELF", "field_policy":{"SELF":{"allow":["explanation"],"mask":[]}, "DEPT":{"allow":["explanation"],"mask":[]}, "ALL":{"allow":["explanation"],"mask":[]}}},
}
