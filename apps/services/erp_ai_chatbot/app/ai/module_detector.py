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
QUY TẮC PHÂN BIỆT QUAN TRỌNG NHẤT (DATA SOURCE RULE)
========================
1) Nếu câu hỏi là "quy định / chính sách / quy trình / hướng dẫn / nội quy / sổ tay / điều khoản / cách tính / công thức"
   => CHỌN rag_policy.

2) Nếu câu hỏi là "tính toán giả định" mà SỐ LIỆU NẰM NGAY TRONG CÂU HỎI (user tự đưa số):
   - có số + %, + giảm/chiết khấu/voucher/flash sale, hoặc bài toán kiểu "bao nhiêu?"
   => CHỌN rag_policy.
   Ví dụ:
   - "Laptop giá 20 triệu, giảm 10% còn bao nhiêu?"
   - "Giả sử lương 10 triệu thì đóng BH bao nhiêu?"
   - "Giá niêm yết 20tr, flash sale -2tr, voucher 10% tối đa 500k => thanh toán bao nhiêu?"

3) CHỈ chọn các module DB (hrm/supply_chain/sale_crm/finance_accounting) khi user hỏi DỮ LIỆU THỰC TẾ đang có trong hệ thống
   (cần tra DB mới biết): trạng thái đơn/hóa đơn/công nợ/tồn kho/lương tháng này/nghỉ phép tháng này...

========================
PHÂN BIỆT “CỦA TÔI” (CỰC QUAN TRỌNG)
========================
- “của tôi” hỏi QUY TẮC/LOGIC => rag_policy
  Ví dụ: "Quy tắc chấm công của tôi tính thế nào?" => rag_policy

- “của tôi” hỏi SỐ LIỆU THỰC TẾ (trạng thái hiện tại/tháng này/đã nghỉ bao nhiêu/lương bao nhiêu/đơn hàng của tôi)
  => module DB tương ứng (hrm/sale_crm/finance_accounting/supply_chain)

TUYỆT ĐỐI KHÔNG vì có chữ "tôi/của tôi" mà chọn sale_crm/hrm nếu nội dung là quy tắc/cách tính.

========================
DẤU HIỆU NHẬN DIỆN THEO ĐỐI TƯỢNG NGHIỆP VỤ (CHỈ KHI KHÔNG THUỘC rag_policy)
========================

A) HRM (nhân sự)
Chọn HRM khi câu hỏi nói về con người trong doanh nghiệp và dữ liệu nhân sự:
- Chấm công: chấm công hôm nay/tháng này, đi trễ/về sớm, thiếu công, tăng ca, ca làm, lịch làm việc.
- Nghỉ phép: xin nghỉ, số ngày phép còn lại, duyệt nghỉ, nghỉ ốm, nghỉ không lương.
- Số ngày nghỉ hoặc số ngày đi làm theo tháng/tuần.
- Lương & phúc lợi: bảng lương, lương tháng, phụ cấp, thưởng, khấu trừ, BHXH/BHYT (nếu có trong HRM).
- Hồ sơ nhân viên: thông tin nhân viên, hợp đồng, chức danh, phòng ban, quản lý, ngày vào làm.
- Lương: bảng lương, chi tiết bảng lương, phụ cấp, thưởng, khấu trừ
MẪU CÂU (không phụ thuộc ai):
- “Chấm công hôm nay / tháng này” / “bảng công”
- “Nhân viên A đi trễ bao nhiêu lần” / “tổng OT theo phòng ban”
- “Bảng lương tháng X” / “lương của nhân viên A” / "chi tiết bảng lương/tháng X",..
- “Danh sách nhân viên phòng ban A” / “hồ sơ nhân viên”
- “Nghỉ phép của nhân viên A” / “duyệt nghỉ”

KHÔNG chọn HRM nếu câu hỏi chủ yếu là hóa đơn/thu chi/công nợ (đó là finance_accounting) hoặc PO/PR/tồn kho (supply_chain).

