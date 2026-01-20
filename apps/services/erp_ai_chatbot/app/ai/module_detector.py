# app/ai/module_detector.py
from __future__ import annotations

import json
import os
from typing import Optional, Literal, Dict, Any

from dotenv import load_dotenv
from pydantic import BaseModel, Field
from google import genai

load_dotenv()

# ====== config ======
_GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
_GEMINI_DETECT_MODEL = os.getenv("GEMINI_DETECT_MODEL", os.getenv("GEMINI_MODEL", "gemini-2.5-flash"))

_client = genai.Client(api_key=_GEMINI_API_KEY) if _GEMINI_API_KEY else genai.Client()

MODULES = ["hrm", "supply_chain", "sale_crm", "finance_accounting", "rag_policy"]
ModuleName = Literal["hrm", "supply_chain", "sale_crm", "finance_accounting", "rag_policy"]

TASK_MODULES = ["hrm", "supply_chain", "sale_crm", "finance_accounting", "rag_policy", "general_chat"]
TaskModuleName = Literal["hrm", "supply_chain", "sale_crm", "finance_accounting", "rag_policy", "general_chat"]

# ====== output model ======
class ModuleDetectOut(BaseModel):
    selected_module: Optional[ModuleName] = None
    confidence: float = Field(ge=0.0, le=1.0, default=0.0)
    needs_clarification: bool = False
    clarifying_question: Optional[str] = None


# ====== IMPORTANT: JSON schema must be TOP-LEVEL OBJECT ======
MODULE_DETECT_JSON_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "required": ["selected_module", "confidence", "needs_clarification", "clarifying_question"],
    "properties": {
        "selected_module": {
            "type": ["string", "null"],
            "enum": MODULES + [None],  # None -> null khi serialize
        },
        "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
        "needs_clarification": {"type": "boolean"},
        "clarifying_question": {"type": ["string", "null"]},
    },
}

