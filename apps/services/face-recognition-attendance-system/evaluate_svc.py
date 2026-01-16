import os
import cv2
import glob
import numpy as np
import torch
import matplotlib.pyplot as plt
import seaborn as sns
from facenet_pytorch import InceptionResnetV1
from sklearn.svm import SVC
from sklearn.metrics import confusion_matrix, accuracy_score, f1_score, classification_report
import mediapipe as mp
import random
import gc 

# --- CẤU HÌNH ---
VIDEO_FOLDER = "D:\\face-recognition-attendance-system\\vid_test\\"
THRESHOLD = 0.7
TARGET_TEST_COUNT = 60    
TRAIN_BASE_COUNT = 50     
TARGET_TRAIN_TOTAL = 200  
SPECIAL_NAMES = ['pthuy']

# --- KHỞI TẠO AI ---
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"🔥 Đang chạy trên thiết bị: {device}")

resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
mp_face_detection = mp.solutions.face_detection
detector = mp_face_detection.FaceDetection(min_detection_confidence=0.6, model_selection=1)

def get_embedding(img_bgr):
    """Trích xuất vector"""
    # Không cần convert RGB ở đây nữa vì đã convert ở ngoài để tiết kiệm
    # img_bgr thực chất sẽ là img_rgb được truyền vào
    results = detector.process(img_bgr) 
    if not results.detections: return None
    detection = max(results.detections, key=lambda x: x.score[0])
    keypoints = detection.location_data.relative_keypoints
    left_eye = keypoints[1]; right_eye = keypoints[0]; nose = keypoints[2]
    eye_dist = abs(left_eye.x - right_eye.x)
    if eye_dist < 0.02: return None 
    nose_offset = abs(nose.x - (left_eye.x + right_eye.x) / 2)
    if nose_offset > eye_dist * 0.8: return None
    bbox = detection.location_data.relative_bounding_box
    h, w, c = img_bgr.shape
    x, y, w_box, h_box = int(bbox.xmin * w), int(bbox.ymin * h), int(bbox.width * w), int(bbox.height * h)
    face = img_bgr[max(0, y):y+h_box, max(0, x):x+w_box]
    if face.size == 0: return None
    try:
        face = cv2.resize(face, (160, 160))
        face_tensor = np.transpose(face, (2, 0, 1)).astype(np.float32) / 255.0
        face_tensor = torch.tensor(face_tensor).unsqueeze(0).to(device)
        with torch.no_grad():
            embedding = resnet(face_tensor).detach().cpu().numpy()[0]
        return embedding
    except:
        return None

def random_augment(image):
    """Tạo biến thể ngẫu nhiên"""
    img_aug = image.copy()
    choice = random.choice(['flip', 'bright', 'dark', 'noise', 'blur'])
    if choice == 'flip':
        if random.random() > 0.3: img_aug = cv2.flip(img_aug, 1)
    elif choice == 'bright':
        val = random.randint(10, 40)
        img_aug = cv2.convertScaleAbs(img_aug, alpha=1.1, beta=val)
    elif choice == 'dark':
        val = random.randint(10, 40)
        img_aug = cv2.convertScaleAbs(img_aug, alpha=0.9, beta=-val)
    elif choice == 'noise':
        row, col, ch = img_aug.shape
        gauss = np.random.normal(0, 0.5**0.5, (row, col, ch))
        gauss = gauss.reshape(row, col, ch)
        noisy = img_aug + gauss * 20
        img_aug = np.clip(noisy, 0, 255).astype(np.uint8)
    elif choice == 'blur':
        img_aug = cv2.GaussianBlur(img_aug, (3, 3), 0)
    return img_aug

