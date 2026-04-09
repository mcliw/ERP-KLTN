package erp.company.sales.service;

import erp.company.sales.dto.CustomerDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;

public interface CustomerService {

    /**
     * Phục vụ: CustomerFilter.jsx & CustomerTable.jsx
     * Chức năng: Lấy danh sách khách hàng có phân trang, tìm kiếm theo từ khóa và lọc theo trạng thái.
     */
    Page<CustomerDTO> getCustomers(String keyword, String status, Pageable pageable);

    /**
     * Phục vụ: Dropdown chọn khách hàng trong OrderForm.jsx
     * Chức năng: Lấy danh sách rút gọn (hoặc tất cả) để hiển thị trong thẻ <select>.
     */
    List<CustomerDTO> getAllCustomersForSelection();

    /**
     * Phục vụ: CustomerForm.jsx (Mode = Edit)
     * Chức năng: Lấy thông tin chi tiết một khách hàng để điền vào form sửa.
     */
    CustomerDTO getCustomerById(UUID id);

    /**
     * Phục vụ: CustomerForm.jsx (Mode = Create)
     * Chức năng: Tạo mới khách hàng. Cần validate trùng Code/Email trong Impl.
     */
    CustomerDTO createCustomer(CustomerDTO customerDTO);

    /**
     * Phục vụ: CustomerForm.jsx (Mode = Edit -> Submit)
     * Chức năng: Cập nhật thông tin khách hàng.
     */
    CustomerDTO updateCustomer(UUID id, CustomerDTO customerDTO);

    /**
     * Phục vụ: CustomerTable.jsx (Nút Xóa)
     * Chức năng: Xóa mềm (Soft Delete) khách hàng khỏi danh sách hiển thị.
     */
    void deleteCustomer(UUID id);
}