# ====== prompt (mô tả đủ sâu, tránh “của tôi” = sale_crm) ======
MODULE_DESC = """
Bạn là bộ PHÂN LOẠI MODULE cho Chatbot ERP. Bạn KHÔNG trả lời nghiệp vụ.
Bạn CHỈ xuất JSON theo schema (selected_module, confidence, needs_clarification, clarifying_question). Không thêm text ngoài JSON.

MỤC TIÊU:
Chọn đúng 1 module phù hợp nhất:
- hrm
- supply_chain
- sale_crm
- finance_accounting
- rag_policy

========================
QUY TẮC CỐT LÕI (DATA SOURCE RULE)
========================
1) Nếu user hỏi quy định/chính sách/quy trình/hướng dẫn/nội quy/sổ tay/điều khoản/cách tính/công thức/logic
   => CHỌN rag_policy.

2) Nếu user hỏi bài toán giả định và SỐ LIỆU nằm ngay trong câu hỏi (user tự cho số, %)
   => CHỌN rag_policy.
   Ví dụ: "20tr giảm 10% còn bao nhiêu", "giả sử lương 10tr đóng BH bao nhiêu".

3) Chỉ chọn module DB (hrm/supply_chain/sale_crm/finance_accounting) khi user hỏi DỮ LIỆU THỰC TẾ trong hệ thống
   (cần tra DB mới biết): trạng thái đơn/hóa đơn/công nợ/tồn kho/lương tháng này/nghỉ phép tháng này...

========================
HARD RULE: KHÔNG DÙNG “TÔI/CỦA TÔI” ĐỂ ĐOÁN MODULE
========================
- Từ “tôi/của tôi” KHÔNG phải tín hiệu module.
- Module phải dựa trên đối tượng nghiệp vụ (nhân sự/kho/bán/kế toán/chính sách).

========================
HARD RULE: NHẬN DIỆN MÃ & ƯU TIÊN THEO TÍN HIỆU MẠNH
========================
A) Employee code HRM:
- Mã nhân viên chuẩn: 1 CHỮ + 5 SỐ (regex: \b[A-Z][0-9]{5}\b) => ưu tiên HRM.
- Nếu câu có các cụm như “thuộc phòng nào / phòng ban / department / ACTIVE / trạng thái nhân viên”
  => HRM, kể cả có chữ FIN trong mã.

B) Chứng từ Supply Chain:
- PR-/PO-/GR-/GI-... => supply_chain nếu câu hỏi trạng thái/chi tiết/tồn kho liên quan.

C) Hóa đơn/AR/AP/Công nợ:
- Nếu có keyword rõ: “hóa đơn”, “công nợ”, “phải thu”, “phải trả”, “AR”, “AP”, “thu chi”, “dòng tiền”,
  “bút toán”, “định khoản”, “sổ cái”, “nhật ký”, “số dư”, “kỳ kế toán”, “COA”
  => finance_accounting.

D) Sale/CRM:
- Nếu trọng tâm là đơn bán/SO, khách mua hàng, lịch sử mua, voucher/khuyến mãi, sản phẩm (trong ngữ cảnh bán)
  => sale_crm .

E) Mã dạng 3 chữ + 3 số (ví dụ FIN004):
- Tuyệt đối KHÔNG suy ra finance_accounting chỉ vì tiền tố FIN.
- Chỉ chọn finance_accounting nếu CÓ keyword Finance ở mục C.
- Nếu câu hỏi là “thuộc phòng nào/ACTIVE/trạng thái nhân viên” => HRM.

========================
PHÂN BIỆT THEO MODULE (CHỈ KHI KHÔNG THUỘC rag_policy)
========================

HRM:
- chấm công, đi trễ/về sớm, tăng ca, ca làm, lịch làm
- nghỉ phép, duyệt nghỉ, phép còn lại
- lương nhân viên/bảng lương (dữ liệu thực tế)
- hồ sơ nhân viên: thông tin, hợp đồng, chức danh, phòng ban, quản lý

SUPPLY_CHAIN:
- PR/PO/GR/GI, nhập/xuất kho, tồn kho, kho, nhà cung cấp, lead time

SALE_CRM:
- đơn bán/SO, trạng thái đơn, chi tiết đơn, lịch sử mua, khách hàng mua, voucher/khuyến mãi, sản phẩm (bán)

FINANCE_ACCOUNTING:
- hóa đơn AR/AP, công nợ, thu-chi, giao dịch, dòng tiền, bút toán/nhật ký/sổ cái/số dư, COA, kỳ kế toán, posting rule

========================
CASE GIAO THOA (ƯU TIÊN THEO ĐỐI TƯỢNG CUỐI)
========================
1) Nếu có keyword Finance mạnh (hóa đơn/công nợ/thu chi/bút toán/số dư/định khoản/kỳ kế toán/COA)
   => finance_accounting, kể cả có nhắc PO/SO.

2) Nếu có mã PR/PO/GR/GI và câu hỏi chủ yếu về trạng thái/nhập-xuất/tồn kho
   => supply_chain.

3) Nếu có SO/đơn bán và câu hỏi chủ yếu về đơn bán/khách mua/voucher/sản phẩm
   => sale_crm (trừ khi user nói rõ hóa đơn/công nợ => finance_accounting).

4) Nếu câu hỏi về nhân viên/hồ sơ/phòng ban/ACTIVE/chấm công/nghỉ phép/lương
   => hrm.

========================
KHI NÀO needs_clarification=true
========================
Chỉ needs_clarification=true khi thật sự không đủ tín hiệu đối tượng nghiệp vụ:
- Câu kiểu “kiểm tra giúp tôi”, “tình hình sao rồi” không có đối tượng.
- Hoặc confidence dự kiến < 0.60.

Clarifying_question phải 1 câu ngắn, có lựa chọn rõ:
"Bạn muốn tra ở module nào: hrm / supply_chain / sale_crm / finance_accounting / rag_policy?"

========================
OUTPUT
========================
- selected_module: 1 trong {hrm, supply_chain, sale_crm, finance_accounting, rag_policy}
- confidence: 0.0–1.0
- needs_clarification: true/false
- clarifying_question: null nếu không cần hỏi; có string nếu cần hỏi
"""

class TaskItem(BaseModel):
    module: TaskModuleName
    question: str

class TaskDetectOut(BaseModel):
    needs_clarification: bool = False
    clarifying_question: Optional[str] = None
    tasks: list[TaskItem] = Field(default_factory=list)

TASK_DETECT_JSON_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "required": ["needs_clarification", "clarifying_question", "tasks"],
    "properties": {
        "needs_clarification": {"type": "boolean"},
        "clarifying_question": {"type": ["string", "null"]},
        "tasks": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["module", "question"],
                "properties": {
                    "module": {"type": "string", "enum": TASK_MODULES},
                    "question": {"type": "string"},
                },
            },
        },
    },
}

