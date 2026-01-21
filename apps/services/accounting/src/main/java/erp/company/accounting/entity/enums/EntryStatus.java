package erp.company.accounting.entity.enums;

public enum EntryStatus {
    DRAFT,      // Nháp (chưa ảnh hưởng báo cáo)
    POSTED,     // Đã ghi sổ cái (chính thức)
    CANCELLED   // Đã hủy (Red invoice/Reversal)
}