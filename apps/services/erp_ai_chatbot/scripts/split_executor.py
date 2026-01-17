from __future__ import annotations

import argparse
import re
from pathlib import Path

BLOCK_RE = re.compile(r"^(def|class)\s+([A-Za-z_]\w*)\b", re.M)

# Keyword heuristic (fallback nếu không nằm trong manual map)
HRM_KEYWORDS = [
    "hrm", "nhan_vien", "employee", "cham_cong", "timesheet", "nghi_phep", "leave",
    "tang_ca", "ot", "approver", "department", "position"
]
SUPPLY_KEYWORDS = [
    "supply_chain", "po", "pr", "gr", "gi", "inventory", "warehouse",
    "supplier", "ncc", "sku", "receipt", "delivery"
]

# Manual override (ưu tiên tuyệt đối) — bạn có thể bổ sung thêm tên hàm tại đây
MANUAL_HRM_ONLY = {
    "_auto_resolve_hrm_employee_id",
    "_wants_employee_profile",
    "_extract_requested_metrics",
    "_fallback_from_result",
}
MANUAL_SUPPLY_ONLY = {
    "_fallback_from_data",
    "_filter_row",
    "_preview_data",
    "_drop_none",
    "_compose_po_deadline_progress",
    "_compose_ok",
}

# Những hàm CHẮC CHẮN là shared (nếu bạn muốn ép shared)
MANUAL_SHARED = {
    "_get_path",
    "_render_value",
    "_normalize_ref",
    "_resolve_args",
    "_execute_tool",
}

def split_blocks(text: str):
    ms = list(BLOCK_RE.finditer(text))
    if not ms:
        return text, []

    header = text[: ms[0].start()]
    blocks = []
    for i, m in enumerate(ms):
        start = m.start()
        end = ms[i + 1].start() if i + 1 < len(ms) else len(text)
        kind, name = m.group(1), m.group(2)
        blocks.append((kind, name, text[start:end]))
    return header, blocks

def score(text: str, keywords: list[str]) -> int:
    t = text.lower()
    return sum(t.count(k) for k in keywords)

def classify(kind: str, name: str, block_text: str):
    if name in MANUAL_SHARED:
        return "shared", "manual_shared"
    if name in MANUAL_HRM_ONLY:
        return "hrm", "manual_hrm"
    if name in MANUAL_SUPPLY_ONLY:
        return "supply_chain", "manual_supply"

    h = score(block_text, HRM_KEYWORDS)
    s = score(block_text, SUPPLY_KEYWORDS)

    if h == 0 and s == 0:
        return "shared", "no_keywords"
    if h > s:
        return "hrm", f"kw(hrm={h},sc={s})"
    if s > h:
        return "supply_chain", f"kw(hrm={h},sc={s})"
    return "shared", f"tie(hrm={h},sc={s})"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="app/ai/executor.py", help="Path to the original executor.py")
    ap.add_argument("--outdir", default="app/ai/executor", help="Output package dir")
    args = ap.parse_args()

    src = Path(args.src)
    if not src.exists():
        raise SystemExit(f"Not found: {src}")

    text = src.read_text(encoding="utf-8")
    header, blocks = split_blocks(text)

    hrm_parts = [header]
    sc_parts = [header]

    report = []
    for kind, name, blk in blocks:
        bucket, why = classify(kind, name, blk)
        report.append((kind, name, bucket, why))

        if bucket == "hrm":
            hrm_parts.append(blk)
        elif bucket == "supply_chain":
            sc_parts.append(blk)
        else:
            hrm_parts.append(blk)
            sc_parts.append(blk)

    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    (outdir / "executor_hrm.py").write_text("".join(hrm_parts), encoding="utf-8")
    (outdir / "executor_supply_chain.py").write_text("".join(sc_parts), encoding="utf-8")

    init_py = """from __future__ import annotations

from .executor_hrm import execute_chat as execute_chat_hrm
from .executor_supply_chain import execute_chat as execute_chat_supply_chain

def execute_chat(module: str, *args, **kwargs):
    if module == "hrm":
        return execute_chat_hrm(module, *args, **kwargs)
    if module == "supply_chain":
        return execute_chat_supply_chain(module, *args, **kwargs)
    raise ValueError(f"Unsupported module: {module}")
"""
    (outdir / "__init__.py").write_text(init_py, encoding="utf-8")

    # Print report (liệt kê tất cả hàm/class)
    total = len(report)
    hrm = sum(1 for _,_,b,_ in report if b == "hrm")
    sc = sum(1 for _,_,b,_ in report if b == "supply_chain")
    shared = sum(1 for _,_,b,_ in report if b == "shared")
    print(f"Total blocks: {total} | hrm-only: {hrm} | supply_chain-only: {sc} | shared: {shared}\n")

    for kind, name, bucket, why in report:
        print(f"{kind:5} {name:40} -> {bucket:12} ({why})")

if __name__ == "__main__":
    main()
