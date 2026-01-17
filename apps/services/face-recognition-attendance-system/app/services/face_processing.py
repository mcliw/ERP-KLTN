import os
import warnings

# --- 1. TẮT LOG RÁC ---
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['ABSL_LOG_LEVEL'] = 'error'
warnings.filterwarnings("ignore")

import cv2
import numpy as np
import mediapipe as mp
import torch
import time
import joblib
from facenet_pytorch import InceptionResnetV1
from sklearn.svm import SVC
import traceback

class AIModel:
    def __init__(self):
        # --- CẤU HÌNH GPU ---
        if torch.cuda.is_available():
            self.device = torch.device('cuda')
            torch.backends.cudnn.benchmark = True 
            print(f"🔥 AI Engine đang chạy trên GPU: {torch.cuda.get_device_name(0)}")
        else:
            self.device = torch.device('cpu')
            print("❄️ AI Engine đang chạy trên CPU")

        # --- MEDIAPIPE (DETECTION - CPU) ---
        self.mp_face_detection = mp.solutions.face_detection
        self.detector = self.mp_face_detection.FaceDetection(
            min_detection_confidence=0.6,
            model_selection=1 
        )
        
        # --- FACENET (EMBEDDING - GPU) ---
        print("⏳ Đang khởi tạo Neural Network...")
        try:
            self.resnet = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)
            print("✅ Hệ thống AI đã sẵn sàng!")
        except Exception as e:
            print(f"❌ Lỗi khởi tạo AI: {e}")
        
        # --- SVM CLASSIFIER ---
        self.svm_model = None
        self.model_path = "model_save/svm_face_classifier.pkl"
        
        if not os.path.exists("model_save"):
            os.makedirs("model_save")
            
        self.load_svm()

    def get_face_embedding(self, image_np):
        """Chuyển ảnh khuôn mặt thành vector số"""
        try:
            img_rgb = cv2.cvtColor(image_np, cv2.COLOR_BGR2RGB)
            results = self.detector.process(img_rgb)
            
            if not results.detections: return None 

            detection = max(results.detections, key=lambda x: x.score[0])
            bbox = detection.location_data.relative_bounding_box
            h, w, c = image_np.shape
            
            x, y = int(bbox.xmin * w), int(bbox.ymin * h)
            dw, dh = int(bbox.width * w), int(bbox.height * h)
            
            face_crop = img_rgb[max(0, y):y+dh, max(0, x):x+dw]
            if face_crop.size == 0: return None

            # Xử lý trên GPU
            face_crop = cv2.resize(face_crop, (160, 160))
            face_tensor = np.transpose(face_crop, (2, 0, 1)).astype(np.float32) / 255.0
            face_tensor = torch.tensor(face_tensor).unsqueeze(0).to(self.device)

            with torch.no_grad():
                embedding = self.resnet(face_tensor)
            
            return embedding.detach().cpu().numpy()[0]
        except:
            return None

    def load_svm(self):
        if os.path.exists(self.model_path):
            try:
                self.svm_model = joblib.load(self.model_path)
            except:
                self.svm_model = None

    def predict_identity(self, embedding):
        if self.svm_model is None:
            return "Unknown", 0.0
            
        embedding = embedding.reshape(1, -1)
        pred_id = self.svm_model.predict(embedding)[0]
        prob = self.svm_model.predict_proba(embedding)[0].max()
        return pred_id, prob

    def train_svm(self, X, y):
        print("\n🔄 [SYSTEM] Đang cập nhật dữ liệu nhận diện...")
        try:
            X_list = []
            y_list = []

            if isinstance(X, np.ndarray): X_list = X.tolist()
            elif isinstance(X, list): X_list = X
            
            if isinstance(y, np.ndarray): y_list = y.tolist()
            elif isinstance(y, list): y_list = y

            if len(X_list) == 0: return

            unique_classes = set(y_list)
            # Nếu chỉ có 1 người, thêm dữ liệu giả để SVM không lỗi
            if len(unique_classes) < 2:
                for _ in range(5):
                    fake_emb = np.random.rand(512).astype(np.float32)
                    X_list.append(fake_emb.tolist())
                    y_list.append(9999)

            X_final = np.array(X_list)
            y_final = np.array(y_list)
            
            clf = SVC(kernel='linear', probability=True)
            clf.fit(X_final, y_final)
            
            self.svm_model = clf
            joblib.dump(clf, self.model_path)
            print("✅ [SYSTEM] Cập nhật hoàn tất!")
            
        except Exception as e:
            print(f"❌ Lỗi Train: {str(e)}")

    # --- HÀM ĐỒNG BỘ DỮ LIỆU ĐẦY ĐỦ (BẠN VỪA GỬI) ---
    def sync_and_retrain(self, chroma_service, dataset_path="dataset"):
        if not os.path.exists(dataset_path):
            return False, "Không tìm thấy thư mục dataset"
        
        print("\n🔄 BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU...")
        
        # 1. Reset Collection 
        try:
            chroma_service.client.delete_collection("faces_dataset")
            chroma_service.collection = chroma_service.client.get_or_create_collection(name="faces_dataset", metadata={"hnsw:space": "l2"})
        except: pass

        total_files = 0
        
        # 2. Quét ảnh từ ổ cứng và nạp lại vào DB
        for folder in os.listdir(dataset_path):
            folder_path = os.path.join(dataset_path, folder)
            if os.path.isdir(folder_path):
                parts = folder.split('_')
                if not parts[0].isdigit(): continue
                user_id = int(parts[0])
                
                for img_name in os.listdir(folder_path):
                    img_path = os.path.join(folder_path, img_name)
                    img = cv2.imread(img_path)
                    if img is None: continue
                    
                    emb = self.get_face_embedding(img)
                    if emb is not None:
                        chroma_service.add_data(user_id, emb)
                        total_files += 1
        
        if total_files == 0:
            return False, "Dataset trống rỗng!"

        print(f"✅ Đã quét {total_files} ảnh. Đang huấn luyện lại...")

        # 3. Đợi một chút để DB kịp Index (quan trọng)
        time.sleep(2)
            
        # 4. Lấy dữ liệu ra
        X, y = chroma_service.get_training_data()
        
        # 5. Huấn luyện lại SVM
        self.train_svm(X, y)
        
        return True, f"Đã đồng bộ {total_files} ảnh và train lại AI."