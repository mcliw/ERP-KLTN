import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import StatCard from "../../components/layouts/StatCard";
import QuickAction from "../../components/layouts/QuickAction";
import EmployeeTable from "../../components/layouts/EmployeeTable";
import EmployeeFilter from "../../components/layouts/EmployeeFilter";
import { FaUserPlus, FaClock, FaMoneyBill, FaSearch } from "react-icons/fa";
import "../styles/dashboard.css";

export default function HRMDashboard() {
    const EMPLOYEES = [
        {
            code: "NV001",
            name: "Nguyễn Văn A",
            gender: "Nam",
            dob: "15/08/1990",
            email: "a@gmail.com",
            phone: "0123456789",
            department: "IT",
            position: "Lập trình viên",
            joinDate: "01/10/2025",
            status: "Đang làm việc",
        },
        {
            code: "NV002",
            name: "Trần Thị B",
            gender: "Nữ",
            dob: "03/10/1995",
            email: "b@gmail.com",
            phone: "0123456788",
            department: "HR",
            position: "Quản lý nhân sự",
            joinDate: "03/10/2025",
            status: "Đang làm việc",
        },
    ];

    const departmentOptions = [
        { label: "IT", value: "IT" },
        { label: "HR", value: "HR" },
    ];

    const statusOptions = [
        { label: "Đang làm việc", value: "Đang làm việc" },
        { label: "Nghỉ việc", value: "Nghỉ việc" },
    ];

    const navigate = useNavigate();

    const [keyword, setKeyword] = useState("");
    const [department, setDepartment] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);

    const pageSize = 5;

    const filteredEmployees = useMemo(() => {
        return EMPLOYEES.filter(
        (e) =>
            (e.name.toLowerCase().includes(keyword.toLowerCase()) ||
            e.email.toLowerCase().includes(keyword.toLowerCase())) &&
            (department ? e.department === department : true) &&
            (status ? e.status === status : true)
        );
    }, [keyword, department, status]);

    const totalPages = Math.ceil(filteredEmployees.length / pageSize);

    const paginatedEmployees = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredEmployees.slice(start, start + pageSize);
    }, [filteredEmployees, page]);

    return (
        <div className="dashboard-wrap">
            <h1>HRM Dashboard</h1>
            <h3 className="section-title">Thống kê tổng quan Quản lý nhân sự</h3>

            {/* STATS */}
            <div className="stats">
                <StatCard title="Tổng nhân viên" value="128" />
                <StatCard title="Đang làm việc" value="120" />
                <StatCard title="Nghỉ phép hôm nay" value="5" />
                <StatCard title="Phòng ban" value="8" />
            </div>

            {/* QUICK ACTIONS */}
            <h3 className="section-title">Thao tác nhanh</h3>
            <div className="actions">
                <QuickAction
                    label="Thêm nhân viên"
                    icon={<FaUserPlus />}
                    onClick={() => navigate("/hrm/ho-so-nhan-vien/them-moi")}
                />
                <QuickAction
                    label="Chấm công"
                    icon={<FaClock />}
                    onClick={() => navigate("/hrm/attendance")}
                />
                <QuickAction
                    label="Bảng lương"
                    icon={<FaMoneyBill />}
                    onClick={() => navigate("/hrm/payroll")}
                />
            </div>

            {/* LIST */}
            <h3 className="section-title">Danh sách nhân viên</h3>

            <EmployeeFilter
                keyword={keyword}
                department={department}
                status={status}
                departmentOptions={departmentOptions}
                statusOptions={statusOptions}
                onKeywordChange={(v) => {
                    setKeyword(v);
                    setPage(1);
                }}
                onDepartmentChange={(v) => {
                    setDepartment(v);
                    setPage(1);
                }}
                onStatusChange={(v) => {
                    setStatus(v);
                    setPage(1);
                }}
            />

        <EmployeeTable
            data={paginatedEmployees}
            page={page}
            totalPages={totalPages}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
            onRowClick={(emp) => {
                console.log("Row clicked:", emp);
                navigate(`/hrm/employees/${emp.code}`);
            }}
            onView={(emp) => alert("Xem: " + emp.name)}
            onEdit={(emp) => alert("Sửa: " + emp.name)}
            onDelete={(emp) => alert("Xoá: " + emp.name)}
        />
        </div>
    );
}