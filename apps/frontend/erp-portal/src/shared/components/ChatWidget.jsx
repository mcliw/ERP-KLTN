import React, { useState, useRef, useEffect } from "react";
import { FaCommentDots, FaTimes, FaPaperPlane, FaRobot } from "react-icons/fa";
import "../styles/chat.css"
import { useLocation } from "react-router-dom";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);

  // Dữ liệu mẫu ban đầu
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Xin chào! Tôi là trợ lý ảo HR. Tôi có thể giúp gì cho bạn hôm nay?",
      sender: "bot",
      timestamp: new Date(),
    },
  ]);

  // Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  // Xử lý gửi tin nhắn
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // 1. Thêm tin nhắn của User
    const userMsg = {
      id: Date.now(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // 2. Giả lập Bot trả lời (Thay thế đoạn này bằng gọi API thực tế)
    setTimeout(() => {
      const botMsg = {
        id: Date.now() + 1,
        text: "Cảm ơn câu hỏi của bạn. Tính năng AI đang được kết nối...",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  };

  // Lấy đường dẫn hiện tại
//   const location = useLocation();
  
//   // Định nghĩa danh sách các trang muốn ẩn chat
//   const hiddenRoutes = ["/login", "/register", "/forgot-password"];

//   // Nếu đường dẫn hiện tại nằm trong danh sách ẩn -> return null (không render gì cả)
//   if (hiddenRoutes.includes(location.pathname)) {
//     return null;
//   }

  return (
    <div className="chat-widget-wrapper">
      {/* --- CHAT WINDOW --- */}
      <div className={`chat-window ${isOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="chat-header">
          <div className="d-flex align-items-center gap-2" style={{display: 'inline-flex', alignItems:'center', gap: 10}}>
            <div className="chat-avatar">
              <FaRobot />
            </div>
            <h6 className="m-0 fw-bold">Trợ lý AI</h6>
            <span className="online-status" style={{marginLeft: 60}}>● Đang hoạt động</span>
          </div>
          <button className="btn-close-chat" onClick={() => setIsOpen(false)}>
            <FaTimes />
          </button>
        </div>

        {/* Body (Message List) */}
        <div className="chat-body">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${
                msg.sender === "user" ? "user-row" : "bot-row"
              }`}
            >
              {msg.sender === "bot" && (
                <div className="msg-avatar">
                  <FaRobot />
                </div>
              )}
              <div className="message-bubble">
                {msg.text}
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {/* Hiệu ứng đang gõ */}
          {isTyping && (
            <div className="message-row bot-row">
              <div className="msg-avatar"><FaRobot /></div>
              <div className="message-bubble typing-bubble">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer (Input) */}
        <form className="chat-footer" onSubmit={handleSendMessage}>
          <input
            type="text"
            placeholder="Nhập nội dung..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
          <button type="submit" disabled={!inputValue.trim()}>
            <FaPaperPlane />
          </button>
        </form>
      </div>

      {/* --- TOGGLE BUTTON --- */}
      <button
        className={`chat-toggle-btn ${isOpen ? "active" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <FaRobot size={24} /> : <FaRobot size={28} />}
      </button>
    </div>
  );
}