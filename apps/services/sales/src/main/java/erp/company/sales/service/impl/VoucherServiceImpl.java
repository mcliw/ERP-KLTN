package erp.company.sales.service.impl;

import erp.company.sales.dto.VoucherDTO;
import erp.company.sales.entity.Voucher;
import erp.company.sales.entity.VoucherConstraint;
import erp.company.sales.entity.VoucherDetail;
import erp.company.sales.repository.VoucherRepository;
import erp.company.sales.service.VoucherService;
import erp.company.sales.specification.VoucherSpecification;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;

@Service
@RequiredArgsConstructor
public class VoucherServiceImpl implements VoucherService {

    private final VoucherRepository voucherRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<VoucherDTO> getVouchers(String keyword, String discountType, String status, Pageable pageable) {
        Specification<Voucher> spec = VoucherSpecification.filter(keyword, discountType, status);
        Page<Voucher> vouchers = voucherRepository.findAll(spec, pageable);
        
        // Map từ Entity (Nested) sang Flat DTO cho Table
        return vouchers.map(this::toFlatDTO);
    }

    @Override
    public VoucherDTO getVoucherById(Integer id) {
        Voucher voucher = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voucher không tồn tại"));
        return toFlatDTO(voucher);
    }

    @Override
    public VoucherDTO findByCode(String code) {
        Voucher voucher = voucherRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Mã khuyến mãi không hợp lệ"));
        return toFlatDTO(voucher);
    }

    @Override
    @Transactional
    public VoucherDTO createVoucher(VoucherDTO dto) {
        // 1. Validate Code
        if (voucherRepository.existsByCode(dto.getCode())) {
            throw new RuntimeException("Mã Voucher (Code) đã tồn tại: " + dto.getCode());
        }

        // 2. Tạo Voucher (Master)
        Voucher voucher = new Voucher();
        voucher.setDiscountType(dto.getDiscountType());
        voucher.setDiscountValue(dto.getDiscountValue());
        voucher.setIsActive("ACTIVE".equals(dto.getStatus()));
        voucher.setCreatedAt(LocalDateTime.now());
        
        // 3. Tạo Detail (Chứa mã Code)
        VoucherDetail detail = new VoucherDetail();
        detail.setCode(dto.getCode().toUpperCase());
        detail.setIsActive(true);
        detail.setVoucher(voucher); // Link reference

        // 4. Tạo Constraint (Điều kiện)
        VoucherConstraint constraint = new VoucherConstraint();
        constraint.setMinOrderAmount(dto.getMinOrderAmount());
        constraint.setMaxDiscountAmount(dto.getMaxDiscountAmount());
        constraint.setVoucher(voucher); // Link reference

        // Link ngược lại để Hibernate tự động save cascade (nếu set CascadeType.ALL)
        // Nếu không dùng Cascade, phải save từng repo. Ở đây giả định CascadeType.ALL
        if (voucher.getDetails() == null) voucher.setDetails(new ArrayList<>());
        voucher.getDetails().add(detail);

        if (voucher.getConstraints() == null) voucher.setConstraints(new ArrayList<>());
        voucher.getConstraints().add(constraint);

        Voucher saved = voucherRepository.save(voucher);
        return toFlatDTO(saved);
    }

    @Override
    @Transactional
    public VoucherDTO updateVoucher(Integer id, VoucherDTO dto) {
        Voucher current = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voucher không tồn tại"));

        // Cập nhật Master
        current.setDiscountType(dto.getDiscountType());
        current.setDiscountValue(dto.getDiscountValue());
        current.setIsActive("ACTIVE".equals(dto.getStatus()));
        current.setUpdatedAt(LocalDateTime.now());

        // Cập nhật Constraint (Giả định list chỉ có 1 phần tử như logic Layout)
        if (!current.getConstraints().isEmpty()) {
            VoucherConstraint c = current.getConstraints().get(0);
            c.setMinOrderAmount(dto.getMinOrderAmount());
            c.setMaxDiscountAmount(dto.getMaxDiscountAmount());
        }

        // Lưu ý: Thường không cho cập nhật Code để đảm bảo toàn vẹn dữ liệu lịch sử
        // Nếu muốn cập nhật Code, cần check duplicate ở đây.

        Voucher saved = voucherRepository.save(current);
        return toFlatDTO(saved);
    }

    @Override
    @Transactional
    public void deleteVoucher(Integer id) {
        Voucher current = voucherRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Voucher không tồn tại"));
        
        current.setDeletedAt(LocalDateTime.now());
        current.setIsActive(false);
        voucherRepository.save(current);
    }

    // --- Mapper: Flatten Entity to DTO ---
    private VoucherDTO toFlatDTO(Voucher entity) {
        VoucherDTO dto = new VoucherDTO();
        dto.setId(entity.getId());
        dto.setDiscountType(entity.getDiscountType());
        dto.setDiscountValue(entity.getDiscountValue());
        dto.setStatus(Boolean.TRUE.equals(entity.getIsActive()) ? "ACTIVE" : "INACTIVE");
        dto.setCreatedAt(entity.getCreatedAt());

        // Lấy Code từ Detail đầu tiên
        if (entity.getDetails() != null && !entity.getDetails().isEmpty()) {
            dto.setCode(entity.getDetails().get(0).getCode());
        }

        // Lấy điều kiện từ Constraint đầu tiên
        if (entity.getConstraints() != null && !entity.getConstraints().isEmpty()) {
            VoucherConstraint c = entity.getConstraints().get(0);
            dto.setMinOrderAmount(c.getMinOrderAmount());
            dto.setMaxDiscountAmount(c.getMaxDiscountAmount());
        }
        return dto;
    }
}