package erp.company.supplychain.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@MappedSuperclass
@Data
public abstract class BaseEntity {
    // Vì một số bảng dùng tên ID khác nhau (pr_id, po_id...) nên ta sẽ define ID ở từng class con
    // Hoặc nếu chuẩn hóa lại DB thì để ID ở đây. Dưới đây mình map theo đúng SQL của bạn.

    @Column(name = "created_at", updatable = false)
    @CreationTimestamp
    private LocalDateTime createdAt;
}