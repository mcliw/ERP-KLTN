# scripts/seed_sale_crm.py
from __future__ import annotations

import argparse
import random
import string
import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    Integer,
    Numeric,
    String,
    Text,
    JSON,
    LargeBinary,
    inspect,
    select,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

# ====== CHỈNH 2 IMPORT DƯỚI ĐÂY CHO ĐÚNG DỰ ÁN CỦA BẠN ======
# 1) Engine/Session của Sale CRM
from app.db.sale_crm_database import SaleCrmBase
from app.db.sale_crm_database import engine, SaleCrmSessionLocal  # noqa
# ============================================================


def _safe_str(s: str, max_len: Optional[int]) -> str:
    s = s if s is not None else ""
    s = s.strip()
    if not s:
        s = "x"
    if max_len is not None and max_len > 0:
        return s[:max_len]
    return s


def _rand_phone() -> str:
    # SĐT VN dạng đơn giản (không tuyệt đối chuẩn, nhưng hợp lý)
    prefix = random.choice(["03", "05", "07", "08", "09"])
    return prefix + "".join(random.choices(string.digits, k=8))


def _rand_email(seed: str) -> str:
    seed = "".join(ch for ch in seed.lower() if ch.isalnum()) or "user"
    return f"{seed}.{uuid.uuid4().hex[:6]}@example.com"


def _rand_code(prefix: str, n: int = 6) -> str:
    return f"{prefix}-{''.join(random.choices(string.digits, k=n))}"


def _gen_value_for_column(col, table_name: str, row_idx: int, unique_salt: str) -> Any:
    """
    Sinh giá trị "không rỗng" cho hầu hết kiểu dữ liệu phổ biến.
    """
    coltype = col.type
    colname = col.name.lower()

    # Ưu tiên pattern theo tên cột (thực tế CRM hay dùng)
    if isinstance(coltype, String) or isinstance(coltype, Text):
        max_len = getattr(coltype, "length", None)

        if "email" in colname:
            return _safe_str(_rand_email(f"{table_name}_{colname}_{row_idx}_{unique_salt}"), max_len)
        if "phone" in colname or "sdt" in colname or "dien_thoai" in colname:
            return _safe_str(_rand_phone(), max_len)
        if "code" in colname or "ma_" in colname:
            return _safe_str(_rand_code(colname[:3].upper() or "CRM"), max_len)
        if "name" in colname or "ten" in colname:
            return _safe_str(f"{table_name}_{colname}_{row_idx}", max_len)
        if "address" in colname or "dia_chi" in colname:
            return _safe_str(f"{row_idx} Nguyen Van A, Q.{random.randint(1,12)}, TP.HCM", max_len)
        if "note" in colname or "ghi_chu" in colname or isinstance(coltype, Text):
            return _safe_str(f"Ghi chú {table_name}.{colname} #{row_idx}", max_len)

        return _safe_str(f"{table_name}_{colname}_{row_idx}_{unique_salt}", max_len)

    if isinstance(coltype, Integer):
        # Tránh 0 nếu cột có vẻ là "điểm/giá trị"
        base = row_idx + 1
        if "age" in colname or "tuoi" in colname:
            return random.randint(18, 55)
        if "quantity" in colname or "so_luong" in colname:
            return random.randint(1, 100)
        if "year" in colname or "nam" in colname:
            return date.today().year
        return base

    if isinstance(coltype, Numeric):
        # Numeric/Decimal
        scale = getattr(coltype, "scale", 2) or 2
        val = Decimal(random.randint(10_00, 500_00)) / Decimal(10**scale)  # 10.00 -> 500.00
        return val

    if isinstance(coltype, Float):
        return float(random.randint(100, 100000)) / 100.0

    if isinstance(coltype, Boolean):
        return random.choice([True, False])

    if isinstance(coltype, DateTime):
        # trong 90 ngày gần đây
        return datetime.utcnow() - timedelta(days=random.randint(0, 90), hours=random.randint(0, 23))

    if isinstance(coltype, Date):
        return date.today() - timedelta(days=random.randint(0, 365))

    if isinstance(coltype, Enum):
        # chọn ngẫu nhiên 1 enum value
        enums = list(getattr(coltype, "enums", []) or [])
        if enums:
            return random.choice(enums)
        # fallback
        return "UNKNOWN"

    if isinstance(coltype, JSON):
        return {"seed": True, "table": table_name, "row": row_idx, "col": col.name}

    if isinstance(coltype, LargeBinary):
        return uuid.uuid4().bytes

    # Fallback kiểu lạ: set string
    return f"{table_name}_{col.name}_{row_idx}_{unique_salt}"


def _get_pk_cols(table) -> List[str]:
    return [c.name for c in table.columns if c.primary_key]


def _should_skip_column(col) -> bool:
    # computed/generated columns: không set
    if getattr(col, "computed", None) is not None:
        return True
    # autoincrement PK: để DB tự sinh
    if col.primary_key and isinstance(col.type, Integer) and (col.autoincrement is True or col.autoincrement == "auto"):
        return True
    return False


def _load_existing_ids(session: Session, table, pk_name: str) -> List[Any]:
    rows = session.execute(select(getattr(table.c, pk_name))).scalars().all()
    return list(rows)


