TOOL_POLICIES = {
  # =========================
  # HRM - Danh mục
  # =========================
  "danh_sach_phong_ban": {
    "required_permissions": ["HRM_CATALOG_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "SELF": {"allow": ["department_id","department_code","department_name","description"], "mask": []},
      "DEPT": {"allow": ["department_id","department_code","department_name","description"], "mask": []},
      "ALL":  {"allow": ["department_id","department_code","department_name","description"], "mask": []},
    },
  },

  "danh_sach_chuc_vu": {
    "required_permissions": ["HRM_CATALOG_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "SELF": {"allow": ["position_id","position_code","position_name","department_id","quota","description"], "mask": []},
      "DEPT": {"allow": ["position_id","position_code","position_name","department_id","quota","description"], "mask": []},
      "ALL":  {"allow": ["position_id","position_code","position_name","department_id","quota","description"], "mask": []},
    },
  },

  "danh_sach_trang_thai_cham_cong": {
    "required_permissions": ["HRM_CATALOG_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["status"], "mask": []},
      "DEPT": {"allow": ["status"], "mask": []},
      "ALL":  {"allow": ["status"], "mask": []},
    },
  },

  # =========================
  # HRM - Nhân sự
  # =========================
  "tim_nhan_vien": {
    "required_permissions": ["HRM_EMPLOYEE_LOOKUP"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["employee_id","employee_code","full_name","department_id","position_id"], "mask": []},
      "ALL":  {"allow": ["employee_id","employee_code","full_name","department_id","position_id"], "mask": []},
    },
  },

  "thong_tin_nhan_vien": {
    "required_permissions": ["HRM_EMPLOYEE_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {
        "allow": ["employee_id","employee_code","full_name","status_empl","department_code","department_name","position_name","join_date"],
        "mask": ["phone","email","account_id","status"]
      },
      "ALL":  {
        "allow": ["employee_id","employee_code","full_name","status_empl","department_code","department_name","position_name","join_date"],
        "mask": ["phone","email","account_id","status"]
      },
    },
  },

  "thong_tin_nhan_vien_theo_user": {
    "required_permissions": ["HRM_SELF_VIEW"],
    "allowed_scopes": ["SELF"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {
        "allow": ["employee_id","account_id","employee_code","full_name","status_empl","status",
                  "department_id","department_code","department_name","position_id","position_name",
                  "phone","email","join_date"],
        "mask": []
      },
    },
  },

  # =========================
  # HRM - Chấm công
  # =========================
  "cham_cong_ngay": {
    "required_permissions": ["HRM_ATTENDANCE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {
        "allow": ["timesheet_id","work_date","status","check_in_time","check_out_time",
                  "working_hours","paid_work_day","note","attendance_logs"],
        "mask": []
      },
      "DEPT": {
        "allow": ["timesheet_id","work_date","status","check_in_time","check_out_time",
                  "working_hours","paid_work_day","note"],
        "mask": ["attendance_logs"]
      },
      "ALL":  {
        "allow": ["timesheet_id","work_date","status","check_in_time","check_out_time",
                  "working_hours","paid_work_day","note"],
        "mask": ["attendance_logs"]
      },
    },
  },

  "cham_cong_hom_nay": {
    "required_permissions": ["HRM_ATTENDANCE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {
        "allow": ["timesheet_id","work_date","status","check_in_time","check_out_time",
                  "working_hours","paid_work_day","note","attendance_logs"],
        "mask": []
      },
      "DEPT": {
        "allow": ["timesheet_id","work_date","status","check_in_time","check_out_time",
                  "working_hours","paid_work_day","note"],
        "mask": ["attendance_logs"]
      },
      "ALL":  {
        "allow": ["timesheet_id","work_date","status","check_in_time","check_out_time",
                  "working_hours","paid_work_day","note"],
        "mask": ["attendance_logs"]
      },
    },
  },

  "lich_su_cham_cong": {
    "required_permissions": ["HRM_ATTENDANCE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      # SELF: trả full row _ts_row (an toàn vì là chính họ)
      "SELF": {"allow": ["*"], "mask": []},

      # DEPT/ALL: cho xem các cột “attendance/timesheet” cơ bản, che note nếu có
      "DEPT": {"allow": ["timesheet_id","employee_id","work_date",
                        "check_in_time","check_out_time",
                        "working_hours","paid_work_day",
                        "status","created_at","updated_at"],
              "mask": ["note"]},
      "ALL":  {"allow": ["timesheet_id","employee_id","work_date",
                        "check_in_time","check_out_time",
                        "working_hours","paid_work_day",
                        "status","created_at","updated_at"],
              "mask": ["note"]},
    },
  },

  "tong_hop_cham_cong_thang": {
    "required_permissions": ["HRM_ATTENDANCE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["month","year","days_total","present_days","absent_days","leave_days","working_hours","paid_work_day"], "mask": []},
      # code trả không có employee_id/department_code => không add vào allow (tránh mismatch)
      "DEPT": {"allow": ["month","year","days_total","present_days","absent_days","leave_days","working_hours","paid_work_day"], "mask": []},
      "ALL":  {"allow": ["month","year","days_total","present_days","absent_days","leave_days","working_hours","paid_work_day"], "mask": []},
    },
  },

  "ngay_thieu_checkout": {
    "required_permissions": ["HRM_ATTENDANCE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      # data trả dạng: {month, year, missing_checkout_days:[{work_date, check_in_time, status}]}
      "SELF": {"allow": ["month","year","missing_checkout_days"], "mask": []},
      "DEPT": {"allow": ["month","year","missing_checkout_days"], "mask": []},
      "ALL":  {"allow": ["month","year","missing_checkout_days"], "mask": []},
    },
  },

  # =========================
  # HRM - Tăng ca
  # =========================
  "danh_sach_don_tang_ca": {
    "required_permissions": ["HRM_OVERTIME_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["ot_request_id","ot_date","total_hours","working_hours","status","note"], "mask": []},
      "DEPT": {"allow": ["ot_request_id","ot_date","total_hours","working_hours","status"], "mask": ["note"]},
      "ALL":  {"allow": ["ot_request_id","ot_date","total_hours","working_hours","status"], "mask": ["note"]},
    },
  },

  "chi_tiet_don_tang_ca": {
    "required_permissions": ["HRM_OVERTIME_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["*"], "mask": []},
      "DEPT": {
        "allow": ["ot_request_id","employee_id","ot_date","working_hours","total_hours","status","check_in_time","check_out_time"],
        "mask": ["note"]
      },
      "ALL":  {
        "allow": ["ot_request_id","employee_id","ot_date","working_hours","total_hours","status","check_in_time","check_out_time"],
        "mask": ["note"]
      },
    },
  },

  "tong_hop_tang_ca_thang": {
    "required_permissions": ["HRM_OVERTIME_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["month","year","approved_total_hours","ot_days","note"], "mask": []},
      "DEPT": {"allow": ["month","year","approved_total_hours","ot_days"], "mask": ["note"]},
      "ALL":  {"allow": ["month","year","approved_total_hours","ot_days"], "mask": ["note"]},
    },
  },

  "ot_theo_ngay": {
    "required_permissions": ["HRM_OVERTIME_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["date","has_ot","ot_hours"], "mask": []},
      "DEPT": {"allow": ["date","has_ot","ot_hours"], "mask": []},
      "ALL":  {"allow": ["date","has_ot","ot_hours"], "mask": []},
    },
  },

  "don_tang_ca_cho_duyet": {
    "required_permissions": ["HRM_OVERTIME_APPROVE"],
    "allowed_scopes": ["SELF"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["*"], "mask": []},
    },
  },

  # =========================
  # HRM - Nghỉ phép
  # =========================
  "danh_sach_don_nghi_phep": {
    "required_permissions": ["HRM_LEAVE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {
        "allow": ["leave_request_id","employee_id","leave_type","start_date","end_date","total_days",
                  "reason","status","approver_id","rejection_reason","created_at","updated_at"],
        "mask": []
      },
      "DEPT": {
        "allow": ["leave_request_id","employee_id","leave_type","start_date","end_date","total_days",
                  "status","approver_id","created_at","updated_at"],
        "mask": ["reason","rejection_reason"]
      },
      "ALL":  {
        "allow": ["leave_request_id","employee_id","leave_type","start_date","end_date","total_days",
                  "status","approver_id","created_at","updated_at"],
        "mask": ["reason","rejection_reason"]
      },
    },
  },

  "chi_tiet_don_nghi_phep": {
    "required_permissions": ["HRM_LEAVE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["*"], "mask": []},
      "DEPT": {
        "allow": ["leave_request_id","employee_id","leave_type","start_date","end_date","total_days",
                  "status","approver_id","created_at","updated_at"],
        "mask": ["reason","rejection_reason"]
      },
      "ALL":  {
        "allow": ["leave_request_id","employee_id","leave_type","start_date","end_date","total_days",
                  "status","approver_id","created_at","updated_at"],
        "mask": ["reason","rejection_reason"]
      },
    },
  },

  "tong_hop_nghi_phep_nam": {
    "required_permissions": ["HRM_LEAVE_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["employee_id","year","leave_type","approved_total_days","entitlement","used","remaining"], "mask": []},
      "DEPT": {"allow": ["employee_id","year","leave_type","approved_total_days"], "mask": ["entitlement","used","remaining"]},
      "ALL":  {"allow": ["employee_id","year","leave_type","approved_total_days"], "mask": ["entitlement","used","remaining"]},
    },
  },

  "don_nghi_phep_cho_duyet": {
    "required_permissions": ["HRM_LEAVE_APPROVE"],
    "allowed_scopes": ["SELF"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["leave_request_id","employee_id","leave_type","start_date","end_date","total_days","reason","status"], "mask": []},
    },
  },

  # =========================
  # HRM - Hợp đồng lương / Bảng lương
  # =========================
  "hop_dong_hien_tai": {
    "required_permissions": ["HRM_SALARY_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["*"], "mask": []},
      "ALL":  {"allow": ["*"], "mask": []},
    },
  },

  "lich_su_hop_dong": {
    "required_permissions": ["HRM_SALARY_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["*"], "mask": []},
      "ALL":  {"allow": ["*"], "mask": []},
    },
  },

  "hop_dong_dang_hieu_luc_theo_phong_ban": {
    "required_permissions": ["HRM_SALARY_ADMIN"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {
        "allow": ["employee_id","employee_code","full_name","department_code","department_name",
                  "contract_id","effective_date","base_salary","allowance"],
        "mask": []
      },
    },
  },

  "danh_sach_ky_luong": {
    "required_permissions": ["HRM_PAYROLL_VIEW"],
    "allowed_scopes": ["SELF", "DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "SELF": {"allow": ["payroll_period_id","name","month","year","status","standard_working_days"], "mask": []},
      "DEPT": {"allow": ["payroll_period_id","name","month","year","status","standard_working_days"], "mask": []},
      "ALL":  {"allow": ["payroll_period_id","name","month","year","status","standard_working_days","total_employees"], "mask": []},
    },
  },

  "ky_luong": {
    "required_permissions": ["HRM_PAYROLL_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["payroll_period_id","name","month","year","standard_working_days","total_employees","note"], "mask": []},
      "ALL":  {"allow": ["payroll_period_id","name","month","year","standard_working_days","total_employees","note"], "mask": []},
    },
  },

  "bang_luong_thang": {
    "required_permissions": ["HRM_PAYROLL_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["*"], "mask": []},
      "ALL":  {"allow": ["*"], "mask": []},
    },
  },

  "chi_tiet_bang_luong": {
    "required_permissions": ["HRM_PAYROLL_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["*"], "mask": []},
      "ALL":  {"allow": ["*"], "mask": []},
    },
  },

  "lich_su_bang_luong": {
    "required_permissions": ["HRM_PAYROLL_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["*"], "mask": []},
      "ALL":  {"allow": ["*"], "mask": []},
    },
  },

  # =========================
  # HRM - Payment request (tổng hợp từ payslips)
  # =========================
  "danh_sach_yeu_cau_thanh_toan_hrm": {
    "required_permissions": ["HRM_PAYROLL_ADMIN"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {
        "allow": ["payment_request_id","payroll_period_id","request_code","total_amount",
                  "total_employees","paid_count","unpaid_count","status"],
        "mask": ["created_by","created_at","finance_transaction_id"]
      },
    },
  },

  "yeu_cau_thanh_toan_theo_ky": {
    "required_permissions": ["HRM_PAYROLL_ADMIN"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {
        "allow": ["payment_request_id","payroll_period_id","request_code","total_amount",
                  "total_employees","status","note"],
        "mask": ["created_by","created_at","finance_transaction_id"]
      },
    },
  },

  # =========================
  # HRM - Face data
  # =========================
  "trang_thai_face_data": {
    "required_permissions": ["HRM_FACE_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["employee_id","has_active_face_data","avatar_url","face_embedding_dim","note"], "mask": []},
      "ALL":  {"allow": ["employee_id","has_active_face_data","avatar_url","face_embedding_dim","note"], "mask": []},
    },
  },
  # =========================
  # SUPPLY CHAIN
  # =========================
  # ---------- Danh mục ----------
  "tim_san_pham": {
    "required_permissions": ["SCM_CATALOG_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["product_id","sku","product_name","min_stock_level"], "mask": []},
    },
  },
  "tim_kho": {
    "required_permissions": ["SCM_CATALOG_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["warehouse_id","warehouse_code","warehouse_name"], "mask": []},
    },
  },

  # ---------- Mua hàng (PR/PO/RFQ) ----------
  "tim_po_sap_den_han_giao_nhat": {
    "required_permissions": ["SCM_PURCHASE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["po_code","status","order_date","expected_delivery_date"], "mask": []},
    },
  },

  "tra_cuu_trang_thai_pr": {
    "required_permissions": ["SCM_PURCHASE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["pr_code","status","request_date","requester_id","department_id"], "mask": []},
    },
  },
  "chi_tiet_pr": {
    "required_permissions": ["SCM_PURCHASE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["pr_code","status","request_date","reason","items"], "mask": []},
    },
  },
  "pr_chua_xu_ly": {
    "required_permissions": ["SCM_PURCHASE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["pr_code","status","request_date"], "mask": []},
    },
  },
  "danh_sach_bao_gia_theo_pr": {
    "required_permissions": ["SCM_PURCHASE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["rfq_code","supplier_code","supplier_name","total_amount","status","is_selected"], "mask": []},
    },
  },

  "tra_cuu_trang_thai_don_mua": {
    "required_permissions": ["SCM_PURCHASE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["po_code","status","order_date","expected_delivery_date",
                        "supplier_code","supplier_name",
                        "total_amount","tax_amount","discount_amount"], "mask": []},
    },
  },
  "chi_tiet_po": {
    "required_permissions": ["SCM_PURCHASE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["po_code","status","supplier_code","supplier_name","items"], "mask": []},
    },
  },
  "po_chua_hoan_tat": {
    "required_permissions": ["SCM_PURCHASE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["po_code","status","order_date","expected_delivery_date"], "mask": []},
    },
  },
  "tien_do_nhap_po": {
    "required_permissions": ["SCM_PURCHASE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["po_code","status","progress_percent","missing_items"], "mask": []},
    },
  },

  # ---------- Nhà cung cấp ----------
  "tim_nha_cung_cap": {
    "required_permissions": ["SCM_SUPPLIER_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["supplier_id","supplier_code","supplier_name","contact_info"], "mask": []},
    },
  },
  "thong_tin_nha_cung_cap": {
    "required_permissions": ["SCM_SUPPLIER_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["supplier_id","supplier_code","supplier_name","contact_info"], "mask": []},
    },
  },
  "xep_hang_ncc_theo_so_po": {
    "required_permissions": ["SCM_SUPPLIER_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["supplier_code","supplier_name","total_orders"], "mask": []},
    },
  },
  "hieu_suat_giao_hang_ncc": {
    "required_permissions": ["SCM_SUPPLIER_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      # tool có 2 mode: trả object (lọc supplier_code) hoặc list ranking
      "ALL": {"allow": ["supplier_code","supplier_name","total_receipts"], "mask": []},
    },
  },

  # ---------- Nhập kho (GR) ----------
  "tra_cuu_trang_thai_phieu_nhap": {
    "required_permissions": ["SCM_INBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["gr_code","status","receipt_date"], "mask": []},
    },
  },
  "chi_tiet_phieu_nhap": {
    "required_permissions": ["SCM_INBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["gr_code","status","receipt_date","warehouse_code","warehouse_name","items"], "mask": []},
    },
  },
  "danh_sach_gr_theo_po": {
    "required_permissions": ["SCM_INBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["po_code","gr_list"], "mask": []},
    },
  },
  "danh_sach_gr_theo_nha_cung_cap": {
    "required_permissions": ["SCM_INBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["supplier_code","supplier_name","limit","total_returned","gr_list"], "mask": []},
    },
  },
  "gr_gan_day": {
    "required_permissions": ["SCM_INBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["gr_code","status","receipt_date"], "mask": []},
    },
  },
  "doi_chieu_so_luong_po_va_gr": {
    "required_permissions": ["SCM_INBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["po_code","status","items"], "mask": []},
    },
  },
  "po_nhan_mot_phan": {
    "required_permissions": ["SCM_INBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["po_code","status","order_date","expected_delivery_date"], "mask": []},
    },
  },

  # ---------- Xuất kho (GI) ----------
  "tra_cuu_trang_thai_phieu_xuat": {
    "required_permissions": ["SCM_OUTBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["gi_code","status","issue_type","issue_date"], "mask": []},
    },
  },
  "chi_tiet_phieu_xuat": {
    "required_permissions": ["SCM_OUTBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["gi_code","status","issue_type","issue_date","items"], "mask": []},
    },
  },
  "danh_sach_gi_theo_loai": {
    "required_permissions": ["SCM_OUTBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["gi_code","status","issue_type","issue_date"], "mask": []},
    },
  },
  "danh_sach_gi_theo_tham_chieu": {
    "required_permissions": ["SCM_OUTBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["gi_code","status","reference_doc_id","issue_date"], "mask": []},
    },
  },
  "gi_dang_cho_xu_ly": {
    "required_permissions": ["SCM_OUTBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["gi_code","status","issue_type","issue_date"], "mask": []},
    },
  },
  "tong_hop_xuat_theo_ngay": {
    "required_permissions": ["SCM_OUTBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["date","total_quantity_issued"], "mask": []},
    },
  },
  "top_san_pham_xuat_nhieu": {
    "required_permissions": ["SCM_OUTBOUND_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["sku","product_name","total_quantity_issued"], "mask": []},
    },
  },

  # ---------- Tồn kho ----------
  "tra_ton_kho_theo_tu_khoa": {
    "required_permissions": ["SCM_INVENTORY_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["sku","product_name","total_on_hand","total_allocated","total_available"], "mask": []},
    },
  },
  "tra_ton_kho_theo_kho": {
    "required_permissions": ["SCM_INVENTORY_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["warehouse_code","warehouse_name","items"], "mask": []},
    },
  },
  "tra_ton_kho_theo_kho_va_san_pham": {
    "required_permissions": ["SCM_INVENTORY_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["warehouse_code","warehouse_name","items"], "mask": []},
    },
  },
  "tra_ton_kho_theo_bin": {
    "required_permissions": ["SCM_INVENTORY_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["bin_id","bin_code","items"], "mask": []},
    },
  },
  "canh_bao_ton_kho": {
    "required_permissions": ["SCM_INVENTORY_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["low_stock","over_stock","dead_stock"], "mask": []},
    },
  },
  "so_luong_dang_giu": {
    "required_permissions": ["SCM_INVENTORY_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["sku","product_name","allocated"], "mask": []},
    },
  },
  "so_luong_kha_dung": {
    "required_permissions": ["SCM_INVENTORY_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["sku","product_name","available"], "mask": []},
    },
  },
  "kiem_tra_du_hang": {
    "required_permissions": ["SCM_INVENTORY_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["sku","product_name","required_qty","available_qty","is_enough"], "mask": []},
    },
  },

  # ---------- Truy vết biến động ----------
  "truy_vet_bien_dong_ton_kho": {
    "required_permissions": ["SCM_INVENTORY_AUDIT_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["sku","product_name","logs"], "mask": []},
    },
  },

  # ---------- Kiểm kê ----------
  "tra_cuu_trang_thai_kiem_ke": {
    "required_permissions": ["SCM_STOCKTAKE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["stocktake_code","status","warehouse_id"], "mask": []},
    },
  },
  "chi_tiet_kiem_ke": {
    "required_permissions": ["SCM_STOCKTAKE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["stocktake_code","status","items"], "mask": []},
    },
  },
  "bao_cao_chenh_lech_kiem_ke": {
    "required_permissions": ["SCM_STOCKTAKE_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["stocktake_code","variance_items"], "mask": []},
    },
  },

  # ---------- Kho tri thức (RAG) ----------
  "tra_cuu_kho_tri_thuc": {
    "required_permissions": ["SCM_KB_VIEW"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["items","sources","top_k"], "mask": []},  # nếu output của bạn khác keys này thì sửa theo thực tế
    },
  },

  "thong_tin_san_pham": {
    "required_permissions": ["CRM_PRODUCT_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["product_id","name","description","avg_rating","total_sold","total_stock","is_active","brand","category"], "mask": []},
      "ALL":  {"allow": ["product_id","name","description","avg_rating","total_sold","total_stock","is_active","brand","category"], "mask": []},
    },
  },

  "bien_the_san_pham": {
    "required_permissions": ["CRM_PRODUCT_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["product_variant_id","product_id","name","stock","sold","original_price","discount_amount","discount_percent","final_price"], "mask": []},
      "ALL":  {"allow": ["product_variant_id","product_id","name","stock","sold","original_price","discount_amount","discount_percent","final_price"], "mask": []},
    },
  },

  "san_pham_theo_hang": {
    "required_permissions": ["CRM_PRODUCT_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["product_id","name","avg_rating","total_sold","total_stock","is_active","brand_name","category_name"], "mask": []},
      "ALL":  {"allow": ["product_id","name","avg_rating","total_sold","total_stock","is_active","brand_name","category_name"], "mask": []},
    },
  },

  "tim_san_pham": {
    "required_permissions": ["CRM_PRODUCT_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["product_id","name","brand_name","category_name","avg_rating","total_sold","total_stock","is_active"], "mask": []},
      "ALL":  {"allow": ["product_id","name","brand_name","category_name","avg_rating","total_sold","total_stock","is_active"], "mask": []},
    },
  },

  "top_san_pham_ban_chay": {
    "required_permissions": ["CRM_PRODUCT_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["product_id","name","total_sold","avg_rating"], "mask": []},
      "ALL":  {"allow": ["product_id","name","total_sold","avg_rating"], "mask": []},
    },
  },

  "top_bien_the_giam_gia_nhieu": {
    "required_permissions": ["CRM_PRODUCT_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["product_variant_id","product_id","name","original_price","discount_amount","discount_percent","final_price"], "mask": []},
      "ALL":  {"allow": ["product_variant_id","product_id","name","original_price","discount_amount","discount_percent","final_price"], "mask": []},
    },
  },

  "kiem_tra_ton_kho_bien_the": {
    "required_permissions": ["CRM_PRODUCT_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["product_variant_id","product_id","name","stock","sold"], "mask": []},
      "ALL":  {"allow": ["product_variant_id","product_id","name","stock","sold"], "mask": []},
    },
  },

  "tra_cuu_trang_thai_don_hang": {
    "required_permissions": ["CRM_ORDER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["order_id","user_id","order_status","created_at","payment"], "mask": []},
      "ALL":  {"allow": ["order_id","user_id","order_status","created_at","payment"], "mask": []},
    },
  },

  "chi_tiet_don_hang": {
    "required_permissions": ["CRM_ORDER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["order_id","user_id","order_status","created_at","items","total_amount"], "mask": []},
      "ALL":  {"allow": ["order_id","user_id","order_status","created_at","items","total_amount"], "mask": []},
    },
  },

  "don_hang_gan_nhat": {
    "required_permissions": ["CRM_ORDER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["order_id","user_id","order_status","created_at","total_amount"], "mask": []},
      "ALL":  {"allow": ["order_id","user_id","order_status","created_at","total_amount"], "mask": []},
    },
  },

  "tim_don_hang": {
    "required_permissions": ["CRM_ORDER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["order_id","user_id","created_at","order_status","total_amount"], "mask": []},
      "ALL":  {"allow": ["order_id","user_id","created_at","order_status","total_amount"], "mask": []},
    },
  },

  "don_hang_gia_tri_cao_nhat": {
    "required_permissions": ["CRM_ORDER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["order_id","user_id","created_at","order_status","total_amount"], "mask": []},
      "ALL":  {"allow": ["order_id","user_id","created_at","order_status","total_amount"], "mask": []},
    },
  },

  "chu_don_hang": {
    "required_permissions": ["CRM_ORDER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",  # tool này thường để staff check ownership
    "field_policy": {
      "SELF": {"allow": ["order_id","user_id","username","phone","email"], "mask": []},
      "ALL":  {"allow": ["order_id","user_id","username","phone","email"], "mask": []},
    },
  },

  "trang_thai_thanh_toan_theo_don": {
    "required_permissions": ["CRM_PAYMENT_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["order_id","user_id","payment","message"], "mask": []},
      "ALL":  {"allow": ["order_id","user_id","payment","message"], "mask": []},
    },
  },

  "tim_giao_dich_loi": {
    "required_permissions": ["CRM_PAYMENT_ADMIN"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["payment_id","payment_status","payment_method","amount","transaction_id","created_at"], "mask": []},
    },
  },

  "ho_so_khach_hang": {
    "required_permissions": ["CRM_CUSTOMER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      # SELF cho phép xem đủ hồ sơ + default_address
      "SELF": {"allow": ["user_id","username","email","phone","role_name","created_at","updated_at","address_count","default_address"], "mask": []},

      # ALL: vẫn trả như tool, nhưng nếu bạn muốn “an toàn hơn” có thể mask email/phone ở đây.
      "ALL":  {"allow": ["user_id","username","email","phone","role_name","created_at","updated_at","address_count","default_address"], "mask": []},
    },
  },

  "danh_sach_dia_chi": {
    "required_permissions": ["CRM_CUSTOMER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["address_id","city","district","ward","street_address","is_default"], "mask": []},
      "ALL":  {"allow": ["address_id","city","district","ward","street_address","is_default"], "mask": []},
    },
  },

  "tim_khach_hang": {
    "required_permissions": ["CRM_CUSTOMER_LOOKUP"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["user_id","username","email","phone","role_name","created_at"], "mask": []},
    },
  },

  "lich_su_mua_hang": {
    "required_permissions": ["CRM_PURCHASE_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["order_id","user_id","created_at","order_status","total_amount"], "mask": []},
      "ALL":  {"allow": ["order_id","user_id","created_at","order_status","total_amount"], "mask": []},
    },
  },

  "tong_tien_mua_hang": {
    "required_permissions": ["CRM_PURCHASE_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["target_user_id","from_date","to_date","total_spent"], "mask": []},
      "ALL":  {"allow": ["target_user_id","from_date","to_date","total_spent"], "mask": []},
    },
  },

  "thong_ke_mua_theo_hang": {
    "required_permissions": ["CRM_PURCHASE_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["brand_id","brand_name","order_count","total_amount"], "mask": []},
      "ALL":  {"allow": ["brand_id","brand_name","order_count","total_amount"], "mask": []},
    },
  },

  "hang_mua_nhieu_nhat": {
    "required_permissions": ["CRM_REPORT_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["top_brand","ranking"], "mask": []},
      "ALL":  {"allow": ["top_brand","ranking"], "mask": []},
    },
  },

  "kiem_tra_voucher_hop_le": {
    "required_permissions": ["CRM_VOUCHER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["valid","reason","code","voucher_id","discount_type","discount_value","min_order_amount","max_discount_amount"], "mask": []},
      "ALL":  {"allow": ["valid","reason","code","voucher_id","discount_type","discount_value","min_order_amount","max_discount_amount"], "mask": []},
    },
  },

  "xem_chi_tiet_voucher": {
    "required_permissions": ["CRM_VOUCHER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["code","code_is_active","voucher_id","voucher_is_active","discount_type","discount_value","min_order_amount","max_discount_amount"], "mask": []},
      "ALL":  {"allow": ["code","code_is_active","voucher_id","voucher_is_active","discount_type","discount_value","min_order_amount","max_discount_amount"], "mask": []},
    },
  },

  "ap_voucher_xem_truoc": {
    "required_permissions": ["CRM_VOUCHER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["code","order_amount","discount_amount","payable_amount","discount_type","discount_value"], "mask": []},
      "ALL":  {"allow": ["code","order_amount","discount_amount","payable_amount","discount_type","discount_value"], "mask": []},
    },
  },

  "goi_y_voucher_tot_nhat": {
    "required_permissions": ["CRM_VOUCHER_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["order_amount","best_voucher","candidates"], "mask": []},
      "ALL":  {"allow": ["order_amount","best_voucher","candidates"], "mask": []},
    },
  },

  "danh_sach_voucher_dang_active": {
    "required_permissions": ["CRM_VOUCHER_ADMIN"],
    "allowed_scopes": ["ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["code","voucher_id","discount_type","discount_value","is_active"], "mask": []},
    },
  },

  "tao_danh_gia": {
    "required_permissions": ["CRM_REVIEW_WRITE"],
    "allowed_scopes": ["SELF"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["review_id"], "mask": []},
    },
  },

  "tao_danh_gia_kem_anh": {
    "required_permissions": ["CRM_REVIEW_WRITE"],
    "allowed_scopes": ["SELF"],
    "default_scope": "SELF",
    "field_policy": {
      "SELF": {"allow": ["review_id","images_added"], "mask": []},
    },
  },

  "danh_gia_san_pham": {
    "required_permissions": ["CRM_REVIEW_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["rating","content","username","created_at","user_id","review_id"], "mask": []},
      "ALL":  {"allow": ["rating","content","username","created_at","user_id","review_id"], "mask": []},
    },
  },

  "anh_danh_gia_san_pham": {
    "required_permissions": ["CRM_REVIEW_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["img_review_id","review_id","image"], "mask": []},
      "ALL":  {"allow": ["img_review_id","review_id","image"], "mask": []},
    },
  },

  "thong_ke_danh_gia_san_pham": {
    "required_permissions": ["CRM_REVIEW_VIEW"],
    "allowed_scopes": ["SELF", "ALL"],
    "default_scope": "ALL",
    "field_policy": {
      "SELF": {"allow": ["product_id","avg_rating","total_reviews","distribution"], "mask": []},
      "ALL":  {"allow": ["product_id","avg_rating","total_reviews","distribution"], "mask": []},
    },
  },

  # =========================
  # FINANCE - Đối tác (Business Partner) + COA (ít nhạy cảm -> cho DEPT)
  # =========================
  "bp_tim": {
    "required_permissions": ["FIN_BP_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["partner_type","external_id","partner_name","tax_code"], "mask": []},
      "ALL":  {"allow": ["partner_type","external_id","partner_name","tax_code"], "mask": []},
    },
  },
  "bp_danh_sach": {
    "required_permissions": ["FIN_BP_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["partner_type","external_id","partner_name","tax_code"], "mask": []},
      "ALL":  {"allow": ["partner_type","external_id","partner_name","tax_code"], "mask": []},
    },
  },
  "bp_chi_tiet": {
    "required_permissions": ["FIN_BP_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      # contact_info có thể lộ phone/email -> DEPT che, CFO(ALL) xem full
      "DEPT": {"allow": ["partner_id","partner_type","external_id","partner_name","tax_code","created_at","updated_at"],
               "mask": ["contact_info"]},
      "ALL":  {"allow": ["partner_id","partner_type","external_id","partner_name","tax_code","contact_info","created_at","updated_at"],
               "mask": []},
    },
  },

  "coa_tim": {
    "required_permissions": ["FIN_COA_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["account_code","account_name","account_type","is_active","parent_account_id"], "mask": []},
      "ALL":  {"allow": ["account_code","account_name","account_type","is_active","parent_account_id"], "mask": []},
    },
  },
  "coa_danh_muc": {
    "required_permissions": ["FIN_COA_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["account_code","account_name","account_type","is_active","parent_account_id"], "mask": []},
      "ALL":  {"allow": ["account_code","account_name","account_type","is_active","parent_account_id"], "mask": []},
    },
  },
  "coa_chi_tiet": {
    "required_permissions": ["FIN_COA_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["account_id","account_code","account_name","account_type","is_active","parent"], "mask": []},
      "ALL":  {"allow": ["account_id","account_code","account_name","account_type","is_active","parent"], "mask": []},
    },
  },

  # =========================
  # FINANCE - Posting Rules (ít nhạy cảm)
  # =========================
  "rule_danh_sach": {
    "required_permissions": ["FIN_RULE_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["event_code","event_description","module_source","debit_account_id","credit_account_id"], "mask": []},
      "ALL":  {"allow": ["event_code","event_description","module_source","debit_account_id","credit_account_id"], "mask": []},
    },
  },
  "rule_tim": {
    "required_permissions": ["FIN_RULE_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["event_code","event_description","module_source","debit_account_id","credit_account_id"], "mask": []},
      "ALL":  {"allow": ["event_code","event_description","module_source","debit_account_id","credit_account_id"], "mask": []},
    },
  },
  "rule_chi_tiet": {
    "required_permissions": ["FIN_RULE_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["rule_id","event_code","event_description","module_source","debit","credit"], "mask": []},
      "ALL":  {"allow": ["rule_id","event_code","event_description","module_source","debit","credit"], "mask": []},
    },
  },
  "rule_giai_thich": {
    "required_permissions": ["FIN_RULE_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["rule_id","event_code","event_description","module_source","debit","credit"], "mask": []},
      "ALL":  {"allow": ["rule_id","event_code","event_description","module_source","debit","credit"], "mask": []},
    },
  },

  # =========================
  # FINANCE - Kỳ kế toán (nhạy vừa: closed_by_user_id)
  # =========================
  "ky_hien_tai": {
    "required_permissions": ["FIN_PERIOD_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      # DEPT: không cần closed_by_user_id
      "DEPT": {"allow": ["as_of","period"], "mask": ["closed_by_user_id"]},
      "ALL":  {"allow": ["as_of","period"], "mask": []},
    },
  },
  "ky_danh_sach": {
    "required_permissions": ["FIN_PERIOD_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["period_id","period_name","start_date","end_date","status"], "mask": []},
      "ALL":  {"allow": ["period_id","period_name","start_date","end_date","status"], "mask": []},
    },
  },
  "ky_trang_thai": {
    "required_permissions": ["FIN_PERIOD_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["period_id","period_name","start_date","end_date","status","closed_at"], "mask": ["closed_by_user_id"]},
      "ALL":  {"allow": ["period_id","period_name","start_date","end_date","status","closed_at","closed_by_user_id"], "mask": []},
    },
  },

  # =========================
  # FINANCE - AR (Receivable)
  # =========================
  "ar_trang_thai": {
    "required_permissions": ["FIN_AR_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["invoice_id","ref","invoice_date","due_date","payment_status","total_amount","received_amount","outstanding","customer","entry_id"], "mask": []},
      "ALL":  {"allow": ["invoice_id","ref","invoice_date","due_date","payment_status","total_amount","received_amount","outstanding","customer","entry_id"], "mask": []},
    },
  },
  "ar_danh_sach": {
    "required_permissions": ["FIN_AR_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["invoice_id","ref","invoice_date","due_date","payment_status","total_amount","received_amount","outstanding",
                         "customer_external_id","customer_name","entry_id"], "mask": []},
      "ALL":  {"allow": ["invoice_id","ref","invoice_date","due_date","payment_status","total_amount","received_amount","outstanding",
                         "customer_external_id","customer_name","entry_id"], "mask": []},
    },
  },
  "ar_qua_han": {
    "required_permissions": ["FIN_AR_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["as_of","rows"], "mask": []},
      "ALL":  {"allow": ["as_of","rows"], "mask": []},
    },
  },
  "ar_chi_tiet": {
    "required_permissions": ["FIN_AR_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      # journal_entry có reference_no/status -> vẫn ok cho AR
      "DEPT": {"allow": ["invoice_id","ref","invoice_date","due_date","total_amount","received_amount","outstanding","payment_status","customer","journal_entry"], "mask": []},
      "ALL":  {"allow": ["invoice_id","ref","invoice_date","due_date","total_amount","received_amount","outstanding","payment_status","customer","journal_entry"], "mask": []},
    },
  },

  # =========================
  # FINANCE - AP (Payable)
  # =========================
  "ap_trang_thai": {
    "required_permissions": ["FIN_AP_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["invoice_id","ref","invoice_date","due_date","payment_status","total_amount","paid_amount","outstanding","supplier","entry_id"], "mask": []},
      "ALL":  {"allow": ["invoice_id","ref","invoice_date","due_date","payment_status","total_amount","paid_amount","outstanding","supplier","entry_id"], "mask": []},
    },
  },
  "ap_danh_sach": {
    "required_permissions": ["FIN_AP_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["invoice_id","ref","invoice_date","due_date","payment_status","total_amount","paid_amount","outstanding",
                         "supplier_external_id","supplier_name","entry_id"], "mask": []},
      "ALL":  {"allow": ["invoice_id","ref","invoice_date","due_date","payment_status","total_amount","paid_amount","outstanding",
                         "supplier_external_id","supplier_name","entry_id"], "mask": []},
    },
  },
  "ap_qua_han": {
    "required_permissions": ["FIN_AP_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["as_of","rows"], "mask": []},
      "ALL":  {"allow": ["as_of","rows"], "mask": []},
    },
  },
  "ap_chi_tiet": {
    "required_permissions": ["FIN_AP_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["invoice_id","ref","invoice_date","due_date","total_amount","paid_amount","outstanding","payment_status","supplier","journal_entry"], "mask": []},
      "ALL":  {"allow": ["invoice_id","ref","invoice_date","due_date","total_amount","paid_amount","outstanding","payment_status","supplier","journal_entry"], "mask": []},
    },
  },

  # =========================
  # FINANCE - Công nợ (AR/AP summary)
  # =========================
  "ar_no": {
    "required_permissions": ["FIN_AR_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["as_of","tong_phai_thu","da_thu","con_lai","top_doi_tac"], "mask": []},
      "ALL":  {"allow": ["as_of","tong_phai_thu","da_thu","con_lai","top_doi_tac"], "mask": []},
    },
  },
  "ap_no": {
    "required_permissions": ["FIN_AP_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["as_of","tong_phai_tra","da_tra","con_lai","top_doi_tac"], "mask": []},
      "ALL":  {"allow": ["as_of","tong_phai_tra","da_tra","con_lai","top_doi_tac"], "mask": []},
    },
  },
  "cong_no_tong_hop": {
    "required_permissions": ["FIN_DEBT_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["as_of","ar_con_lai","ap_con_lai","net_receivable_minus_payable"], "mask": []},
      "ALL":  {"allow": ["as_of","ar_con_lai","ap_con_lai","net_receivable_minus_payable"], "mask": []},
    },
  },
  "ar_cong_no_chi_tiet": {
    "required_permissions": ["FIN_AR_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["customer","as_of","invoices"], "mask": []},
      "ALL":  {"allow": ["customer","as_of","invoices"], "mask": []},
    },
  },
  "ap_cong_no_chi_tiet": {
    "required_permissions": ["FIN_AP_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["supplier","as_of","invoices"], "mask": []},
      "ALL":  {"allow": ["supplier","as_of","invoices"], "mask": []},
    },
  },

  # =========================
  # FINANCE - Thu/chi (Treasury) (rất nhạy cảm: bank_account_number)
  # =========================
  "cash_lich_su": {
    "required_permissions": ["FIN_CASH_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      # DEPT: che bank info (dù list không có bank_account_number)
      "DEPT": {"allow": ["transaction_id","transaction_type","amount","payment_method","reference_doc_id","created_at","entry_id"], "mask": []},
      "ALL":  {"allow": ["transaction_id","transaction_type","amount","payment_method","reference_doc_id","created_at","entry_id"], "mask": []},
    },
  },
  "cash_gan_nhat": {
    "required_permissions": ["FIN_CASH_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["since","days","rows"], "mask": []},
      "ALL":  {"allow": ["since","days","rows"], "mask": []},
    },
  },
  "cash_tong_hop_thang": {
    "required_permissions": ["FIN_CASH_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["month","year","total_receipt","total_payment","net_cash_flow"], "mask": []},
      "ALL":  {"allow": ["month","year","total_receipt","total_payment","net_cash_flow"], "mask": []},
    },
  },
  "cash_chi_tiet": {
    "required_permissions": ["FIN_CASH_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      # bank_account_number nhạy cảm -> DEPT che, ALL cho CFO xem
      "DEPT": {"allow": ["transaction_id","transaction_type","amount","payment_method","reference_doc_id","created_at","journal_entry"],
               "mask": ["bank_account_number"]},
      "ALL":  {"allow": ["transaction_id","transaction_type","amount","payment_method","bank_account_number","reference_doc_id","created_at","journal_entry"],
               "mask": []},
    },
  },

  # =========================
  # FINANCE - Sổ kế toán (cực nhạy cảm)
  # =========================
  "je_danh_sach": {
    "required_permissions": ["FIN_JE_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      # DEPT: xem list mức header ok
      "DEPT": {"allow": ["entry_id","transaction_date","reference_no","source_module","status","total_amount","description","fiscal_period_id"], "mask": []},
      "ALL":  {"allow": ["entry_id","transaction_date","reference_no","source_module","status","total_amount","description","fiscal_period_id"], "mask": []},
    },
  },
  "je_theo_chung_tu": {
    "required_permissions": ["FIN_JE_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      # output y hệt je_chi_tiet, nhưng executor sẽ enforce permission trước
      "DEPT": {"allow": ["entry_id","reference_no","transaction_date","posting_date","description","source_module","status",
                         "fiscal_period_id","total_amount","total_debit","total_credit"],
               "mask": ["lines"]},
      "ALL":  {"allow": ["entry_id","reference_no","transaction_date","posting_date","description","source_module","status",
                         "fiscal_period_id","total_amount","total_debit","total_credit","lines"],
               "mask": []},
    },
  },
  "je_chi_tiet": {
    "required_permissions": ["FIN_JE_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      # Lines lộ COA + partner + description -> DEPT chỉ xem tổng, ALL (CFO) xem full lines
      "DEPT": {"allow": ["entry_id","reference_no","transaction_date","posting_date","description","source_module","status",
                         "fiscal_period_id","total_amount","total_debit","total_credit"],
               "mask": ["lines"]},
      "ALL":  {"allow": ["entry_id","reference_no","transaction_date","posting_date","description","source_module","status",
                         "fiscal_period_id","total_amount","total_debit","total_credit","lines"],
               "mask": []},
    },
  },

  "so_du_tk": {
    "required_permissions": ["FIN_LEDGER_VIEW"],
    "allowed_scopes": ["DEPT", "ALL"],
    "default_scope": "DEPT",
    "field_policy": {
      "DEPT": {"allow": ["account_code","account_name","account_type","from_date","to_date","posted_only",
                         "debit_total","credit_total","net_debit_minus_credit"],
               "mask": []},
      "ALL":  {"allow": ["account_code","account_name","account_type","from_date","to_date","posted_only",
                         "debit_total","credit_total","net_debit_minus_credit"],
               "mask": []},
    },
  },
  "so_cai_tk": {
    "required_permissions": ["FIN_LEDGER_VIEW"],
    "allowed_scopes": ["ALL"],          # CHỐT: chỉ CFO/ADMIN (tránh lộ partner/line_desc theo DEPT)
    "default_scope": "ALL",
    "field_policy": {
      "ALL": {"allow": ["account_code","account_name","rows"], "mask": []},
    },
  },

}



