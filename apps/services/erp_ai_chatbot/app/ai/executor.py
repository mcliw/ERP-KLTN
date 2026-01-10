from __future__ import annotations
import re
from typing import Any, Dict, Optional, List
from datetime import datetime

from app.core.rbac import check_role
from app.core.audit_log import audit
from app.core.errors import PermissionDenied, ToolExecutionError
from app.ai.router import plan_route
from app.ai.plan_validator import validate_plan
from app.ai.module_registry import get_tool
from app.ai.tooling import ToolSpec

from app.db.supply_chain_database import SupplyChainSessionLocal
from app.ai.paraphraser import paraphrase_answer

VAR_DBL_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}\}")
VAR_SGL_RE = re.compile(r"\{\s*(s[0-9]+(?:\.[a-zA-Z0-9_]+|\[[0-9]+\])*)\s*\}")

def _get_path(store: dict, path: str):
    cur: Any = store
    for part in path.split("."):
        m = re.match(r"^([a-zA-Z0-9_]+)(\[[0-9]+\])?$", part)
        if not m:
            raise KeyError(path)
        key = m.group(1)
        cur = cur[key]
        if m.group(2):
            idx = int(m.group(2)[1:-1])
            cur = cur[idx]
    return cur

def _render_template(tpl: str, store: dict) -> str:
    def repl(match):
        path = match.group(1)
        try:
            val = _get_path(store, path)
            return "" if val is None else str(val)
        except Exception:
            return match.group(0)

    out = VAR_DBL_RE.sub(repl, tpl)
    out = VAR_SGL_RE.sub(repl, out)
    return out

def _normalize_ref(s: str) -> str:
    s = (s or "").strip()
    # Gemini đôi khi sinh JSONPath: $.partial_pos[0].po_code
    if s.startswith("$."):
        return "{{" + s[2:] + "}}"
    return s

def _resolve_args(args: Dict[str, Any], store: dict) -> Dict[str, Any]:
    out = {}
    for k, v in args.items():
        if isinstance(v, str):
            v2 = _normalize_ref(v)
            out[k] = _render_template(v2, store)
        else:
            out[k] = v
    return out


def _execute_tool(module: str, tool: ToolSpec, args: Dict[str, Any]) -> Dict[str, Any]:
    if module == "supply_chain":
        session = SupplyChainSessionLocal()
        try:
            parsed = tool.args_model.model_validate(args)
            return tool.handler(session=session, **parsed.model_dump())
        except Exception as e:
            raise ToolExecutionError(str(e))
        finally:
            session.close()
    raise ToolExecutionError(f"Chưa hỗ trợ executor cho module '{module}'.")

def _s(v, default="N/A"):
    if v is None: return default
    if isinstance(v, str) and not v.strip(): return default
    return v

def _fmt_date_vi(iso: Any) -> str:
    if not iso:
        return "N/A"
    if isinstance(iso, str):
        s = iso.strip()
        if not s:
            return "N/A"
        try:
            dt = datetime.fromisoformat(s.replace("Z", ""))
            return dt.strftime("%d/%m/%Y")
        except Exception:
            # fallback: lấy phần YYYY-MM-DD
            return s.split("T")[0]
    return str(iso)


def _fmt_list(lines: List[str], limit: int = 7) -> str:
    if not lines: return ""
    shown = lines[:limit]
    more = len(lines) - len(shown)
    return "\n".join(shown) + (f"\n(+{more} dòng)" if more > 0 else "")

# =========================
# Deterministic formatter
# =========================
# def _fallback_from_data(data: Any) -> Optional[str]:
#     # RAG
#     if isinstance(data, dict) and "answer" in data and "sources" in data and isinstance(data["sources"], list):
#         src_lines = []
#         for s in data["sources"][:4]:
#             if isinstance(s, dict):
#                 src_lines.append(f"- {s.get('source')}: {s.get('snippet')}")
#         return f"{data.get('answer')}\n\nNguồn tham khảo:\n{_fmt_list(src_lines, 4)}"

#     # Tồn kho
#     if isinstance(data, dict) and {"sku","product_name","total_available","total_allocated","total_on_hand"}.issubset(data.keys()):
#         lines = []
#         details = data.get("details") or []
#         for d in details[:5]:
#             lines.append(
#                 f"- {d.get('warehouse_code')} ({d.get('warehouse_name')}), bin {_s(d.get('bin_code'))}: "
#                 f"khả dụng {d.get('available')} (tồn {d.get('on_hand')}, giữ {d.get('allocated')})"
#             )
#         extra = ("\nChi tiết:\n" + "\n".join(lines)) if lines else ""
#         return (
#             f"Tồn kho SKU {data['sku']} ({data['product_name']}): "
#             f"khả dụng {data['total_available']}, đang giữ {data['total_allocated']}, tồn {data['total_on_hand']}."
#             f"{extra}"
#         )

#         # Tiến độ nhập PO
#     if isinstance(data, dict) and {"po_code", "progress_percent", "missing_items"}.issubset(data.keys()):
#         missing = data.get("missing_items") or []
#         if missing:
#             lines = []
#             for m in missing[:8]:
#                 lines.append(
#                     f"- {m.get('sku')} ({_s(m.get('product_name'))}): thiếu {m.get('missing')} "
#                     f"(đã nhận {m.get('received')}/{m.get('ordered')})"
#                 )
#             missing_txt = "Còn thiếu:\n" + _fmt_list(lines, 8)
#         else:
#             missing_txt = "Không còn thiếu SKU nào (đã nhập đủ)."

#         return (
#             f"Tiến độ nhập của {data.get('po_code')}: {data.get('progress_percent')}%. "
#             f"Trạng thái: {data.get('status')}. {missing_txt}"
#         )

