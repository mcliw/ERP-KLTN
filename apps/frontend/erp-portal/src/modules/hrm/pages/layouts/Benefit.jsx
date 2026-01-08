// pages/layouts/Benefit.jsx
import { useEffect, useState } from "react";
import { benefitService } from "../../services/benefit.service";
import BenefitTable from "../../components/layouts/BenefitTable";
import BenefitForm from "../../components/layouts/BenefitForm";

export default function Benefit() {
  const [data, setData] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    benefitService.getAll().then(setData);
  }, []);

  const handleSave = async (form) => {
    if (editing) {
      const u = await benefitService.update(editing.code, form);
      setData((d) => d.map((x) => (x.code === u.code ? u : x)));
    } else {
      const c = await benefitService.create(form);
      setData((d) => [c, ...d]);
    }
    setEditing(null);
  };

  const handleDelete = async (code) => {
    await benefitService.remove(code);
    setData((d) => d.filter((x) => x.code !== code));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Phúc lợi</h2>

      <BenefitForm
        initialData={editing}
        onSubmit={handleSave}
        onCancel={() => setEditing(null)}
      />

      <BenefitTable
        data={data}
        onEdit={setEditing}
        onDelete={handleDelete}
      />
    </div>
  );
}
