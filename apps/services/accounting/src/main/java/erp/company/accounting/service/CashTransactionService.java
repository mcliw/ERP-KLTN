package erp.company.accounting.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import erp.company.accounting.dto.PaymentSlipDTO;
import erp.company.accounting.dto.ReceiptDTO;
import erp.company.accounting.entity.CashTransaction;
import erp.company.accounting.entity.enums.TransactionType;

import java.util.List;

public interface CashTransactionService {

    // ==========================================
    // CHUNG (VIEW & DELETE)
    // ==========================================
    
    // 1. Phục vụ Table & Filter (Dùng chung hoặc tách param tùy Impl)
    // creditAccountCode: dùng lọc phiếu chi (tiền ra từ đâu)
    // debitAccountCode: dùng lọc phiếu thu (tiền vào đâu)
    Page<CashTransaction> getTransactions(TransactionType type, String keyword, String accountCode, Pageable pageable);

    // 2. Lấy chi tiết
    CashTransaction getTransactionById(Long id);

    // 3. Xóa/Hủy phiếu (Void)
    void deleteTransaction(Long id);

    // ==========================================
    // PHIẾU CHI (PAYMENT SLIP)
    // ==========================================
    
    // 4. Tạo phiếu chi (Có logic xử lý trừ nợ nhiều PO)
    CashTransaction createPaymentSlip(PaymentSlipDTO dto);

    // 5. Cập nhật phiếu chi
    CashTransaction updatePaymentSlip(Long id, PaymentSlipDTO dto);

    // 6. Lấy danh sách ID các Purchase Order đã được thanh toán (để disable trên Form)
    // excludeTransactionId: dùng khi Edit phiếu, để không tính chính nó là đã trả
    List<String> getPaidPurchaseOrderIds(Long excludeTransactionId);

    // ==========================================
    // PHIẾU THU (RECEIPT)
    // ==========================================

    // 7. Tạo phiếu thu
    CashTransaction createReceipt(ReceiptDTO dto);

    // 8. Cập nhật phiếu thu
    CashTransaction updateReceipt(Long id, ReceiptDTO dto);

    // 9. Lấy danh sách ID các Sale Order đã được thu tiền
    List<String> getPaidSaleOrderIds(Long excludeTransactionId);
}