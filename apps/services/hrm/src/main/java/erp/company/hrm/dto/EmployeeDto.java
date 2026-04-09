package erp.company.hrm.dto;

import lombok.*;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeDTO {
    private Integer id;             // Mapping from employeeId
    private String code;            // Form: code (Mã NV)
    private String name;            // Form: name (Họ tên)
    private String email;           // Form: email
    private String phone;           // Form: phone
    
    // Thông tin cá nhân
    private String gender;          // Form: gender
    private LocalDate dob;          // Form: dob (Ngày sinh)
    private String hometown;        // Form: hometown
    private String cccd;            // Form: cccd (CMND/CCCD)
    private String address;         // Entity có, Form chưa hiển thị rõ nhưng cần thiết
    
    // Công việc
    private String departmentCode;  // Form: department (value select)
    private String departmentName;  // Table
    private String positionCode;    // Form: position (value select)
    private String positionName;    // Table
    private LocalDate joinDate;     // Form: joinDate
    private String status;          // Form: status ("Đang làm việc", "Nghỉ việc")

    // Tài chính
    private String bankAccountName; // Form: Tên tài khoản ngân hàng (Missing in Entity)
    private String bankAccount;     // Form: Số tài khoản
    private String bankName;        // Form: Tên ngân hàng

    // Files & Avatar (Form xử lý upload file, Entity lưu URL)
    private String avatarUrl;       // Avatar preview
    private String cvUrl;           // Form: File CV
    private String contractUrl;     // Form: File Hợp đồng
    private String healthCertUrl;   // Form: File Giấy khám SK
    private String degreeUrl;       // Form: File Bằng cấp
}