#             # Chi tiết PO (có items)
#     if isinstance(data, dict) and "po_code" in data and "status" in data and isinstance(data.get("items"), list):
#         items = data.get("items") or []

#         # Gộp theo SKU để tránh lặp
#         agg: Dict[str, Dict[str, Any]] = {}
#         for it in items:
#             if not isinstance(it, dict):
#                 continue
#             sku = it.get("sku") or "N/A"
#             if sku not in agg:
#                 agg[sku] = {
#                     "sku": sku,
#                     "product_name": it.get("product_name"),
#                     "ordered": 0,
#                     "received": 0,
#                 }
#             agg[sku]["ordered"] += int(it.get("quantity_ordered") or 0)
#             agg[sku]["received"] += int(it.get("quantity_received") or 0)

#         lines = []
#         for x in list(agg.values())[:8]:
#             lines.append(
#                 f"- {x['sku']} ({_s(x.get('product_name'))}): đã nhận {x.get('received')}/{x.get('ordered')}"
#             )

#         supplier = _s(data.get("supplier_name") or data.get("supplier_code"))
#         header = f"Chi tiết PO {data.get('po_code')} | Trạng thái: {data.get('status')} | NCC: {supplier}."

#         if lines:
#             return header + "\nDòng hàng (gộp theo SKU):\n" + _fmt_list(lines, 8)
#         return header + "\nPO không có dòng hàng."


#     # PO/PR/GR/GI status
#     if isinstance(data, dict) and "po_code" in data and "status" in data:
#         return (
#             f"Đơn mua {data['po_code']} trạng thái: {data['status']}. "
#             f"NCC: {_s(data.get('supplier_name') or data.get('supplier_code'))}. "
#             f"Ngày đặt: {_s(data.get('order_date'))}. Dự kiến giao: {_s(data.get('expected_delivery_date'))}."
#         )
#     if isinstance(data, dict) and "pr_code" in data and "status" in data:
#         return f"PR {data['pr_code']} trạng thái: {data['status']}. Ngày yêu cầu: {_s(data.get('request_date'))}."
#     if isinstance(data, dict) and "gr_code" in data and "status" in data:
#         return f"GR {data['gr_code']} trạng thái: {data['status']}. Ngày nhập: {_s(data.get('receipt_date'))}."
#     if isinstance(data, dict) and "gi_code" in data and "status" in data:
#         return f"GI {data['gi_code']} trạng thái: {data['status']}. Ngày xuất: {_s(data.get('issue_date'))}."
    
#         # List tồn kho (tra_ton_kho_theo_tu_khoa trả về dạng list summary)
#     if isinstance(data, list) and data and all(isinstance(x, dict) for x in data):
#         keys = set().union(*[set(x.keys()) for x in data[:5]])

#         # shape: [{"sku","product_name","total_on_hand","total_allocated","total_available"}, ...]
#         if {"sku", "product_name", "total_on_hand", "total_allocated", "total_available"}.issubset(keys):
#             # Nếu chỉ có 1 SKU -> trả câu gọn
#             if len(data) == 1:
#                 x = data[0]
#                 return (
#                     f"Tồn kho SKU {x.get('sku')} ({_s(x.get('product_name'))}): "
#                     f"khả dụng {x.get('total_available')}, đang giữ {x.get('total_allocated')}, tồn {x.get('total_on_hand')}."
#                 )

#             # Nhiều SKU -> trả list top N
#             lines = []
#             for x in data[:10]:
#                 lines.append(
#                     f"- {x.get('sku')} ({_s(x.get('product_name'))}): "
#                     f"khả dụng {x.get('total_available')}, giữ {x.get('total_allocated')}, tồn {x.get('total_on_hand')}"
#                 )
#             return f"Tìm thấy {len(data)} SKU theo từ khoá:\n" + _fmt_list(lines, 10)

#     # List: PO / Log
#     if isinstance(data, list) and data and all(isinstance(x, dict) for x in data):
#         keys = set().union(*[set(x.keys()) for x in data[:5]])
#         if "po_code" in keys and "status" in keys:
#             STATUS_VI = {
#                 "OPEN": "mở",
#                 "APPROVED": "đã duyệt",
#                 "PARTIAL_RECEIVED": "đã nhận một phần",
#                 "RECEIVED": "đã nhận đủ",
#                 "CANCELLED": "đã hủy",
#             }
#             lines = []
#             for x in data[:10]:
#                 st = x.get("status")
#                 st_vi = STATUS_VI.get(st)
#                 st_disp = f"{st} ({st_vi})" if st and st_vi else (st or "N/A")
#                 lines.append(
#                     f"- {x.get('po_code')} | {st_disp} | Ngày đặt {_s(x.get('order_date'))} | ETD {_s(x.get('expected_delivery_date'))}"
#                 )
#             return f"Hiện có {len(data)} PO chưa hoàn tất:\n" + _fmt_list(lines, 10)
#         if "transaction_type" in keys and "quantity_change" in keys and "reference_code" in keys:
#             lines = [f"- {_s(x.get('transaction_date'))} | {x.get('transaction_type')} | {x.get('sku')} | Δ {x.get('quantity_change')} | ref {x.get('reference_code')}" for x in data[:12]]
#             return "Log biến động tồn kho:\n" + _fmt_list(lines, 12)

#     return None

