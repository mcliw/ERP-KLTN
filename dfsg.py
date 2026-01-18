import google.generativeai as genai
import os

genai.configure(api_key="AIzaSyDG-uwhWsKd4ifzor2CwX8Fj7Pu5fSc5-c")

def test_model_dimension(model_name):
    try:
        # Embed thử 1 từ đơn giản
        result = genai.embed_content(
            model=model_name,
            content="Hello",
            task_type="retrieval_document"
        )
        vector_len = len(result['embedding'])
        print(f"✅ Model {model_name}: Output ra vector dài {vector_len} chiều.")
    except Exception as e:
        print(f"❌ Model {model_name}: Gặp lỗi - {e}")

print("--- KIỂM TRA THỰC TẾ ---")
# Test model cũ
test_model_dimension("models/gemini-embedding-001") 

# Test model mới
test_model_dimension("models/text-embedding-004")