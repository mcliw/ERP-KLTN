import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import cv2
import numpy as np
import time
import threading
import mediapipe as mp

# --- CẤU HÌNH ---
API_URL = "http://localhost:8000/api"
CHECKIN_INTERVAL = 2.0 
VIDEO_SOURCE = "http://host.docker.internal:5000/video_feed"
# Cấu hình trang
st.set_page_config(page_title="Hệ Thống Chấm Công AI", layout="wide", page_icon="📷")

# --- CSS ---
st.markdown("""
    <style>
    .main {background-color: #f5f5f5;}
    .stButton>button {width: 100%; border-radius: 5px; height: 3em;}
    button[title="Stop"] {display: none;} 
    </style>
    """, unsafe_allow_html=True)

# --- BIẾN TOÀN CỤC ---
global_status = {"message": "San Sang...", "color": (255, 255, 255)}

# --- HÀM GỬI API ---
def send_frame_to_api(frame_bytes):
    global global_status
    try:
        files = {'file': ('auto_checkin.jpg', frame_bytes, 'image/jpeg')}
        # Timeout 3s
        res = requests.post(f"{API_URL}/checkin/", files=files, data={'device_id': 'CAM_01'}, timeout=3)
        
        if res.status_code == 200:
            result = res.json()
            status = result.get('status')
            msg = result.get('message', '')
            
            if status == 'success':
                global_status = {"message": f"✅ {msg}", "color": (0, 255, 0)}
            elif status == 'unknown':
                global_status = {"message": f"⚠️ {msg}", "color": (0, 0, 255)}
            elif status == 'warning':
                global_status = {"message": f"⛔ {msg}", "color": (255, 165, 0)}
            else:
                global_status = {"message": "🔍 Đang tìm...", "color": (0, 255, 255)}
    except:
        pass 

# --- MENU ---
st.sidebar.image("https://cdn-icons-png.flaticon.com/512/3253/3253266.png", width=100)
st.sidebar.title("MENU QUẢN LÝ")

menu = st.sidebar.radio(
    "Chức năng", 
    ["📷 Chấm Công (Video)", "📝 Đăng Ký Mới", "🏠 Dashboard", "👥 Danh Sách NV", "📊 Báo Cáo", "⚙️ Cài Đặt"],
    label_visibility="collapsed"
)