#     # Truy vết biến động tồn kho (object có logs[])
#     if isinstance(data, dict) and "sku" in data and isinstance(data.get("logs"), list):
#         logs = data.get("logs") or []
#         lines = []
#         TYPE_VI = {
#             "INBOUND": "nhập",
#             "OUTBOUND": "xuất",
#             "TRANSFER": "chuyển",
#             "ADJUSTMENT": "điều chỉnh",
#         }
#         for x in logs[:12]:
#             if not isinstance(x, dict):
#                 continue
#             t = x.get("transaction_type")
#             t_disp = f"{t} ({TYPE_VI.get(t)})" if t in TYPE_VI else (t or "N/A")
#             lines.append(
#                 f"- {x.get('transaction_date')} | {t_disp} | Δ {x.get('quantity_change')} | ref {x.get('reference_code')} | wh {x.get('warehouse_id')} | bin {x.get('bin_id')}"
#             )

#         extra = ("\nChi tiết (gần nhất):\n" + _fmt_list(lines, 12)) if lines else ""
#         return (
#             f"Truy vết biến động tồn kho SKU {data.get('sku')} ({data.get('product_name')}): "
#             f"có {len(logs)} bản ghi."
#             f"{extra}"
#         )

def _fallback_from_data(data: Any) -> Optional[str]:
    # -------------------------
    # 1) RAG
    # -------------------------
    if isinstance(data, dict) and "answer" in data and "sources" in data and isinstance(data["sources"], list):
        src_lines = []
        for s in data["sources"][:4]:
            if isinstance(s, dict):
                src_lines.append(f"- {s.get('source')}: {s.get('snippet')}")
        return f"{data.get('answer')}\n\nNguồn tham khảo:\n{_fmt_list(src_lines, 4)}"

    # -------------------------
    # 2) Dict: Tồn kho chi tiết
    # -------------------------
    if isinstance(data, dict) and {"sku", "product_name", "total_available", "total_allocated", "total_on_hand"}.issubset(data.keys()):
        lines = []
        details = data.get("details") or []
        for d in details[:5]:
            lines.append(
                f"- {d.get('warehouse_code')} ({d.get('warehouse_name')}), bin {_s(d.get('bin_code'))}: "
                f"khả dụng {d.get('available')} (tồn {d.get('on_hand')}, giữ {d.get('allocated')})"
            )
        extra = ("\nChi tiết:\n" + "\n".join(lines)) if lines else ""
        return (
            f"Tồn kho SKU {data['sku']} ({data['product_name']}): "
            f"khả dụng {data['total_available']}, đang giữ {data['total_allocated']}, tồn {data['total_on_hand']}."
            f"{extra}"
        )

    # -------------------------
    # 3) Dict: Log biến động tồn kho (tool của bạn trả dict {sku, product_name, logs:[...]})
    # -------------------------
    if isinstance(data, dict) and "logs" in data and isinstance(data["logs"], list):
        sku = data.get("sku")
        pname = data.get("product_name")
        logs = data.get("logs") or []
        if not logs:
            return f"Không có log biến động tồn kho cho SKU {_s(sku)} ({_s(pname)})."
        lines = []
        for x in logs[:12]:
            if isinstance(x, dict):
                lines.append(
                    f"- {_s(x.get('transaction_date'))} | {x.get('transaction_type')} | Δ {x.get('quantity_change')} | ref {_s(x.get('reference_code'))}"
                )
        return f"Log biến động tồn kho SKU {_s(sku)} ({_s(pname)}):\n{_fmt_list(lines, 12)}"

    # -------------------------
    # 4) Dict: danh sách GR theo NCC/PO (shape {supplier_code/supplier_name, gr_list:[...]})
    # -------------------------
    if isinstance(data, dict) and "gr_list" in data and isinstance(data["gr_list"], list):
        sup = data.get("supplier_name") or data.get("supplier_code")
        po_code = data.get("po_code")
        grs = data.get("gr_list") or []
        header = "Danh sách phiếu nhập (GR)"
        if sup:
            header += f" của {_s(sup)}"
        if po_code:
            header += f" (PO {po_code})"
        if not grs:
            return header + ": không có dữ liệu."
        lines = []
        for g in grs[:10]:
            if isinstance(g, dict):
                lines.append(f"- {g.get('gr_code')} | {g.get('status')} | {_s(g.get('receipt_date'))} | PO {_s(g.get('po_code'))}")
        return f"{header} (hiển thị {min(len(grs),10)}/{len(grs)}):\n{_fmt_list(lines, 10)}"

    # -------------------------
    # 5) Dict: chi tiết chứng từ có items[]
    # -------------------------
    if isinstance(data, dict) and isinstance(data.get("items"), list) and data.get("items"):
        # PO
        if "po_code" in data:
            po = data.get("po_code")
            st = data.get("status")
            sup = data.get("supplier_name")
            items = data.get("items") or []
            # gộp theo SKU
            agg = {}
            for it in items:
                if not isinstance(it, dict):
                    continue
                sku = it.get("sku")
                name = it.get("product_name")
                o = int(it.get("quantity_ordered") or 0)
                r = int(it.get("quantity_received") or 0)
                if sku not in agg:
                    agg[sku] = {"sku": sku, "product_name": name, "ordered": 0, "received": 0}
                agg[sku]["ordered"] += o
                agg[sku]["received"] += r
            lines = []
            for sku, row in list(agg.items())[:10]:
                lines.append(f"- {row['sku']} ({_s(row.get('product_name'))}): đã nhận {row['received']}/{row['ordered']}")
            head = f"Chi tiết PO {po} | Trạng thái: {_s(st)} | NCC: {_s(sup)}."
            return head + "\nDòng hàng (gộp theo SKU):\n" + _fmt_list(lines, 10)

        # PR / GR / GI dạng items
        if "pr_code" in data:
            pr = data.get("pr_code")
            st = data.get("status")
            items = data.get("items") or []
            lines = []
            for it in items[:10]:
                if isinstance(it, dict):
                    lines.append(f"- {it.get('sku')} ({_s(it.get('product_name'))}): SL yêu cầu {_s(it.get('quantity_requested'))}, cần trước {_s(it.get('expected_date'))}")
            return f"Chi tiết PR {pr} | Trạng thái: {_s(st)}.\nDòng hàng:\n{_fmt_list(lines, 10)}"

        if "gr_code" in data:
            gr = data.get("gr_code")
            st = data.get("status")
            wh = data.get("warehouse_name") or data.get("warehouse_code")
            items = data.get("items") or []
            lines = []
            for it in items[:10]:
                if isinstance(it, dict):
                    lines.append(f"- {it.get('sku')} ({_s(it.get('product_name'))}): đã nhập {_s(it.get('quantity_received'))}")
            return f"Chi tiết GR {gr} | Trạng thái: {_s(st)} | Kho: {_s(wh)}.\nDòng hàng:\n{_fmt_list(lines, 10)}"

        if "gi_code" in data:
            gi = data.get("gi_code")
            st = data.get("status")
            itype = data.get("issue_type")
            items = data.get("items") or []
            lines = []
            for it in items[:10]:
                if isinstance(it, dict):
                    lines.append(f"- {it.get('sku')} ({_s(it.get('product_name'))}): đã xuất {_s(it.get('quantity_issued'))}")
            return f"Chi tiết GI {gi} | Trạng thái: {_s(st)} | Loại: {_s(itype)}.\nDòng hàng:\n{_fmt_list(lines, 10)}"

    # -------------------------
    # 6) Dict: status PO/PR/GR/GI
    # -------------------------
    if isinstance(data, dict) and "po_code" in data and "status" in data:
        return (
            f"Đơn mua {data['po_code']} trạng thái: {data['status']}. "
            f"NCC: {_s(data.get('supplier_name') or data.get('supplier_code'))}. "
            f"Ngày đặt: {_s(data.get('order_date'))}. Dự kiến giao: {_s(data.get('expected_delivery_date'))}."
        )
    if isinstance(data, dict) and "pr_code" in data and "status" in data:
        return f"PR {data['pr_code']} trạng thái: {data['status']}. Ngày yêu cầu: {_s(data.get('request_date'))}."
    if isinstance(data, dict) and "gr_code" in data and "status" in data:
        return f"GR {data['gr_code']} trạng thái: {data['status']}. Ngày nhập: {_s(data.get('receipt_date'))}."
    if isinstance(data, dict) and "gi_code" in data and "status" in data:
        return f"GI {data['gi_code']} trạng thái: {data['status']}. Ngày xuất: {_s(data.get('issue_date'))}."

    # -------------------------
    # 7) List dict: render theo shape
    # -------------------------
    if isinstance(data, list) and data and all(isinstance(x, dict) for x in data):
        keys = set().union(*[set(x.keys()) for x in data[:5]])

        # 7.1) List tồn kho rút gọn (tra_ton_kho_theo_tu_khoa trả list)
        if {"sku", "product_name"}.issubset(keys) and any(k.startswith("total_") for k in keys):
            lines = []
            for x in data[:10]:
                lines.append(
                    f"- {x.get('sku')} ({_s(x.get('product_name'))}): "
                    f"khả dụng {_s(x.get('total_available'))}, giữ {_s(x.get('total_allocated'))}, tồn {_s(x.get('total_on_hand'))}"
                )
            return f"Tồn kho theo kết quả tìm kiếm (hiển thị {min(len(data),10)}/{len(data)}):\n{_fmt_list(lines, 10)}"

        # 7.2) Top xuất nhiều: sku + total_quantity_issued
        if {"sku", "product_name", "total_quantity_issued"}.issubset(keys):
            lines = []
            for i, x in enumerate(data[:10], start=1):
                lines.append(f"- {i}. {x.get('sku')} ({_s(x.get('product_name'))}): {_s(x.get('total_quantity_issued'))}")
            return f"Top {min(len(data),10)} sản phẩm xuất nhiều nhất:\n{_fmt_list(lines, 10)}"

        # 7.3) Ranking NCC: total_orders / total_receipts
        if {"supplier_code", "supplier_name"}.issubset(keys) and ("total_orders" in keys or "total_receipts" in keys):
            metric = "total_orders" if "total_orders" in keys else "total_receipts"
            metric_label = "số PO" if metric == "total_orders" else "số GR"
            lines = []
            for i, x in enumerate(data[:10], start=1):
                lines.append(f"- {i}. {x.get('supplier_code')} ({_s(x.get('supplier_name'))}): {_s(x.get(metric))} {metric_label}")
            return f"Xếp hạng nhà cung cấp theo {metric_label}:\n{_fmt_list(lines, 10)}"

        # 7.4) Thống kê theo ngày: date/day + total_*
        if ("date" in keys or "day" in keys) and any(k.startswith("total_") for k in keys):
            date_key = "date" if "date" in keys else "day"
            # lấy 1 key total_ đầu tiên
            total_keys = [k for k in keys if k.startswith("total_")]
            total_key = total_keys[0] if total_keys else None
            if total_key:
                lines = []
                for x in data[:10]:
                    lines.append(f"- {_s(x.get(date_key))}: {_s(x.get(total_key))}")
                return f"Thống kê theo ngày (hiển thị {min(len(data),10)}/{len(data)}):\n{_fmt_list(lines, 10)}"

        # 7.5) List PO: po_code + status
        if "po_code" in keys and "status" in keys:
            STATUS_VI = {
                "OPEN": "mở",
                "APPROVED": "đã duyệt",
                "PARTIAL_RECEIVED": "đã nhận một phần",
                "RECEIVED": "đã nhận đủ",
                "CANCELLED": "đã hủy",
            }
            lines = []
            for x in data[:10]:
                st = x.get("status")
                st_vi = STATUS_VI.get(st)
                st_disp = f"{st} ({st_vi})" if st and st_vi else (st or "N/A")
                lines.append(
                    f"- {x.get('po_code')} | {st_disp} | Ngày đặt {_s(x.get('order_date'))} | ETD {_s(x.get('expected_delivery_date'))}"
                )
            return f"Hiện có {len(data)} PO:\n" + _fmt_list(lines, 10)

        # 7.6) List log trực tiếp (trường hợp tool trả list)
        if "transaction_type" in keys and "quantity_change" in keys and "reference_code" in keys:
            lines = [
                f"- {_s(x.get('transaction_date'))} | {x.get('transaction_type')} | {x.get('sku')} | Δ {x.get('quantity_change')} | ref {x.get('reference_code')}"
                for x in data[:12]
            ]
            return "Log biến động tồn kho:\n" + _fmt_list(lines, 12)

        # 7.7) Generic list dict fallback
        common = set(data[0].keys())
        for x in data[1:5]:
            common &= set(x.keys())
        common_keys = [k for k in ["code", "sku", "po_code", "pr_code", "gr_code", "gi_code", "status", "date", "day"] if k in common]
        if not common_keys:
            # fallback: lấy tối đa 4 key phổ biến
            common_keys = list(common)[:4]

        lines = []
        for x in data[:10]:
            parts = []
            for k in common_keys[:4]:
                parts.append(f"{k}={_s(x.get(k))}")
            lines.append("- " + ", ".join(parts))
        return f"Danh sách kết quả (hiển thị {min(len(data),10)}/{len(data)}):\n{_fmt_list(lines, 10)}"

    return None