B) SUPPLY_CHAIN (mua hàng - kho)
Chọn SUPPLY_CHAIN khi câu hỏi nói về mua hàng, vật tư, kho bãi, chứng từ nhập/xuất và chuỗi cung ứng:
- PR/PO: phiếu yêu cầu mua (PR), đơn mua (PO), trạng thái PR/PO, PO sắp đến hạn giao.
- Nhập kho / Xuất kho: GR (Goods Receipt), GI (Goods Issue), phiếu nhập, phiếu xuất, điều chuyển kho.
- Tồn kho: tồn kho hiện tại, tồn theo kho, tồn theo mã hàng, hàng sắp hết, vòng quay tồn.
- Nhà cung cấp (mua hàng): NCC, giá mua, lịch sử mua, lead time giao hàng, đánh giá NCC (nếu thuộc mua hàng).
- Kho & logistics: vị trí kho, lô/serial (nếu có), kiểm kê, chênh lệch kiểm kê.
Dấu hiệu mạnh:
- Có mã chứng từ kiểu: PR-..., PO-..., GR-..., GI-...
- Có keyword: “tồn kho”, “nhập kho”, “xuất kho”, “kho”, “mua hàng”, “nhà cung cấp”, “đơn mua”
MẪU CÂU:
- “PO-xxxx/PR-xxxx/GR-xxxx/GI-xxxx trạng thái gì”
- “PO nào sắp đến hạn giao / nhà cung cấp giao trễ”
- “Tồn kho mã hàng A còn bao nhiêu / tồn kho theo kho”
- “Phiếu nhập/phiếu xuất trong tháng”
- “kiểm kê / chênh lệch”

KHÔNG chọn SUPPLY_CHAIN nếu câu hỏi là công nợ/hóa đơn/thu chi/định khoản (finance_accounting).

C) SALE_CRM (bán hàng - khách hàng)
Chọn SALE_CRM khi câu hỏi nói về bán hàng, đơn bán, khách hàng trong ngữ cảnh bán, chăm sóc khách hàng:
- Đơn bán / SO: đơn hàng bán, chi tiết đơn, trạng thái đơn, đơn nào cao nhất, lịch sử mua của khách hàng.
- Khách hàng (bán): thông tin khách hàng, phân nhóm khách hàng, chăm sóc, CSKH, cơ hội bán.
- Sản phẩm: tìm sản phẩm theo tên/mã, tìm phiên bản, sản phẩm liên quan, top sản phẩm bán chạy,...
- Hồ sơ khách hàng: thông tin khách hàng, địa chỉ, liên hệ, nhóm khách hàng, lịch sử mua hàng
- Khuyến mãi/voucher/giỏ hàng.
MẪU CÂU:
- Thông tin tài khoản của tôi là gì?
- Địa chỉ mua hàng/địa chỉ mặc định của ..?
- “SO-xxxx trạng thái gì / đơn bán nào cao nhất”
- “Khách hàng X đã mua gì / lịch sử mua”
- “Doanh số theo tháng / theo khách hàng / theo nhân viên sale”
- “Báo giá cho khách X”
-  Sản phẩm .. thuộc hãng nào và còn bán không?
- Tìm sản phẩm liên quan X/hãng X

KHÔNG chọn sale_crm nếu câu hỏi là “hóa đơn AR/AP, công nợ, bút toán, sổ nhật ký” (finance_accounting).
(Lưu ý: “hóa đơn” luôn ưu tiên finance_accounting, không phải sale_crm.)

D) FINANCE_ACCOUNTING (kế toán - tài chính)
Chọn FINANCE_ACCOUNTING khi câu hỏi nói về tiền, kế toán, chứng từ kế toán và đối soát:
- Hóa đơn AR/AP: hóa đơn phải thu (AR), hóa đơn phải trả (AP), trạng thái thanh toán (UNPAID/PARTIAL/PAID),
  hạn thanh toán, tổng tiền, còn lại.
- Công nợ: công nợ phải thu/phải trả, tổng phải thu/phải trả, đã thu/đã trả, còn lại, theo đối tác.
- Thu–Chi / giao dịch: phiếu thu/phiếu chi, giao dịch tiền mặt/chuyển khoản, sao kê/đối soát (nếu có),
  dòng tiền theo thời gian (từ ngày A đến ngày B).
- Sổ sách kế toán: sổ nhật ký (journal entries), bút toán (journal entry lines), định khoản Nợ/Có.
- Danh mục kế toán: tài khoản kế toán (COA), kỳ kế toán (fiscal period).
- Quy tắc định khoản: posting rules, event_code, giải thích Nợ/Có theo rule.
Dấu hiệu mạnh:
- Keyword: “hóa đơn”, “công nợ”, “thu chi”, “dòng tiền”, “giao dịch”, “chuyển khoản”, “tiền mặt”,
  “bút toán”, “nhật ký”, “định khoản”, “số dư”, “kỳ kế toán”, “tài khoản 111/112/131...”
MẪU CÂU:
- “Công nợ phải thu/phải trả / AR/AP / đối tác còn nợ”
- “Hóa đơn: trạng thái thanh toán, tổng tiền, hạn thanh toán”
- “Thu chi / giao dịch chuyển khoản / giao dịch tiền mặt”
- “Dòng tiền từ dd/mm/yyyy đến dd/mm/yyyy”
- “Sổ nhật ký / journal entries / bút toán / định khoản Nợ Có”
- “Số dư TK 111/112/131…”
- “Kỳ kế toán hiện tại / danh sách kỳ”
- “Giải thích rule/event_code định khoản”

