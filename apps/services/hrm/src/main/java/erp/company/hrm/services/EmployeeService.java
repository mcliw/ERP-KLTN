package erp.company.hrm.services;

import erp.company.hrm.entity.Employee;
import java.util.List;

public interface EmployeeService {
    /**
     * Lấy danh sách nhân viên chưa có tài khoản (status = 'YET')
     */
    List<Employee> getUnlinkedEmployees();

    /**
     * Cập nhật trạng thái nhân viên sau khi tạo tài khoản
     * @param employeeCode Mã nhân viên
     */
    void markEmployeeAsLinked(String employeeCode);
}