def _is_bad_answer(answer: str) -> bool:
    if not answer: return True
    if "..." in answer: return True
    if "{{" in answer or "}}" in answer: return True
    if "{s" in answer: return True
    return False

def _compose_po_deadline_progress(store: Dict[str, Any]) -> Optional[str]:
    s1 = store.get("s1")
    s2 = store.get("s2")
    if not (isinstance(s1, dict) and isinstance(s2, dict)):
        return None
    d1 = s1.get("data") or {}
    d2 = s2.get("data") or {}
    if not (isinstance(d1, dict) and isinstance(d2, dict)):
        return None
    if "po_code" not in d1 or "progress_percent" not in d2:
        return None

    po_code = d1.get("po_code")
    status = d1.get("status") or d2.get("status")
    etd = _s(d1.get("expected_delivery_date"))
    progress = d2.get("progress_percent")

    missing = d2.get("missing_items") or []
    if missing:
        lines = []
        for m in missing[:8]:
            lines.append(
                f"- {m.get('sku')} ({_s(m.get('product_name'))}): thiếu {m.get('missing')} "
                f"(đã nhận {m.get('received')}/{m.get('ordered')})"
            )
        missing_txt = "Còn thiếu:\n" + _fmt_list(lines, 8)
    else:
        missing_txt = "Không còn thiếu SKU nào (đã nhập đủ)."

    return (
        f"PO sắp đến hạn giao nhất là {po_code} ({status}), ETD {etd}. "
        f"Tiến độ nhập hiện {progress}%. {missing_txt}"
    )