TASK_DESC = """
Bạn là bộ TÁCH NHIỆM VỤ (task decomposer) cho Chatbot ERP.
Bạn KHÔNG chọn tool, KHÔNG trả lời nghiệp vụ.
Bạn CHỈ xuất JSON theo schema: needs_clarification, clarifying_question, tasks.

MỤC TIÊU:
- Tách câu hỏi thành 1–3 tasks.
- Mỗi task gồm:
  - module: hrm | supply_chain | sale_crm | finance_accounting | rag_policy | general_chat
  - question: viết lại ngắn gọn, đúng ý, đủ thông tin để router module đó xử lý.

========================
HARD RULE
========================
1) Không tách sai module vì “tôi/của tôi”. Luôn dựa đối tượng nghiệp vụ.
2) Nếu câu hỏi chứa quy định/chính sách/quy trình/hướng dẫn/cách tính => phải có 1 task rag_policy.
3) Nếu câu hỏi chứa dữ liệu thực tế cần tra DB => phải có task DB tương ứng.
4) Nếu vừa hỏi policy vừa hỏi dữ liệu => tạo 2 tasks (1 rag_policy + 1 DB).
5) Nếu quá mơ hồ không biết tách => needs_clarification=true, hỏi 1 câu ngắn.

========================
NHẬN DIỆN NHANH THEO DẤU HIỆU
========================
- employee_code HRM: \b[A-Z][0-9]{5}\b + hỏi phòng/ACTIVE/trạng thái/hồ sơ/chấm công/nghỉ phép/lương => hrm
- PR/PO/GR/GI => supply_chain
- Finance keywords (hóa đơn/công nợ/thu chi/bút toán/sổ cái/số dư/kỳ kế toán/COA/event_code) => finance_accounting
- SO/đơn bán/lịch sử mua/voucher/sản phẩm (bán) => sale_crm
- Policy/logic/cách tính => rag_policy
- Xã giao => general_chat

GỢI Ý:
- Nếu có mã (FIN004/PO-.../INV...) và hỏi trạng thái/thuộc phòng/active => ưu tiên DB module đúng theo ngữ cảnh.
- Tuyệt đối không vì FIN004 mà tự gán finance_accounting nếu không có keyword Finance.

========================
OUTPUT
========================
Chỉ JSON, không thêm chữ.
"""

def detect_module_llm(message: str, role: str | None = None) -> dict:
    msg = (message or "").strip()
    if not msg:
        return {
            "selected_module": None,
            "confidence": 0.0,
            "needs_clarification": True,
            "clarifying_question": "Bạn muốn hỏi thuộc module nào: hrm / supply_chain / sale_crm / finance_accounting?",
            "error": "empty_message",
        }

    try:
        resp = _client.models.generate_content(
            model=_GEMINI_DETECT_MODEL,
            contents=f"USER_MESSAGE:\n{msg}\nROLE:\n{role or ''}",
            config={
                "system_instruction": MODULE_DESC,
                "temperature": 0.0,
                "response_mime_type": "application/json",
                "response_json_schema": MODULE_DETECT_JSON_SCHEMA,  
            },
        )

        text = (resp.text or "").strip()
        data = json.loads(text) if text else {}
        out = ModuleDetectOut.model_validate(data)

        # nếu LLM trả needs_clarification=false nhưng module null -> ép hỏi
        if (not out.needs_clarification) and (out.selected_module is None):
            out = out.model_copy(update={
                "needs_clarification": True,
                "clarifying_question": "Bạn muốn hỏi thuộc module nào: hrm / supply_chain / sale_crm / finance_accounting?",
                "confidence": 0.0,
            })

        return {**out.model_dump(), "error": None}

    except Exception as e:
        # không “map keyword” ở đây; chỉ trả câu hỏi chọn module khi LLM fail
        return {
            "selected_module": None,
            "confidence": 0.0,
            "needs_clarification": True,
            "clarifying_question": "Bộ phân loại module đang bận. Bạn chọn module: hrm / supply_chain / sale_crm / finance_accounting?",
            "error": f"detector_exception:{type(e).__name__}:{e}",
        }

def detect_tasks_llm(message: str, role: str | None = None) -> dict:
    msg = (message or "").strip()
    if not msg:
        return {
            "needs_clarification": True,
            "clarifying_question": "Bạn muốn hỏi về nghiệp vụ ERP hay tra cứu chính sách?",
            "tasks": [],
            "error": "empty_message",
        }

    try:
        resp = _client.models.generate_content(
            model=_GEMINI_DETECT_MODEL,
            contents=f"USER_MESSAGE:\n{msg}\nROLE:\n{role or ''}",
            config={
                "system_instruction": TASK_DESC,
                "temperature": 0.0,
                "response_mime_type": "application/json",
                "response_json_schema": TASK_DETECT_JSON_SCHEMA,
            },
        )
        text = (resp.text or "").strip()
        data = json.loads(text) if text else {}
        out = TaskDetectOut.model_validate(data)

        # ép tối thiểu 1 task nếu LLM trả rỗng
        if (not out.needs_clarification) and (not out.tasks):
            out = out.model_copy(update={
                "tasks": [TaskItem(module="general_chat", question=msg)]
            })

        return {**out.model_dump(), "error": None}
    except Exception as e:
        return {
            "needs_clarification": False,
            "clarifying_question": None,
            "tasks": [{"module": "general_chat", "question": msg}],
            "error": f"task_detector_exception:{type(e).__name__}:{e}",
        }
