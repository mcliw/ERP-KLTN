package erp.company.hrm.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDocumentDto {
    private Integer documentId;
    private Long employeeId;
    private String documentType;
    private String filePath;
    private LocalDateTime uploadDate;
}