# =========================
# FACTS preview for paraphrase
# =========================
def _drop_none(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}

def _filter_row(row: Dict[str, Any]) -> Dict[str, Any]:
    # heuristic chọn field phổ biến theo “shape”
    keys = set(row.keys())

    if "po_code" in keys:
        keep = ["po_code", "status", "order_date", "expected_delivery_date", "supplier_name", "supplier_code", "total_amount"]
    elif "pr_code" in keys:
        keep = ["pr_code", "status", "request_date"]
    elif "gr_code" in keys:
        keep = ["gr_code", "status", "receipt_date", "warehouse_code", "po_code", "supplier_name"]
    elif "gi_code" in keys:
        keep = ["gi_code", "status", "issue_date", "issue_type", "reference_doc_id", "warehouse_code"]
    elif "transaction_type" in keys and "quantity_change" in keys:
        keep = ["transaction_date", "transaction_type", "sku", "warehouse_code", "quantity_change", "reference_code"]
    elif "sku" in keys and ("available" in keys or "on_hand" in keys):
        keep = ["warehouse_code", "warehouse_name", "bin_code", "on_hand", "allocated", "available", "sku"]
    else:
        keep = list(row.keys())[:8]

    out = {}
    for k in keep:
        if k in row:
            out[k] = row.get(k)
    return _drop_none(out)

