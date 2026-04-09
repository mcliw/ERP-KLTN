import cv2
from flask import Flask, Response

app = Flask(__name__)

# Khởi tạo Webcam (0 là camera mặc định)
camera = cv2.VideoCapture(0)

def generate_frames():
    while True:
        # Đọc từng frame từ camera
        success, frame = camera.read()
        if not success:
            break
        else:
            # Mã hóa frame thành định dạng JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            frame_bytes = buffer.tobytes()
            
            # Trả về dữ liệu theo định dạng multipart (MJPEG)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

@app.route('/video_feed')
def video_feed():
    # Route này sẽ phát luồng video
    return Response(generate_frames(), 
                    mimetype='multipart/x-mixed-replace; boundary=frame')

if __name__ == "__main__":
    # Chạy server trên port 5000
    # host='0.0.0.0' để container có thể truy cập vào
    print("Camera Server đang chạy tại: http://localhost:5000/video_feed")
    app.run(host='0.0.0.0', port=5000, threaded=True)