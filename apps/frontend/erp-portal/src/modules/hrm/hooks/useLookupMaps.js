import { useEffect, useState } from "react";
import { departmentService } from "../services/department.service";
import { positionService } from "../services/position.service";

const normalizeCode = (v) => String(v || "").trim().toUpperCase();

export function useLookupMaps() {
  const [departmentMap, setDepartmentMap] = useState({});
  const [positionMap, setPositionMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);

        // Lấy cả deleted để vẫn resolve tên trong bảng (nếu phòng ban/chức vụ đã bị xoá)
        const [depts, poss] = await Promise.all([
          departmentService.getAll({ includeDeleted: true }),
          positionService.getAll({ includeDeleted: true }),
        ]);

        const deptMap = {};
        depts.forEach((d) => {
          const key = normalizeCode(d?.code);
          if (key) deptMap[key] = d?.name || d?.code;
        });

        const posMap = {};
        poss.forEach((p) => {
          const key = normalizeCode(p?.code);
          if (key) posMap[key] = p?.name || p?.code;
        });

        if (!alive) return;
        setDepartmentMap(deptMap);
        setPositionMap(posMap);
      } catch (e) {
        console.error("Không tải được lookup maps", e);
        if (!alive) return;
        setDepartmentMap({});
        setPositionMap({});
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return { departmentMap, positionMap, loading };
}