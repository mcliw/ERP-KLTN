package erp.company.sales.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class CustomerDTO {
    private UUID id;
    
    // Layout: CustomerForm - Mã khách hàng (KH001)
    private String code; 
    
    // Layout: CustomerForm - Họ và tên
    private String fullName; // Map từ full_name
    
    // Layout: CustomerForm - Email
    private String email;
    
    // Layout: CustomerForm - Số điện thoại
    private String phone;
    
    // Layout: CustomerForm - Địa chỉ
    private String address;
    
    // Layout: CustomerForm - Trạng thái (ACTIVE/INACTIVE)
    // Entity dùng String hoặc Enum, DB có thể cần map sang boolean is_active nếu muốn, 
    // nhưng để đồng bộ với Frontend String "ACTIVE" ta giữ String.
    private String status; 
    
    // Layout: CustomerTable - Ngày tạo
    private LocalDateTime createdAt;
}