package erp.company.supplychain.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class SupplierDTO {
    private Integer supplierId;
    private String supplierCode;  // Form: code
    private String supplierName;  // Form: name
    private String taxCode;
    private String contactEmail;
    private String contactPhone;
    private String address;
    private Integer financePartnerId;
    private BigDecimal rating;
    private String note;          // Form: note (Trường mới bổ sung)
    private String status;        // Form: status (Trường mới bổ sung)
    private String contractUrl;   // Form: contractUrl (Trường mới bổ sung)
}