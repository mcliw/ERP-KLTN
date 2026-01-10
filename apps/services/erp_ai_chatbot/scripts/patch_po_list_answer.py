from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
fp = ROOT / "app/ai/executor.py"

old = '''\
        if "po_code" in keys and "status" in keys:
            lines = [f"- {x.get('po_code')}: {x.get('status')} | ETD {_s(x.get('expected_delivery_date'))}" for x in data[:10]]
            return "Danh sách PO:\\n" + _fmt_list(lines, 10)
'''

new = '''\
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
            return f"Hiện có {len(data)} PO chưa hoàn tất:\\n" + _fmt_list(lines, 10)
'''

text = fp.read_text(encoding="utf-8")
if old not in text:
    raise SystemExit("Không tìm thấy đoạn cần patch (executor.py đã khác). Hãy gửi mình đoạn list-PO hiện tại trong _fallback_from_data().")

fp.write_text(text.replace(old, new), encoding="utf-8")
print("DONE: patched PO list answer formatter.")
