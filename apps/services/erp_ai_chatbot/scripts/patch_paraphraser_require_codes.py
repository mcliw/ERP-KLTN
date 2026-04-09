from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
fp = ROOT / "app/ai/paraphraser.py"

text = fp.read_text(encoding="utf-8")

# Nếu file không tồn tại hoặc khác cấu trúc, báo ngay
if "def paraphrase_answer" not in text:
    raise SystemExit("Không tìm thấy paraphrase_answer trong app/ai/paraphraser.py")

# 1) Chèn hàm lấy expected codes từ FACTS_JSON (duyệt đệ quy)
inject = r'''
def _collect_expected_codes_from_facts(obj: Any) -> set[str]:
    """
    Thu thập các mã chứng từ (PO-xxxx, GR-xxxx, GI-xxxx...) xuất hiện trong FACTS_JSON.
    Dùng để bắt paraphrase phải giữ mã, tránh rút gọn quá mức.
    """
    codes: set[str] = set()
    if obj is None:
        return codes
    if isinstance(obj, str):
        codes |= _extract_codes(obj)
        return codes
    if isinstance(obj, dict):
        for k, v in obj.items():
            # ưu tiên các field thường chứa mã
            if isinstance(v, str) and (k.endswith("_code") or k.endswith("_id") or k in {"po_code","pr_code","gr_code","gi_code","reference_code"}):
                codes |= _extract_codes(v)
            codes |= _collect_expected_codes_from_facts(v)
        return codes
    if isinstance(obj, list):
        for it in obj[:20]:
            codes |= _collect_expected_codes_from_facts(it)
        return codes
    return codes
'''

# Chèn ngay sau _extract_codes
marker = "def _extract_codes(text: str) -> set[str]:"
pos = text.find(marker)
if pos == -1:
    raise SystemExit("Không tìm thấy _extract_codes trong paraphraser.py")

# tìm cuối block _extract_codes (dòng return)
m = re.search(r"def _extract_codes\(text: str\) -> set\[str\]:.*?\n\n", text, flags=re.DOTALL)
if not m:
    raise SystemExit("Không parse được block _extract_codes để chèn.")

block_end = m.end()
if "_collect_expected_codes_from_facts" not in text:
    text = text[:block_end] + inject + "\n" + text[block_end:]

# 2) Tăng ràng buộc trong system prompt: nếu có items_preview thì phải liệt kê mã + status
prompt_find = "RÀNG BUỘC BẮT BUỘC:"
if prompt_find not in text:
    raise SystemExit("Không tìm thấy system prompt để patch.")

# thêm 1 rule rõ ràng
add_rule = (
    "5) Nếu FACTS_JSON có items_preview, phải nêu rõ mã chứng từ (PO/PR/GR/GI...) của từng dòng preview "
    "và kèm trạng thái; nếu có ngày thì kèm ngày.\n"
)
if add_rule not in text:
    text = text.replace(
        "4) Không dùng dấu '...'.\n",
        "4) Không dùng dấu '...'.\n" + add_rule
    )

# 3) Cập nhật guardrail: nếu FACTS có codes mà paraphrase không chứa => fail => dùng deterministic
guard_find = "def _safe_enough(paraphrased: str, allowed: str) -> bool:"
if guard_find not in text:
    raise SystemExit("Không tìm thấy _safe_enough để patch.")

# Thay signature để nhận thêm expected_codes
if "expected_codes" not in text:
    text = text.replace(
        "def _safe_enough(paraphrased: str, allowed: str) -> bool:",
        "def _safe_enough(paraphrased: str, allowed: str, expected_codes: set[str]) -> bool:"
    )

# chèn rule kiểm tra codes bắt buộc ngay sau check codes subset
needle = "if not pc.issubset(ac):\n        return False\n"
if needle in text and "expected_codes" not in text.split(needle)[1][:200]:
    insert_rule = (
        needle
        + "\n    # 3b) nếu facts có mã chứng từ thì paraphrase phải giữ (ít nhất các mã preview)\n"
          "    if expected_codes:\n"
          "        pc2 = _extract_codes(paraphrased)\n"
          "        # yêu cầu giữ tối thiểu 1..N mã (N=6) để tránh rút gọn quá mức\n"
          "        need = set(list(expected_codes)[:6])\n"
          "        if not need.issubset(pc2):\n"
          "            return False\n"
    )
    text = text.replace(needle, insert_rule)

# 4) Cập nhật call _safe_enough trong paraphrase_answer
call_find = "if not _safe_enough(out, allowed):"
if call_find not in text:
    raise SystemExit("Không tìm thấy call _safe_enough trong paraphrase_answer.")

if "expected_codes =" not in text:
    # build expected_codes trước khi gọi _safe_enough
    text = text.replace(
        "        # Guardrail kiểm tra số/mã\n",
        "        # Guardrail kiểm tra số/mã\n"
        "        expected_codes = _collect_expected_codes_from_facts(facts)\n"
    )
    text = text.replace(
        "if not _safe_enough(out, allowed):",
        "if not _safe_enough(out, allowed, expected_codes):"
    )

fp.write_text(text, encoding="utf-8")
print("DONE: paraphraser now requires keeping document codes in paraphrased answer.")
