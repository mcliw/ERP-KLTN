// pages/layouts/BenefitAssign.jsx
import { useEffect, useState } from "react";
import { benefitService } from "../../services/benefit.service";
import { employeeService } from "../../services/employee.service";
import BenefitAssignForm from "../../components/layouts/BenefitAssignForm";

export default function BenefitAssign() {
  const [employees, setEmployees] = useState([]);
  const [benefits, setBenefits] = useState([]);

  useEffect(() => {
    employeeService.getAll().then(setEmployees);
    benefitService.getAll().then(setBenefits);
  }, []);

  const handleAssign = async (form) => {
    await benefitService.assignToEmployee(form);
    alert("Gán phúc lợi thành công");
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Gán phúc lợi cho nhân viên</h2>
      <BenefitAssignForm
        employees={employees}
        benefits={benefits}
        onSubmit={handleAssign}
      />
    </div>
  );
}
