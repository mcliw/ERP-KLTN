import google.generativeai as genai
import os

# CẤU HÌNH API KEY CỦA BẠN
# Cách 1: Lấy từ biến môi trường (Khuyên dùng)
api_key = os.environ.get("GEMINI_API_KEY")

# Cách 2: Điền trực tiếp (Không khuyến khích nếu public code)
# api_key = "AIzaSy..." 

if not api_key:
    print("❌ Lỗi: Chưa tìm thấy API Key. Vui lòng kiểm tra lại biến môi trường hoặc nhập key.")
else:
    genai.configure(api_key=api_key)

    print(f"{'='*50}")
    print(f"DANH SÁCH MODEL GEMINI KHẢ DỤNG (Ngày: 16/01/2026)")
    print(f"{'='*50}\n")

    try:
        # 1. MODELS TẠO NỘI DUNG (CHAT, VISION, AUDIO)
        print("🤖 MODELS CHAT & VISION (generateContent):")
        chat_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f"  • ID: {m.name:<30} | Tên: {m.display_name}")
                chat_models.append(m.name)
        
        if not chat_models:
            print("  (Không tìm thấy model nào)")

        print("-" * 30)

        # 2. MODELS EMBEDDING (DÙNG CHO RAG)
        print("\n📚 MODELS EMBEDDING (embedContent):")
        embed_models = []
        for m in genai.list_models():
            if 'embedContent' in m.supported_generation_methods:
                print(f"  • ID: {m.name:<30} | Tên: {m.display_name}")
                embed_models.append(m.name)
        
        if not embed_models:
            print("  (Không tìm thấy model nào)")
            
    except Exception as e:
        print(f"\n❌ GẶP LỖI KHI GỌI API: {e}")
        print("👉 Gợi ý: Kiểm tra lại API Key xem có đúng không hoặc Key đã hết hạn mức (Quota) chưa.")