def seed_sale_crm(
    engine: Engine,
    session_factory,
    rows_per_table: int = 10,
    reset: bool = False,
) -> None:
    metadata = SaleCrmBase.metadata
    tables = list(metadata.sorted_tables)  # đảm bảo thứ tự FK trước/sau

    with session_factory() as session:
        if reset:
            # delete theo thứ tự ngược để không vướng FK
            for t in reversed(tables):
                session.execute(t.delete())
            session.commit()

        # cache PK values để gán FK
        pk_cache: Dict[str, Dict[str, List[Any]]] = {}  # {table_name: {pk_col: [values...]}}
        unique_track: Dict[Tuple[str, str], set] = {}

        for t in tables:
            table_name = t.name
            pk_cols = _get_pk_cols(t)
            pk_cache.setdefault(table_name, {})
            for pk in pk_cols:
                pk_cache[table_name].setdefault(pk, _load_existing_ids(session, t, pk))

        for t in tables:
            table_name = t.name
            insp = inspect(engine)
            # số dòng hiện có
            try:
                existing_count = session.execute(select(t.count())).scalar_one()
            except Exception:
                # fallback nếu dialect không hỗ trợ t.count()
                existing_count = session.execute(select(1).select_from(t)).all()
                existing_count = len(existing_count)

            need = max(0, rows_per_table - int(existing_count))
            if need == 0:
                continue

            # chuẩn bị thông tin FK map: col_name -> (ref_table, ref_col)
            fk_map: Dict[str, Tuple[str, str]] = {}
            for c in t.columns:
                for fk in c.foreign_keys:
                    ref_table = fk.column.table.name
                    ref_col = fk.column.name
                    fk_map[c.name] = (ref_table, ref_col)

            pk_cols = _get_pk_cols(t)

            for i in range(need):
                unique_salt = uuid.uuid4().hex[:8]
                row: Dict[str, Any] = {}

                for c in t.columns:
                    if _should_skip_column(c):
                        continue

                    # FK: lấy random từ cache bảng ref (nếu có), nếu chưa có thì để None rồi xử lý fallback
                    if c.name in fk_map:
                        ref_table, ref_col = fk_map[c.name]
                        candidates = pk_cache.get(ref_table, {}).get(ref_col, [])
                        if candidates:
                            row[c.name] = random.choice(candidates)
                        else:
                            # fallback tạm thời: sẽ cố gắng insert sau khi ref_table có dữ liệu
                            # (nhưng vì metadata.sorted_tables nên thường ref_table đã seed trước)
                            row[c.name] = None
                        continue

                    # Unique column: đảm bảo không trùng
                    val = _gen_value_for_column(c, table_name, i + 1, unique_salt)
                    if getattr(c, "unique", False) or c.name.lower().endswith("_code") or c.name.lower().startswith("code"):
                        key = (table_name, c.name)
                        unique_track.setdefault(key, set())
                        # tránh trùng
                        while val in unique_track[key]:
                            unique_salt = uuid.uuid4().hex[:8]
                            val = _gen_value_for_column(c, table_name, i + 1, unique_salt)
                        unique_track[key].add(val)

                    row[c.name] = val

                # Nếu còn FK bị None (hiếm), cố gắng set bằng ref cache lần nữa
                for fk_col, (ref_table, ref_col) in fk_map.items():
                    if row.get(fk_col) is None:
                        candidates = pk_cache.get(ref_table, {}).get(ref_col, [])
                        if candidates:
                            row[fk_col] = random.choice(candidates)
                        else:
                            # cuối cùng: set 1 (tùy DB), nhưng có thể fail -> bạn sẽ nhìn thấy lỗi để bổ sung seed ref table
                            row[fk_col] = 1

                # Insert
                result = session.execute(t.insert().values(**row))

                # cập nhật cache PK
                session.flush()
                for pk in pk_cols:
                    # ưu tiên lấy pk đã set trong row, nếu không thì đọc inserted_primary_key
                    if pk in row and row[pk] is not None:
                        new_pk = row[pk]
                    else:
                        try:
                            ipk = result.inserted_primary_key
                            # nếu nhiều PK thì lấy theo index
                            idx = pk_cols.index(pk)
                            new_pk = ipk[idx] if ipk and len(ipk) > idx else None
                        except Exception:
                            new_pk = None
                    if new_pk is not None:
                        pk_cache.setdefault(table_name, {}).setdefault(pk, []).append(new_pk)

            session.commit()

        # Check nhanh: cột nào còn NULL?
        problems: List[str] = []
        for t in tables:
            for c in t.columns:
                # đếm null
                q = select(1).select_from(t).where(getattr(t.c, c.name) == None)  # noqa: E711
                null_count = len(session.execute(q).all())
                if null_count > 0:
                    problems.append(f"{t.name}.{c.name}: NULL={null_count}")

        if problems:
            print("CẢNH BÁO: Vẫn còn cột NULL sau seed (cần kiểm tra generated/computed/FK ràng buộc):")
            for p in problems:
                print(" -", p)
        else:
            print("OK: Seed xong. Không phát hiện NULL ở các cột.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rows", type=int, default=10, help="Số dòng mỗi bảng")
    parser.add_argument("--reset", action="store_true", help="Xóa dữ liệu trước khi seed")
    args = parser.parse_args()

    seed_sale_crm(
        engine=engine,
        session_factory=SaleCrmSessionLocal,
        rows_per_table=args.rows,
        reset=args.reset,
    )


if __name__ == "__main__":
    main()
