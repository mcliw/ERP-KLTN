from __future__ import annotations

import json
import os
from typing import Any, Dict, List
import re
from dotenv import load_dotenv
from google import genai

load_dotenv()

_GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
_GEMINI_COMPOSE_MODEL = os.getenv("GEMINI_COMPOSE_MODEL", os.getenv("GEMINI_MODEL"))
_client = genai.Client(api_key=_GOOGLE_API_KEY) if _GOOGLE_API_KEY else genai.Client()

import re

_DATE_YMD = re.compile(r"\b(\d{4})-(\d{2})-(\d{2})\b")
_DATE_DMY = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{4})\b")
_NUM_TOKEN = re.compile(r"\b\d{1,3}(?:[.,]\d{3})+\b|\b\d{4,}\b")
_CODE_RE = re.compile(r"\b(?:[A-Z]{2,10}\d{2,6}|[A-Z]{2,10}-\d{1,12})\b")

def is_llm_available() -> bool:
    return _client is not None

def _norm_digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")

def _extract_numbers_norm(text: str) -> set[str]:
    out = set()
    for m in _NUM_TOKEN.finditer(text or ""):
        out.add(_norm_digits(m.group(0)))
    return {x for x in out if x}

def _extract_dates_norm(text: str) -> set[str]:
    out = set()
    for y, m, d in _DATE_YMD.findall(text or ""):
        out.add(f"{y}{m}{d}")
    for d, m, y in _DATE_DMY.findall(text or ""):
        out.add(f"{y}{int(m):02d}{int(d):02d}")
    return out

def _extract_codes(text: str) -> set[str]:
    return set(_CODE_RE.findall(text or ""))

def compose_safe_enough(answer: str, payload_text: str | None = None, max_len: int = 1200) -> bool:
    if not answer:
        return False
    if len(answer) > max_len:
        return False
    if any(x in answer for x in ("{{", "}}", "{s", "...")):
        return False

    # Nếu không truyền payload_text => chỉ check marker
    if not payload_text:
        return True

    # Không cho sinh số/ngày/mã mới ngoài payload
    if not _extract_numbers_norm(answer).issubset(_extract_numbers_norm(payload_text)):
        return False
    if not _extract_dates_norm(answer).issubset(_extract_dates_norm(payload_text)):
        return False
    if not _extract_codes(answer).issubset(_extract_codes(payload_text)):
        return False

    return True

def compose_answer_with_llm(module: str, question: str, step_infos: List[Dict[str, Any]]) -> str:
    # ✅ gửi full data/result (không preview)
    payload = {
        "module": module,
        "question": question,
        "tool_results": [
            {
                "step_id": si.get("id"),
                "tool": si.get("tool"),
                "args": si.get("args"),
                "result": si.get("result"),
            }
            for si in step_infos
        ],
    }

    sys = (
        "Bạn là trợ lý ERP. Nhiệm vụ: trả lời ĐÚNG TRỌNG TÂM theo câu hỏi và nếu có từ tiếng anh hãy chuyển sang tiếng việt và phải hợp ngữ cảnh.\n"
        "QUY TẮC BẮT BUỘC:\n"
        "1) CHỈ dùng dữ liệu trong payload.tool_results[*].result. Không suy đoán.\n"
        "2) TỰ xác định người dùng đang hỏi những TRƯỜNG nào (fields) trong câu hỏi.\n"
        "3) CHỈ trả lời các fields được hỏi. Không thêm email/địa chỉ/field khác nếu không được hỏi.\n"
        "4) Nếu field được hỏi KHÔNG tồn tại trong data -> trả đúng: 'Không có dữ liệu <field>' (ngắn gọn).\n"
        "5) Nếu câu hỏi hỏi nhiều ý (vd: 'đơn nào + trạng thái + thanh toán') -> trả lần lượt từng ý.\n"
        "6) Không copy nguyên JSON.\n"
        "7) CẤM TUYỆT ĐỐI BỊA SỐ LIỆU (SĐT/ĐỊA CHỈ/EMAIL/SỐ LƯỢNG/TIỀN/....). NẾU KHÔNG CÓ THÌ TRẢ LỜI KHÔNG CÓ DỮ LIỆU"
        '\n'
        'Đặc biệt lưu ý: \n'
        '1) Trả lời người dùng thân thiện như 1 tin nhắn. Cấu trúc 1 đoạn văn rõ rằng, mạch lạc\n'
        '2) Không sử dụng gạch đầu dòng hay xuống dòng\n'
        '3) Hãy dịch luôn các từ tiếng anh có trong câu trả lời thành tiếng việt ví dụ ANNUAL là nghỉ phép năm, APPROVE là đã duyệt, ACTIVE là hoạt động,...'
        "\n"
        "ĐỊNH DẠNG GỢI Ý:\n"
        "- Khi liệt kê danh sách, hãy tự động gộp các mục trùng nhau (cùng SKU, Tên hoặc ID) thành một dòng duy nhất và cộng tổng các số liệu liên quan (số lượng, giá trị...). Tuyệt đối không hiển thị các dòng dữ liệu lặp lại rời rạc."
        "- Nếu hỏi 1 field: trả 1 câu.\n"
        "\n"
        "VÍ DỤ SIẾT:\n"
        "• Hỏi: 'ngày nghỉ phép nào?' -> chỉ liệt kê ngày.\n"
        "• Hỏi: 'số điện thoại?' -> chỉ trả phone, không trả email.\n"
        "• Hỏi: 'đơn nhập' -> chỉ trả lời đơn nhập không trả lời đơn xuất,..."
    )

    contents = json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=str)

    resp = _client.models.generate_content(
        model= _GEMINI_COMPOSE_MODEL,
        contents=contents,
        config={
            "system_instruction": sys,
            "temperature": 0.0, 
        },
    )
    return (resp.text or "").strip()