import chromadb
import numpy as np
import os

class ChromaService:
    def __init__(self):
        # Tạo thư mục lưu DB nếu chưa có
        if not os.path.exists("chroma_db"):
            os.makedirs("chroma_db")
            
        self.client = chromadb.PersistentClient(path="chroma_db")
        
        # Cấu hình sử dụng khoảng cách L2 (Euclidean) chuẩn FaceNet
        self.collection = self.client.get_or_create_collection(
            name="faces_dataset", 
            metadata={"hnsw:space": "l2"}
        )

    def add_data(self, user_id, embedding):
        """Lưu vector vào DB"""
        self.collection.add(
            ids=[f"{user_id}_{np.random.randint(1000000)}"],
            embeddings=[embedding.tolist()],
            metadatas=[{"user_id": str(user_id)}]
        )

    def get_training_data(self):
        """
        Lấy dữ liệu để train.
        """
        # Lấy toàn bộ dữ liệu
        data = self.collection.get(include=['embeddings', 'metadatas'])
        
        embeddings = data['embeddings']
        metadatas = data['metadatas']
        
        # --- SỬA LỖI VALUE ERROR TẠI ĐÂY ---
        # Kiểm tra None trước
        if embeddings is None:
            print("⚠️ ChromaService: Dữ liệu None.")
            return [], []
            
        # Kiểm tra độ dài (Dùng len() an toàn cho cả List và Numpy Array)
        if len(embeddings) == 0:
            print("⚠️ ChromaService: Không tìm thấy vector nào trong DB!")
            return [], []
            
        # Ép kiểu về Numpy Array để xử lý tiếp
        X = np.array(embeddings)
        y = [int(meta['user_id']) for meta in metadatas]
        
        print(f"✅ ChromaService: Đã lấy được {len(X)} vector từ DB.")
        return X, y

    def query_nearest(self, query_embedding, n_results=1):
        """Tìm kiếm vector gần nhất (Dùng cho check-in)"""
        results = self.collection.query(
            query_embeddings=[query_embedding.tolist()],
            n_results=n_results,
            include=['metadatas', 'distances']
        )
        
        # Kiểm tra an toàn cho results
        if not results['ids'] or len(results['ids'][0]) == 0:
            return None, 999
            
        neighbor_id = int(results['metadatas'][0][0]['user_id'])
        distance = results['distances'][0][0]
        
        return neighbor_id, distance