def _preview_data(data: Any, list_n: int = 6, nested_n: int = 6) -> Dict[str, Any]:
    # list output
    if isinstance(data, list):
        preview = []
        for r in data[:max(1, min(list_n, 20))]:
            if isinstance(r, dict):
                preview.append(_filter_row(r))
            else:
                preview.append(r)
        return {
            "type": "list",
            "total": len(data),
            "items_preview": preview
        }

    # object output
    if isinstance(data, dict):
        out: Dict[str, Any] = {"type": "object"}

        # core fields (không nhét cả object)
        core_keep = []
        if "sku" in data: core_keep += ["sku", "product_name", "total_on_hand", "total_allocated", "total_available"]
        if "po_code" in data: core_keep += ["po_code", "status", "order_date", "expected_delivery_date", "supplier_name", "supplier_code", "total_amount"]
        if "pr_code" in data: core_keep += ["pr_code", "status", "request_date"]
        if "gr_code" in data: core_keep += ["gr_code", "status", "receipt_date", "warehouse_code", "po_code", "supplier_name"]
        if "gi_code" in data: core_keep += ["gi_code", "status", "issue_date", "issue_type", "reference_doc_id", "warehouse_code"]
        if not core_keep:
            # fallback: lấy tối đa 8 field scalar
            for k, v in data.items():
                if isinstance(v, (str, int, float, bool)) or v is None:
                    core_keep.append(k)
                if len(core_keep) >= 8:
                    break

        core = {}
        for k in core_keep:
            if k in data:
                core[k] = data.get(k)
        out["core"] = _drop_none(core)

        # nested arrays preview
        if isinstance(data.get("items"), list):
            items = data["items"]
            out["items_total"] = len(items)
            out["items_preview"] = [_filter_row(x) for x in items[:max(1, min(nested_n, 20))] if isinstance(x, dict)]

        if isinstance(data.get("details"), list):
            details = data["details"]
            out["details_total"] = len(details)
            out["details_preview"] = [_filter_row(x) for x in details[:max(1, min(nested_n, 20))] if isinstance(x, dict)]

        if isinstance(data.get("logs"), list):
            logs = data["logs"]
            out["logs_total"] = len(logs)
            out["logs_preview"] = [_filter_row(x) for x in logs[:max(1, min(nested_n, 20))] if isinstance(x, dict)]


        if isinstance(data.get("sources"), list):
            srcs = data["sources"]
            out["sources_total"] = len(srcs)
            out["sources_preview"] = [
                _drop_none({"source": s.get("source"), "score": s.get("score")})
                for s in srcs[:max(1, min(4, len(srcs)))]
                if isinstance(s, dict)
            ]

        return out

    # primitive
    return {"type": type(data).__name__, "value": data}

# def _build_facts_for_paraphrase(store: Dict[str, Any], list_n: int = 6, nested_n: int = 6) -> Dict[str, Any]:
#     steps = []
#     for i in range(1, 10):
#         si = store.get(f"s{i}")
#         if not isinstance(si, dict):
#             break
#         steps.append(_drop_none({
#             "step": f"s{i}",
#             "thong_diep": si.get("thong_diep"),
#             "preview": _preview_data(si.get("data"), list_n=list_n, nested_n=nested_n)
#         }))
#     return {"steps": steps, "store_keys": list(store.keys())[:30]}

def _build_facts_for_paraphrase(store: Dict[str, Any], list_n: int = 6, nested_n: int = 6) -> Dict[str, Any]:
    steps = []
    # gom s1..sN theo thứ tự thực thi
    i = 1
    while True:
        si = store.get(f"s{i}")
        if not isinstance(si, dict):
            break
        steps.append(_drop_none({
            "step": f"s{i}",
            "thong_diep": si.get("thong_diep"),
            "ok": si.get("ok"),
            "preview": _preview_data(si.get("data"), list_n=list_n, nested_n=nested_n)
        }))
        i += 1

    return _drop_none({
        "steps_total": len(steps),
        "steps": steps,
        "store_keys": list(store.keys())[:30],
    })


