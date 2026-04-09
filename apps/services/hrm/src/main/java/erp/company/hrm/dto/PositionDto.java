package erp.company.hrm.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PositionDTO {
    private Integer id;             // Mapping from positionId
    private String code;            // Form: Mã chức vụ
    private String name;            // Form: Tên chức vụ
    private String description;     // Form: Mô tả
    private Integer capacity;       // Form: Số lượng tối đa (quota/capacity)
    private String status;          // Form: "Hoạt động" | "Ngưng hoạt động"
    
    // Liên kết
    private String departmentCode;  // Form: Chọn phòng ban
    private String departmentName;  // Table: Hiển thị tên phòng ban

    // Fields cho Table
    private Integer assigneeCount;  // Table: Số lượng người đang đảm nhận
}