package erp.company.sales.repository;

import erp.company.sales.entity.Voucher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Integer>, JpaSpecificationExecutor<Voucher> {

    // Hỗ trợ VoucherForm: Kiểm tra code đã tồn tại trong hệ thống chưa (check bảng detail)
    @Query("SELECT CASE WHEN COUNT(d) > 0 THEN true ELSE false END FROM VoucherDetail d WHERE d.code = :code")
    boolean existsByCode(String code);

    // Hỗ trợ tìm Voucher để áp dụng khi User nhập mã (VoucherForm hoặc Checkout)
    // Query: Join từ Voucher -> VoucherDetail để lấy Voucher cha
    @Query("SELECT v FROM Voucher v JOIN v.details d WHERE d.code = :code")
    Optional<Voucher> findByCode(String code);

    // Hỗ trợ VoucherTable + Filter:
    // Sử dụng Specification để Join bảng VoucherDetail khi search keyword
}