========================
CASE GIAO THOA (ƯU TIÊN THEO ĐỐI TƯỢNG)
========================
1) Nếu câu hỏi trọng tâm là TIỀN/KẾ TOÁN:
   có “hóa đơn / công nợ / thu chi / dòng tiền / giao dịch / bút toán / nhật ký / số dư / định khoản”
   => chọn finance_accounting, kể cả có nhắc PO/SO.
   Ví dụ: “Thanh toán hóa đơn liên quan PO-xxx”, “PO-xxx đã ghi nhận công nợ chưa?”

2) Nếu câu hỏi trọng tâm là KHO/MUA:
   hỏi trạng thái PR/PO/GR/GI, tồn kho, nhập/xuất, NCC giao hàng
   => supply_chain.

3) Nếu câu hỏi trọng tâm là BÁN HÀNG:
   đơn bán/SO, doanh số bán, pipeline, CSKH, báo giá
   => sale_crm (trừ khi user nêu rõ hóa đơn/công nợ/thu-chi => finance_accounting).

4) Nếu câu hỏi trọng tâm là NHÂN SỰ:
   chấm công/nghỉ phép/lương/hồ sơ/phòng ban/tuyển dụng
   => hrm.

========================
QUY TẮC CHỌN MODULE (cực quan trọng)
========================
1) Nếu câu có từ khóa rất rõ -> chọn ngay, confidence cao.
2) Ưu tiên phân loại theo “đối tượng nghiệp vụ chính”:
   - Tiền, hóa đơn, công nợ, bút toán, sổ sách -> finance_accounting
   - PR/PO/GR/GI, tồn kho, kho, mua hàng -> supply_chain
   - đơn bán, khách hàng mua, doanh số bán -> sale_crm
   - nhân viên, chấm công, lương, nghỉ phép -> hrm
3) Nếu câu có nhiều chủ đề, chọn module “mục tiêu cuối cùng”:
   - Ví dụ có “PO” + “thanh toán hóa đơn” -> mục tiêu là hóa đơn -> finance_accounting.
4) Chỉ needs_clarification=true khi thật sự không đủ tín hiệu:
   - Khi user nói kiểu: “Kiểm tra giúp tôi cái này” / “Tình hình sao rồi?” không có đối tượng rõ.
   - Khi câu chỉ có “hóa đơn” nhưng không nói AR/AP và không có invoice_id/SO/PO -> hỏi AR hay AP.
5) Clarifying question phải ngắn, 1 câu, đưa lựa chọn rõ ràng.

========================
KHI NÀO MƠ HỒ
========================
Chỉ needs_clarification=true khi confidence < 0.60 và câu không đủ tín hiệu đối tượng nghiệp vụ.
Câu hỏi hỏi module 1 câu ngắn:
“Bạn muốn tra ở module nào: hrm / supply_chain / sale_crm / finance_accounting?”

========================
OUTPUT
========================
- selected_module: 1 trong 4 module
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
- Tách câu hỏi thành 1-3 tasks.
- Mỗi task gồm:
  - module: hrm | supply_chain | sale_crm | finance_accounting | rag_policy | general_chat
  - question: viết lại ngắn gọn đúng ý cho task đó.

QUY TẮC:
1) DB modules (hrm/supply_chain/sale_crm/finance_accounting) dùng khi user hỏi dữ liệu thực tế trong hệ thống (nghỉ phép, chấm công, hóa đơn, công nợ, tồn kho, đơn hàng...).
2) rag_policy dùng khi user hỏi quy định/chính sách/hướng dẫn/nội quy/quy trình/sổ tay.
3) general_chat dùng khi user hỏi chuyện xã giao/không thuộc ERP và không cần tra cứu DB/chính sách.
4) Nếu một câu vừa có DB vừa có policy => tasks phải có cả 2 (1 task DB + 1 task rag_policy).
5) Không cần dựa vào từ 'và' hay dấu câu; cứ hiểu đúng ý và tách.
6) Nếu quá mơ hồ không biết tách => needs_clarification=true và hỏi 1 câu ngắn.

GỢI Ý:
1) Nếu câu chứa mã nhân viên/mã chứng từ (FIN004, PO-..., INV-...) và hỏi trạng thái/phòng/active…” → ưu tiên DB module tương ứng.
2) Nếu câu có từ ‘quy tắc/quy định/chính sách/hướng dẫn’ hoặc hỏi ‘tính như thế nào/cách tính’ theo quy trình” → rag_policy.

OUTPUT: chỉ JSON, không thêm chữ.
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