# =========================
# Main
# =========================
def execute_chat(module: str, user_id: int | None, role: str | None, message: str, paraphrase_enabled: bool = True):
    if not check_role(module, role):
        raise PermissionDenied(f"Role '{role}' không được phép dùng chatbot module '{module}'.")

    auth = {"user_id": user_id, "role": role, "is_authenticated": True}
    plan = plan_route(module=module, message=message, auth=auth)
    audit({"event": "plan_created", "module": module, "plan": plan.model_dump()})

    if plan.needs_clarification:
        return {"answer": plan.clarifying_question, "plan": plan.model_dump()}

    validate_plan(plan)

    store: Dict[str, Any] = {}
    for idx, step in enumerate(plan.steps, start=1):
        tool = get_tool(plan.module, step.tool)
        if tool is None:
            raise ToolExecutionError(f"Không tìm thấy tool '{step.tool}' trong module '{plan.module}'.")

        resolved_args = _resolve_args(step.args, store)
        audit({"event": "tool_call", "module": plan.module, "tool": step.tool, "args": resolved_args})

        result = _execute_tool(plan.module, tool, resolved_args)
        # Guard: nếu intent cần GR gần nhất nhưng PO chưa có GR thì trả lời luôn
        if plan.intent == "gr_gan_nhat_theo_po_va_chi_tiet" and step.id == "s1":
            data = (result or {}).get("data") if isinstance(result, dict) else None
            gr_list = (data or {}).get("gr_list") if isinstance(data, dict) else None
            if isinstance(gr_list, list) and len(gr_list) == 0:
                po_code = (data or {}).get("po_code")
                answer = f"PO {po_code} hiện chưa có phiếu nhập (GR)."
                store[step.id] = result
                store["s1"] = result
                return {"answer": answer, "data": store, "plan": plan.model_dump()}
            
        if plan.intent == "tra_cuu_po_nhan_mot_phan_va_doi_chieu" and step.id == "s1":
            data = (result or {}).get("data") if isinstance(result, dict) else None
            if isinstance(data, list) and len(data) == 0:
                store[step.id] = result
                store["s1"] = result
                return {
                    "answer": "Hiện không có PO nào đang ở trạng thái nhận một phần (PARTIAL_RECEIVED).",
                    "data": store,
                    "plan": plan.model_dump(),
                }
            
        # Guard: nếu po_nhan_mot_phan trả list rỗng thì dừng sớm (tránh index [0])
        if step.tool == "po_nhan_mot_phan":
            if isinstance(result, dict) and isinstance(result.get("data"), list) and len(result["data"]) == 0:
                store[step.id] = result
                store[f"s{idx}"] = result
                if step.save_as:
                    store[step.save_as] = []
                    store[f"{step.save_as}__raw"] = result
                return {
                    "answer": "Hiện không có PO nào đang ở trạng thái nhận một phần (PARTIAL_RECEIVED).",
                    "data": store,
                    "plan": plan.model_dump(),
                }

        audit({"event": "tool_result", "module": plan.module, "tool": step.tool, "result": result})

        if isinstance(result, dict) and result.get("needs_clarification"):
            return {"answer": result.get("question"), "candidates": result.get("candidates"), "plan": plan.model_dump()}

        store[step.id] = result
        store[f"s{idx}"] = result  # alias chuẩn

        # save_as: lưu "data" để LLM tham chiếu đơn giản (partial_pos[0]...)
        if step.save_as:
            if isinstance(result, dict) and "data" in result:
                store[step.save_as] = result.get("data")
                store[f"{step.save_as}__raw"] = result  # giữ bản raw để debug
            else:
                store[step.save_as] = result



    answer = None
    if plan.final_response_template:
        answer = _render_template(plan.final_response_template, store)

        # Ưu tiên compose câu trả lời multi-step cho intent đặc biệt
    # if _is_bad_answer(answer or "") and plan.intent == "po_sap_den_han_va_tien_do_nhap":
    #     composed = _compose_po_deadline_progress(store)
    #     if composed:
    #         answer = composed
    # Deterministic answer từ data thật (generic multi-step)
    if _is_bad_answer(answer or ""):
        parts = []
        for i in range(1, len(plan.steps) + 1):
            si = store.get(f"s{i}")
            if isinstance(si, dict):
                fb = _fallback_from_data(si.get("data"))
                if fb and fb not in parts:
                    parts.append(fb)

        if parts:
            # giới hạn để tránh quá dài
            answer = "\n\n".join(parts[:3])


        # =========================
    # Compose answer cho intent multi-tool (demo đẹp)
    # =========================

    # 1) PO sắp đến hạn giao nhất + trạng thái (s1: tìm PO, s2: trạng thái PO)
    if plan.intent == "po_sap_den_han_giao_nhat":
        s1 = store.get("s1") if isinstance(store.get("s1"), dict) else {}
        s2 = store.get("s2") if isinstance(store.get("s2"), dict) else {}
        d1 = s1.get("data") if isinstance(s1, dict) else None
        d2 = s2.get("data") if isinstance(s2, dict) else None

        if isinstance(d1, dict) and isinstance(d2, dict):
            po_code = d2.get("po_code") or d1.get("po_code")
            status = d2.get("status") or d1.get("status")
            order_date = d2.get("order_date") or d1.get("order_date")
            etd = d2.get("expected_delivery_date") or d1.get("expected_delivery_date")

            sup_name = d2.get("supplier_name") or d2.get("supplier_code")
            total_amount = d2.get("total_amount")

            answer = (
                f"PO {po_code} là đơn mua sắp đến hạn giao nhất.\n"
                f"- Trạng thái: {_s(status)}\n"
                f"- Ngày đặt: {_fmt_date_vi(order_date)}\n"
                f"- Dự kiến giao (ETD): {_fmt_date_vi(etd)}\n"
                f"- Nhà cung cấp: {_s(sup_name)}\n"
                f"- Tổng giá trị: {_s(total_amount)}"
            )

    # 2) PO sắp đến hạn giao nhất + tiến độ nhập + thiếu SKU (s1: tìm PO, s2: tiến độ nhập PO)
    elif plan.intent == "po_sap_den_han_va_tien_do_nhap":
        s1 = store.get("s1") if isinstance(store.get("s1"), dict) else {}
        s2 = store.get("s2") if isinstance(store.get("s2"), dict) else {}
        d1 = s1.get("data") if isinstance(s1, dict) else None
        d2 = s2.get("data") if isinstance(s2, dict) else None

        if isinstance(d1, dict) and isinstance(d2, dict):
            po_code = d2.get("po_code") or d1.get("po_code")
            status = d2.get("status") or d1.get("status")
            order_date = d1.get("order_date")
            etd = d1.get("expected_delivery_date")

            progress = d2.get("progress_percent")
            missing_items = d2.get("missing_items") or []

            lines = []
            # missing_items: [{sku, product_name, ordered, received, missing}]
            for it in missing_items[:12]:
                if not isinstance(it, dict):
                    continue
                sku = it.get("sku")
                name = it.get("product_name")
                ordered = it.get("ordered")
                received = it.get("received")
                missing = it.get("missing")
                lines.append(f"- {sku} ({_s(name)}): đã nhận {_s(received, 0)}/{_s(ordered, 0)}, thiếu {_s(missing, 0)}")

            if lines:
                missing_text = "Các SKU còn thiếu:\n" + _fmt_list(lines, 12)
            else:
                missing_text = "Các SKU còn thiếu: Không (đã nhận đủ)."

            answer = (
                f"PO {po_code} là đơn mua sắp đến hạn giao nhất.\n"
                f"- Trạng thái: {_s(status)}\n"
                f"- Ngày đặt: {_fmt_date_vi(order_date)}\n"
                f"- Dự kiến giao (ETD): {_fmt_date_vi(etd)}\n"
                f"- Tiến độ nhập: {_s(progress)}%\n"
                f"{missing_text}"
            )

    # 3) NCC: hiệu suất giao hàng + GR gần nhất (s1: hiệu suất, s2: GR list)
    elif plan.intent == "hieu_suat_va_gr_gan_day_theo_ncc":
        s1 = store.get("s1") if isinstance(store.get("s1"), dict) else {}
        s2 = store.get("s2") if isinstance(store.get("s2"), dict) else {}
        d1 = s1.get("data") if isinstance(s1, dict) else None
        d2 = s2.get("data") if isinstance(s2, dict) else None

        if isinstance(d1, dict) and isinstance(d2, dict):
            sup_code = d1.get("supplier_code") or d2.get("supplier_code")
            sup_name = d1.get("supplier_name") or d2.get("supplier_name") or sup_code or "N/A"
            total_receipts = d1.get("total_receipts")
            limit = d2.get("limit")
            total_returned = d2.get("total_returned")
            gr_list = d2.get("gr_list") or []

            lines = []
            for x in gr_list[:10]:
                if not isinstance(x, dict):
                    continue
                lines.append(
                    f"- {x.get('gr_code')} | {x.get('status')} | {_fmt_date_vi(x.get('receipt_date'))} | PO {x.get('po_code')}"
                )

            head = f"Nhà cung cấp {sup_name} ({sup_code}): tổng số phiếu nhập (GR) ghi nhận = {_s(total_receipts)}."
            tail = f"Danh sách {limit} phiếu nhập gần nhất (trả về {_s(total_returned)}/{_s(limit)}):"
            answer = head + "\n" + tail + ("\n" + _fmt_list(lines, 10) if lines else "\n- Không có phiếu nhập.")
    elif plan.intent == "tra_cuu_po_nhan_mot_phan_va_doi_chieu_gr":
        s1 = store.get("s1") if isinstance(store.get("s1"), dict) else {}
        s2 = store.get("s2") if isinstance(store.get("s2"), dict) else {}
        d1 = s1.get("data") if isinstance(s1, dict) else None   # list PO
        d2 = s2.get("data") if isinstance(s2, dict) else None   # dict {po_code,status,items}

        # s1: danh sách PO partial
        if not isinstance(d1, list) or len(d1) == 0:
            answer = "Không có PO nào đang nhận một phần (PARTIAL_RECEIVED)."
        else:
            # list PO codes để show
            po_codes = []
            for x in d1[:12]:
                if isinstance(x, dict) and x.get("po_code"):
                    po_codes.append(x["po_code"])

            head = f"Có {len(d1)} PO đang nhận một phần: " + (", ".join(po_codes[:8]) + ("..." if len(po_codes) > 8 else ""))

            # s2: đối chiếu PO vs GR cho PO đầu tiên
            if isinstance(d2, dict) and d2.get("po_code"):
                po_code = d2.get("po_code")
                status = d2.get("status")
                items = d2.get("items") or []

                # chỉ liệt kê các dòng thiếu (missing>0)
                missing_lines = []
                if isinstance(items, list):
                    for it in items:
                        if not isinstance(it, dict):
                            continue
                        missing = it.get("missing")
                        if isinstance(missing, (int, float)) and missing > 0:
                            missing_lines.append(
                                f"- {it.get('sku')} ({_s(it.get('product_name'))}): "
                                f"đã nhận {_s(it.get('received'), 0)}/{_s(it.get('ordered'), 0)}, thiếu {missing}"
                            )

                if missing_lines:
                    body = (
                        f"Đối chiếu PO vs GR cho {po_code} | Trạng thái: {_s(status)}\n"
                        "Các SKU còn thiếu:\n" + _fmt_list(missing_lines, 12)
                    )
                else:
                    body = f"Đối chiếu PO vs GR cho {po_code} | Trạng thái: {_s(status)}\nKhông còn SKU thiếu (đã nhận đủ)."

                answer = head + "\n" + body
            else:
                answer = head + "\nKhông lấy được dữ liệu đối chiếu PO vs GR."


    # Deterministic answer từ data thật
    if _is_bad_answer(answer or ""):
        for i in range(len(plan.steps), 0, -1):
            si = store.get(f"s{i}")
            if isinstance(si, dict):
                fb = _fallback_from_data(si.get("data"))
                if fb:
                    answer = fb
                    break


    answer = answer or "Đã tra cứu xong."

        # Compose cho intent multi-tool: hiệu suất NCC + GR gần nhất
    if plan.intent == "hieu_suat_va_gr_gan_day_theo_ncc":
        s1 = store.get("s1", {})
        s2 = store.get("s2", {})
        d1 = s1.get("data") if isinstance(s1, dict) else None
        d2 = s2.get("data") if isinstance(s2, dict) else None

        if isinstance(d1, dict) and isinstance(d2, dict):
            sup = d1.get("supplier_name") or d1.get("supplier_code") or d2.get("supplier_name") or d2.get("supplier_code")
            total_receipts = d1.get("total_receipts")
            gr_list = d2.get("gr_list") or []
            limit = d2.get("limit")
            total_returned = d2.get("total_returned")

            lines = []
            for x in gr_list[:8]:
                lines.append(f"- {x.get('gr_code')} | {x.get('status')} | {x.get('receipt_date')} | PO {x.get('po_code')}")

            answer = (
                f"Nhà cung cấp {sup}: tổng số phiếu nhập (GR) ghi nhận = {total_receipts}. "
                f"5 phiếu nhập gần nhất (trả về {total_returned}/{limit}):\n"
                + ("\n".join(lines) if lines else "Không có phiếu nhập.")
            )


    # ===== Layer B: LLM paraphrase + FACTS preview =====
    facts_for_paraphrase = _build_facts_for_paraphrase(store, list_n=6, nested_n=6)
    answer_final = paraphrase_answer(answer, facts=facts_for_paraphrase, enabled=paraphrase_enabled)

    return {"answer": answer_final, "data": store, "plan": plan.model_dump()}