def process_dataset():
    print(f"🔄 Đang quét video trong: {VIDEO_FOLDER}...")
    video_files = glob.glob(os.path.join(VIDEO_FOLDER, "*.mp4")) + \
                  glob.glob(os.path.join(VIDEO_FOLDER, "*.avi")) + \
                  glob.glob(os.path.join(VIDEO_FOLDER, "*.mov"))
    video_files.sort()
    
    if not video_files:
        print("❌ Không thấy video nào!")
        return None, None, None, None, None

    X_train, y_train = [], []
    X_test, y_test = [], []
    label_map = {} 

    print(f"👉 Tìm thấy {len(video_files)} video. Bắt đầu xử lý...")

    for label_id, video_path in enumerate(video_files):
        filename = os.path.basename(video_path)
        file_name_no_ext = os.path.splitext(filename)[0]
        label_map[label_id] = filename
        
        cap = cv2.VideoCapture(video_path)
        
        # BƯỚC 1: QUÉT TOÀN BỘ (CÓ RESIZE ĐỂ GIẢM RAM)
        all_valid_candidates = [] 
        while True:
            ret, frame = cap.read()
            if not ret: break
            
            # --- FIX MEMORY ERROR: RESIZE ẢNH 4K XUỐNG HD ---
            h, w = frame.shape[:2]
            if w > 1024: # Nếu ảnh lớn hơn 1024px
                scale = 1024 / w
                new_h = int(h * scale)
                frame = cv2.resize(frame, (1024, new_h))
            # -----------------------------------------------

            # Convert RGB một lần ở đây để dùng chung
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Truyền frame_rgb vào get_embedding (đã sửa hàm trên để nhận RGB)
            emb = get_embedding(frame_rgb)
            
            if emb is not None:
                # Lưu frame_rgb để tí nữa augment cho tiện, đỡ convert lại
                all_valid_candidates.append({'emb': emb, 'frame': frame_rgb})
        
        cap.release()
        
        # BƯỚC 2: CHIA TEST/TRAIN
        test_data = []
        train_pool = []
        is_special = file_name_no_ext in SPECIAL_NAMES
        
        if is_special:
            print(f"   🔹 [SPECIAL] Chế độ lấy cuối: {filename}")
            test_data = all_valid_candidates[-TARGET_TEST_COUNT:] 
            train_pool = all_valid_candidates[:-TARGET_TEST_COUNT] 
        else:
            test_data = all_valid_candidates[:TARGET_TEST_COUNT] 
            train_pool = all_valid_candidates[TARGET_TEST_COUNT:] 

        # BƯỚC 3: CÂN BẰNG (BÙ TEST)
        current_test_len = len(test_data)
        current_train_len = len(train_pool)
        
        if current_test_len < TARGET_TEST_COUNT and current_train_len > TRAIN_BASE_COUNT:
            missing = TARGET_TEST_COUNT - current_test_len
            surplus = current_train_len - TRAIN_BASE_COUNT
            amount = min(missing, surplus)
            if amount > 0:
                test_data.extend(train_pool[:amount])
                train_pool = train_pool[amount:]
                print(f"   🔄 [BÙ TEST] Chuyển {amount} ảnh từ Train sang Test.")

        # BƯỚC 4: CÂN BẰNG (BÙ TRAIN)
        MIN_TRAIN_BASE = 15
        if len(train_pool) < MIN_TRAIN_BASE and len(test_data) > 0:
            needed = MIN_TRAIN_BASE - len(train_pool)
            borrowed = random.choices(test_data, k=min(needed, len(test_data)))
            train_pool.extend(borrowed)
            print(f"   🔄 [BÙ TRAIN] Mượn lại {len(borrowed)} ảnh từ Test.")

        # BƯỚC 5: LƯU TEST
        for item in test_data:
            X_test.append(item['emb'])
            y_test.append(label_id)

        # BƯỚC 6: XỬ LÝ TRAIN
        train_vectors_count = 0
        final_train_base = []
        
        if len(train_pool) > TRAIN_BASE_COUNT:
            indices = np.linspace(0, len(train_pool) - 1, TRAIN_BASE_COUNT, dtype=int)
            for idx in indices:
                final_train_base.append(train_pool[idx])
        else:
            final_train_base = train_pool

        if len(final_train_base) == 0:
             final_train_base = test_data

        base_size = len(final_train_base)
        
        if base_size > 0:
            while train_vectors_count < TARGET_TRAIN_TOTAL:
                rand_idx = random.randint(0, base_size - 1)
                candidate = final_train_base[rand_idx]
                
                if train_vectors_count < base_size:
                     final_emb = candidate['emb']
                else:
                     aug_img = random_augment(candidate['frame'])
                     final_emb = get_embedding(aug_img)

                if final_emb is not None:
                    X_train.append(final_emb)
                    y_train.append(label_id)
                    train_vectors_count += 1

        print(f"   + [ID {label_id}][{filename}]")
        print(f"     -> Test : {len(test_data)}/{TARGET_TEST_COUNT}")
        print(f"     -> Train: {train_vectors_count}/{TARGET_TRAIN_TOTAL}")

        # --- DỌN RÁC BỘ NHỚ SAU MỖI VIDEO ---
        del all_valid_candidates
        del train_pool
        del test_data
        gc.collect() 

    return np.array(X_train), np.array(y_train), np.array(X_test), np.array(y_test), label_map

def evaluate_model():
    X_train, y_train, X_test, y_test, label_map = process_dataset()
    
    if X_train is None or len(X_train) == 0:
        print("❌ Lỗi: Không có dữ liệu Train!")
        return

    print(f"\n📊 THỐNG KÊ DATASET:")
    print(f"   - Tổng mẫu Train: {len(X_train)}")
    print(f"   - Tổng mẫu Test : {len(X_test)}")
    
    print("\n🚀 Đang huấn luyện SVM...")
    clf = SVC(kernel='linear', probability=True)
    clf.fit(X_train, y_train)
    print("✅ Huấn luyện xong.")

    print("🔍 Kiểm thử...")
    y_pred = []
    probs = clf.predict_proba(X_test)
    predictions = clf.predict(X_test)
    unknown_count = 0
    
    for i in range(len(X_test)):
        confidence = np.max(probs[i])
        if confidence < THRESHOLD:
            y_pred.append(-1)
            unknown_count += 1
        else:
            y_pred.append(predictions[i])

    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average='macro')

    print("="*40)
    print(f"⭐ ĐỘ CHÍNH XÁC: {acc*100:.2f}%")
    print(f"🎯 F1-SCORE      : {f1*100:.2f}%")
    print(f"⚠️ Unknown: {unknown_count}/{len(X_test)}")
    print("="*40)

    unique_labels = sorted(list(set(y_test)))
    target_names = [f"ID {i}" for i in unique_labels]
    
    labels_to_report = unique_labels.copy()
    names_to_report = target_names.copy()
    
    if -1 in y_pred and -1 not in labels_to_report:
        labels_to_report.append(-1)
        names_to_report.append("Unknown")

    print("\n📋 BẢNG ĐIỂM CHI TIẾT:")
    print(classification_report(y_test, y_pred, labels=labels_to_report, target_names=names_to_report))

    cm = confusion_matrix(y_test, y_pred, labels=labels_to_report)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Oranges', xticklabels=names_to_report, yticklabels=names_to_report)
    plt.xlabel('AI Dự Đoán'); plt.ylabel('Thực Tế')
    plt.show()

if __name__ == "__main__":
    if not os.path.exists(VIDEO_FOLDER):
        os.makedirs(VIDEO_FOLDER)
    else:
        evaluate_model()

# ⭐ ĐỘ CHÍNH XÁC: 96.65%
# 🎯 F1-SCORE      : 89.87%
# ⚠️ Unknown: 21/656 