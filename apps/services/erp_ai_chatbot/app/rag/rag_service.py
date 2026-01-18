from __future__ import annotations
import os
import time
from typing import Any, Dict, List, Optional
from dotenv import load_dotenv

from app.rag.loader import load_data_dir
from app.rag.chunker import chunk_text
# Giả sử hàm này đã có retry logic như mình bàn ở bài trước
from app.rag.embeddings_gemini import embed_texts 
from app.rag.vectorstore_chroma import ChromaStore
from google import genai
from google.genai import types # Import thêm types để cấu hình chuẩn

load_dotenv()

class RagPolicyService:
    def __init__(self):
        self.data_dir = os.getenv("RAG_DATA_DIR", "")
        self.persist_dir = os.getenv("CHROMA_DIR", "./chroma_policy")
        self.collection = os.getenv("RAG_COLLECTION", "erp_policy_md")
        
        # Init ChromaDB
        self.store = ChromaStore(self.persist_dir, self.collection)
        
        # Init Gemini
        self.chat_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("❌ Chưa cấu hình GEMINI_API_KEY")
        self.client = genai.Client(api_key=api_key)

    def build_or_update_index(self, rebuild: bool = True) -> Dict[str, Any]:
        before = self.store.count()
        deleted = 0
        if rebuild:
            deleted = self.store.wipe_all()
        after_reset = self.store.count()

        docs = load_data_dir(self.data_dir)
        if not docs:
            return {"ok": False, "error": f"Không tìm thấy file trong: {self.data_dir}"}

        all_ids: List[str] = []
        all_docs: List[str] = []
        all_metas: List[Dict[str, Any]] = []

        print(f"🔄 Đang xử lý {len(docs)} tài liệu...")

        # 1. Chunking
        for d in docs:
            chunks = chunk_text(doc_id=d.doc_id, title=d.title, text=d.text, chunk_size=1600, overlap=300)
            for ch in chunks:
                all_ids.append(ch.chunk_id)
                all_docs.append(ch.text)
                all_metas.append({
                    "doc_id": d.doc_id,
                    "title": d.title,
                    "source": os.path.basename(d.source_path),
                    "chunk_id": ch.chunk_id,
                })

        # --- CẤU HÌNH AN TOÀN CHO FREE TIER ---
        # Giảm Batch xuống 10 (thay vì 50) để không bị nghẽn cổ chai Token
        BATCH_SIZE = 10 
        total_chunks = len(all_docs)
        all_embs = []

        print(f"📦 Tổng số chunks cần nạp: {total_chunks}")
        print(f"⚡ Chế độ an toàn: Batch {BATCH_SIZE} | Nghỉ giữa hiệp: 5s")

        for i in range(0, total_chunks, BATCH_SIZE):
            batch_texts = all_docs[i : i + BATCH_SIZE]
            current_batch_idx = f"{i}-{min(i+BATCH_SIZE, total_chunks)}"
            
            # --- VÒNG LẶP RETRY (KIÊN TRÌ) ---
            # Nếu lỗi 429, nó sẽ thử lại tối đa 5 lần
            max_retries = 5
            for attempt in range(max_retries):
                try:
                    print(f"   -> Đang embed batch {current_batch_idx} (Lần thử {attempt+1})...", end="\r")
                    
                    # Gọi hàm embed
                    batch_embs = embed_texts(batch_texts)
                    
                    # Kiểm tra xem có bị trả về rỗng không
                    if not batch_embs or len(batch_embs) != len(batch_texts):
                        raise Exception("Lỗi: Số lượng vector trả về không khớp hoặc rỗng")
                        
                    all_embs.extend(batch_embs)
                    print(f"   ✅ Batch {current_batch_idx} thành công!                    ")
                    
                    # QUAN TRỌNG: Nghỉ 5 giây để hồi máu (Token) cho phút tiếp theo
                    time.sleep(5) 
                    break # Thoát vòng lặp retry để sang batch tiếp theo

                except Exception as e:
                    is_rate_limit = "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e)
                    
                    if is_rate_limit:
                        wait_time = 15 + (attempt * 5) # Chờ 15s, 20s, 25s...
                        print(f"\n   ⚠️ Quá tải (429). Đang chờ {wait_time}s để Google mở lại cổng...")
                        time.sleep(wait_time)
                    else:
                        print(f"\n   ❌ Lỗi Batch {current_batch_idx}: {e}")
                        # Nếu lỗi không phải 429 thì fill rỗng để không hỏng index
                        all_embs.extend([[] for _ in range(len(batch_texts))])
                        break

        # 3. Upsert vào ChromaDB
        valid_ids, valid_docs, valid_metas, valid_embs = [], [], [], []
        for i in range(len(all_embs)):
            if all_embs[i]: 
                valid_ids.append(all_ids[i])
                valid_docs.append(all_docs[i])
                valid_metas.append(all_metas[i])
                valid_embs.append(all_embs[i])

        if valid_ids:
            self.store.upsert(ids=valid_ids, documents=valid_docs, metadatas=valid_metas, embeddings=valid_embs)

        return {
            "ok": True,
            "docs_processed": len(docs),
            "chunks_generated": total_chunks,
            "chunks_indexed": len(valid_ids),
            "status": "success"
    }

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        q = (query or "").strip()
        if not q: return []
        
        # Embed câu hỏi
        q_emb_list = embed_texts([q])
        if not q_emb_list or not q_emb_list[0]:
            return []
            
        return self.store.query(query_embedding=q_emb_list[0], top_k=top_k)

    def answer(self, question: str, top_k: int = 5) -> Dict[str, Any]:
        q = (question or "").strip()
        if not q:
            return {"ok": False, "error": "empty_question"}

        hits = self.retrieve(q, top_k=top_k)

        # build context text
        ctx_blocks = []
        sources = []
        for h in hits:
            meta = h.get("meta") or {}
            src = meta.get("source", "")
            title = meta.get("title", "")
            chunk_id = meta.get("chunk_id", h.get("id", ""))
            text = h.get("text", "") or ""
            ctx_blocks.append(f"[{src} | {title} | {chunk_id}]\n{text}")
            sources.append({
                "file": os.path.basename(src) if src else src,
                "title": title,
                "chunk_id": chunk_id,
                "distance": h.get("distance"),
            })

        context_text = "\n\n".join(ctx_blocks).strip()

        system_prompt = """
        Bạn là trợ lý ChatBot) ERP AI. Nhiệm vụ: trả lời câu hỏi về CHÍNH SÁCH dựa trên CONTEXT.
        Quy tắc bắt buộc:
        1) Chỉ dùng thông tin có trong CONTEXT. Không suy đoán, không thêm chi tiết ngoài.
        2) Trả lời NGẮN và ĐÚNG TRỌNG TÂM:ưu tiên trả lời bằng đoạn văn NGẮN 1 đến 2 câu thôi.
        3) Không giải thích dài, không mô tả quy trình chi tiết nếu người dùng không hỏi.
        4) Nếu câu hỏi chung, chỉ tóm tắt 1-2 điểm quan trọng nhất.
        5) Kết thúc bằng: "Nguồn: <file1>, <file2>" (tối đa 2 nguồn).
        6) Trả lời thân thiện, văn phong nhẹ nhàng lịch sự.
        7) Có thể viết gọn số tiền lại ví dụ 1.000.000 VNĐ có thể cho thành 1 triệu đồng hoặc 100000 VNĐ thì có thể thành 100k hoặc 100 nghìn.
        8) Có thể chuyển cách hiểu số tiền là bội của 1000 + k ví dụ 10000 vnd tức là 10k hay 120000 vnđ là 120k,.... nếu bội quá lớn thì quay về cách đọc ở mục là đọc thành triệu (có thể áp dụng từ 10 triệu trở đi tức 10.000.000)
        9) Khuyến khích có thể CẢNH BÁO, NHẮC NHỞ, GIẢI THÍCH về vấn đề trong câu hỏi của người dùng nếu đó là vấn đề nghiêm trọng.
        10) Cách viết và trình bày như con người không có \ n hay các kí tự ở trong code đâu nhé
        11) Người dùng hỏi CÓ hoặc KHÔNG thì nên trả lời lại người dùng có hoặc không về vấn đề đó.
        12) Không được trả về chuỗi rồng "" ít nhất cũng phải trả lại Không có dữ liệu trong tài liệu công ty hoặc Không thể tra cứu. Thêm câu Vui lòng liên hệ bộ phận chăm sóc khách hàng 18002555 để biết thêm chi tiết.
        Quan trọng: Không được bịa thông tin phải dựa hoàn toàn vào CONTEXT nếu không tìm thấy thông tin hoặc thông tin không phù hợp câu hỏi thì trả lời không có dữ liệu.
        YÊU CẦU VỀ HÌNH THỨC TRẢ LỜI:
        1. TRẢ LỜI DẠNG VĂN BẢN THUẦN (PLAIN TEXT): Tuyệt đối KHÔNG dùng các ký tự định dạng như dấu sao (**), dấu thăng (#) hay dấu gạch dưới (_) hay ký tự xuống dòng (/n).
        2. NHẤN MẠNH: Nếu cần nhấn mạnh, hãy VIẾT HOA toàn bộ từ đó (Ví dụ: CẢNH BÁO, LƯU Ý, KHÔNG ĐƯỢC).
        3. KHÔNG XUỐNG DÒNG.
        4. NGẮN GỌN: Trả lời trực diện, không lan man.
        """

        user_prompt = f"""CÂU HỎI: {q}

CONTEXT:
{context_text if context_text else "(empty)"}

Lưu ý: Ưu tiên trả lời theo đoạn. Trả lời dựa trên CONTEXT. Nếu thiếu, nói thiếu.
"""

        resp = self.client.models.generate_content(
            model=self.chat_model,
            contents=user_prompt,
            config={
                "system_instruction": system_prompt,
                "temperature": 0.1,
            },
        )

        answer = (resp.text or "").strip()
        return {"ok": True, "answer": answer, "sources": sources, "hits": hits}
