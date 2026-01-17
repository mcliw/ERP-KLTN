import chromadb
import numpy as np
import os

class ChromaService:
    def __init__(self):
        # --- CẤU HÌNH KẾT NỐI SERVER (DOCKER) ---
        # Lấy host và port từ biến môi trường (được định nghĩa trong docker-compose.yml)
        # Nếu chạy local (không qua docker), mặc định sẽ trỏ về localhost:8000
        db_host = os.getenv("CHROMA_DB_HOST", "localhost")
        db_port = os.getenv("CHROMA_DB_PORT", "8000")

        print(f"🔌 ChromaService: Đang kết nối tới {db_host}:{db_port}...")

        try:
            # Sử dụng HttpClient để kết nối tới ChromaDB container
            self.client = chromadb.HttpClient(host=db_host, port=int(db_port))
            
            # Kiểm tra kết nối bằng heartbeat
            self.client.heartbeat()
            print("✅ ChromaService: Kết nối thành công!")
        except Exception as e:
            print(f"❌ ChromaService Lỗi: Không thể kết nối tới ChromaDB tại {db_host}:{db_port}. Chi tiết: {e}")
            # Lưu ý: Nếu không kết nối được DB, ứng dụng có thể sẽ crash ở các bước sau.

        # Cấu hình sử dụng khoảng cách L2 (Euclidean) chuẩn FaceNet
        # get_or_create_collection hoạt động giống nhau ở cả Client và Server mode
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