# ==================================================
# 1. TRANG CHẤM CÔNG VIDEO
# ==================================================
if menu == "📷 Chấm Công (Video)":
    st.title("📷 CHẤM CÔNG (REAL-TIME)")
    
    col1, col2 = st.columns([3, 1])
    
    with col2:
        st.markdown("### 🎮 Điều khiển")
        run = st.checkbox('🔴 BẬT CAMERA', value=True)
        
        st.write("---")
        current_status = global_status
        color_hex = "#00FF00" if current_status['color'] == (0, 255, 0) else "#FF0000" if current_status['color'] == (0, 0, 255) else "#FFA500"
        
        st.markdown(f"""
            <div style="padding: 15px; border: 2px solid {color_hex}; border-radius: 10px; text-align: center;">
                <h4 style="color: {color_hex}; margin: 0;">{current_status['message']}</h4>
            </div>
        """, unsafe_allow_html=True)

    with col1:
        FRAME_WINDOW = st.image([])
        cap = None
        
        if run:
            cap = cv2.VideoCapture(VIDEO_SOURCE)
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            last_send_time = time.time()
            
            while run:
                ret, frame = cap.read()
                if not ret:
                    st.error("Không tìm thấy Camera!")
                    break
                
                frame = cv2.flip(frame, 1)
                
                if time.time() - last_send_time > CHECKIN_INTERVAL:
                    last_send_time = time.time()
                    small_frame = cv2.resize(frame, (480, 360))
                    _, buffer = cv2.imencode('.jpg', small_frame)
                    threading.Thread(target=send_frame_to_api, args=(buffer.tobytes(),)).start()

                msg = global_status['message']
                color = global_status['color']
                cv2.rectangle(frame, (0, 0), (640, 60), (0,0,0), -1)
                cv2.putText(frame, msg, (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                
                try:
                    _, encoded_frame = cv2.imencode('.jpg', frame)
                    FRAME_WINDOW.image(encoded_frame.tobytes())
                except Exception:
                    pass
                
                time.sleep(0.03)
                
            cap.release()
        else:
            st.info("Đã tắt Camera.")

# ==================================================
# 2. TRANG ĐĂNG KÝ
# ==================================================
elif menu == "📝 Đăng Ký Mới":
    st.title("📝 ĐĂNG KÝ NHÂN VIÊN MỚI (QUY TRÌNH 4 GÓC ĐỘ)")

    # Khởi tạo MediaPipe để check mặt
    mp_face_detection = mp.solutions.face_detection
    detector = mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.6)

    with st.form("reg_form"):
        c1, c2 = st.columns(2)
        emp_id = c1.number_input("Mã Nhân Viên (ID) (*)", min_value=1, step=1, value=1)
        name = c2.text_input("Họ và Tên (*)")
        c3, c4 = st.columns(2)
        position = c3.text_input("Chức vụ")
        dept_id = c4.number_input("ID Phòng Ban", min_value=1, value=1)
        
        st.markdown("""
        **💡 Quy trình lấy mẫu (48 ảnh):**
        1. 😐 **Nhìn thẳng** (12 ảnh)
        2. 👈 **Quay mặt sang trái** (12 ảnh)
        3. 👉 **Quay mặt sang phải** (12 ảnh)
        4. ☝️ **Ngước mặt lên trên** (12 ảnh)
        """)
        
        # Nút submit form
        start_capture = st.form_submit_button("📸 Bắt đầu Quy Trình Chụp")

    if start_capture:
        if not name:
            st.error("⚠️ Vui lòng nhập tên nhân viên!")
        else:
            # --- CẤU HÌNH QUY TRÌNH ---
            STAGES = [
                {"text": "😐 HÃY NHÌN THẲNG VÀO CAMERA", "target": 12},
                {"text": "👈 HÃY QUAY MẶT SANG TRÁI (Góc 30 độ)", "target": 12},
                {"text": "👉 HÃY QUAY MẶT SANG PHẢI (Góc 30 độ)", "target": 12},
                {"text": "☝️ HÃY NGƯỚC MẶT LÊN TRÊN", "target": 12}
            ]
            
            # UI Elements (Placeholder để cập nhật liên tục)
            status_text = st.empty()
            progress_bar = st.progress(0)
            frame_box = st.image([])
            info_box = st.empty()
            
            cap = cv2.VideoCapture(VIDEO_SOURCE)
            collected_images = []
            total_captured = 0
            total_target = 48 # 12 * 4
            
            # --- ĐẾM NGƯỢC 3 GIÂY ĐỂ CHUẨN BỊ ---
            for i in range(3, 0, -1):
                status_text.warning(f"⏳ Chuẩn bị... {i}")
                time.sleep(1)
            
            # --- VÒNG LẶP QUA 4 GIAI ĐOẠN ---
            for stage_idx, stage in enumerate(STAGES):
                current_count = 0
                target = stage["target"]
                instruction = stage["text"]
                
                # Thông báo đổi tư thế
                status_text.info(f"📌 GIAI ĐOẠN {stage_idx + 1}/4: {instruction}")
                time.sleep(1) # Dừng 1 xíu để người dùng kịp đổi tư thế
                
                while current_count < target:
                    ret, frame = cap.read()
                    if not ret: break
                    
                    frame = cv2.flip(frame, 1) # Lật ảnh soi gương
                    img_display = frame.copy()
                    
                    # 1. Check mặt bằng MediaPipe
                    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = detector.process(img_rgb)
                    
                    if results.detections:
                        # Có mặt -> Lưu
                        current_count += 1
                        total_captured += 1
                        
                        # Encode ảnh để gửi
                        _, buf = cv2.imencode('.jpg', frame)
                        collected_images.append(('files', ('face.jpg', buf.tobytes(), 'image/jpeg')))
                        
                        # Vẽ visual lên màn hình
                        cv2.rectangle(img_display, (0,0), (640, 50), (0,255,0), -1)
                        cv2.putText(img_display, f"OK! {current_count}/{target}", (200, 35), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
                    else:
                        # Không có mặt -> Cảnh báo
                        cv2.rectangle(img_display, (0,0), (640, 50), (0,0,255), -1)
                        cv2.putText(img_display, "KHONG THAY MAT", (200, 35), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 1, (255,255,255), 2)
                    
                    # Cập nhật UI
                    frame_box.image(cv2.cvtColor(img_display, cv2.COLOR_BGR2RGB))
                    progress_bar.progress(total_captured / total_target)
                    info_box.write(f"📊 Tiến độ tổng: {total_captured}/{total_target} ảnh")
                    
                    # Nghỉ cực ngắn để không chụp 2 khung hình giống hệt nhau
                    time.sleep(0.1)

            cap.release()
            frame_box.empty()
            status_text.empty()
            
            # --- GỬI DỮ LIỆU ---
            if len(collected_images) == total_target:
                st.success("✅ Đã thu thập đủ 48 ảnh đa dạng! Đang gửi lên Server...")
                try:
                    data = {'id': emp_id, 'name': name, 'department_id': dept_id, 'position': position}
                    
                    # Gửi lên API FastAPI
                    res = requests.post(f"{API_URL}/register/", data=data, files=collected_images)
                    
                    if res.status_code == 200:
                        st.balloons()
                        resp_data = res.json()
                        st.success(f"🎉 {resp_data['message']}")
                        st.info(f"📝 {resp_data.get('note', '')}")
                    else:
                        st.error(f"❌ Lỗi Server: {res.text}")
                except Exception as e:
                    st.error(f"❌ Lỗi kết nối: {e}")
            else:
                st.warning("⚠️ Quy trình bị gián đoạn, chưa đủ ảnh.")

# ==================================================
# 3. DASHBOARD & DANH SÁCH
# ==================================================
elif menu == "🏠 Dashboard":
    st.title("🏠 TỔNG QUAN")
    try:
        res = requests.get(f"{API_URL}/stats/")
        if res.status_code == 200:
            stats = res.json()
            c1, c2, c3 = st.columns(3)
            c1.metric("Nhân Viên", stats['employees'])
            c2.metric("Phòng Ban", stats['departments'])
            c3.metric("Lượt Check-in", stats['today'])
            
            if stats.get('present_ids'):
                st.success(f"🆔 Các mã NV đã đi làm: {stats['present_ids']}")

            logs = requests.get(f"{API_URL}/attendance/").json()
            if logs:
                df = pd.DataFrame(logs)
                df['time'] = pd.to_datetime(df['time'])
                df['hour'] = df['time'].dt.hour
                hourly = df['hour'].value_counts().sort_index()
                fig = px.bar(hourly, x=hourly.index, y=hourly.values, title="Mật độ chấm công")
                
                # [FIX]: Thay use_container_width=True bằng width="stretch"
                st.plotly_chart(fig, width="stretch")
                
    except: st.warning("Server chưa chạy.")

elif menu == "👥 Danh Sách NV":
    st.title("👥 NHÂN SỰ")
    if st.button("🔄 Refresh"): st.rerun()
    
    try:
        res = requests.get(f"{API_URL}/employees/")
        if res.status_code == 200:
            st.dataframe(pd.DataFrame(res.json()), width=2000)
    except: st.error("Lỗi kết nối.")

# ==================================================
# 4. BÁO CÁO
# ==================================================
elif menu == "📊 Báo Cáo":
    st.title("📊 LỊCH SỬ CHẤM CÔNG")
    try:
        res = requests.get(f"{API_URL}/attendance/")
        if res.status_code == 200:
            df = pd.DataFrame(res.json())
            
            if not df.empty:
                search = st.text_input("🔍 Tìm theo Tên hoặc Mã NV:")
                if search:
                    df = df[
                        df['name'].str.contains(search, case=False) | 
                        df['employee_id'].astype(str).str.contains(search)
                    ]

                df.rename(columns={
                    'log_id': 'STT',
                    'employee_id': 'Mã NV',
                    'name': 'Họ và Tên',
                    'dept': 'Phòng Ban',
                    'time': 'Thời Gian',
                    'status': 'Trạng Thái',
                    'device': 'Thiết Bị'
                }, inplace=True)

                st.dataframe(df, width=2000)
                
                csv = df.to_csv(index=False).encode('utf-8')
                st.download_button("📥 Tải báo cáo CSV", csv, "log_cham_cong.csv", "text/csv")
            else:
                st.info("Chưa có dữ liệu chấm công.")
    except Exception as e:
        st.error(f"Lỗi kết nối: {e}")

elif menu == "⚙️ Cài Đặt":
    st.title("⚙️ ADMIN")
    if st.button("🚀 Retrain Model"):
        requests.post(f"{API_URL}/system/retrain")
        st.success("OK")