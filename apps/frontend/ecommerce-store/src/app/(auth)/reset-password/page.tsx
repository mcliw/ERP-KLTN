'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, Eye, EyeOff, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();

  // State quản lý form
  const [identifier, setIdentifier] = useState(''); // Email hoặc Username
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // State hiển thị
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validate mật khẩu khớp nhau
    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    // 2. Validate độ dài (Tùy chọn)
    if (password.length < 6) {
        setError("Mật khẩu phải có ít nhất 6 ký tự.");
        return;
    }

    setLoading(true);

    try {
      // Giả lập gọi API đổi mật khẩu
      // Payload gửi lên: { identifier, newPassword }
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      console.log("Password Reset for:", identifier);
      setIsSuccess(true); // Hiện thông báo thành công
    } catch (err) {
      setError("Có lỗi xảy ra, vui lòng kiểm tra lại thông tin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[linear-gradient(135deg,#0b3c9d,#061a3a)] font-[Segoe_UI,sans-serif] text-white">
      
      {/* --- LEFT SIDE (Banner - Giữ nguyên) --- */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center pt-[40px] px-[60px] text-center">
        <h1 className="text-[58px] mb-[5px] font-normal leading-tight">CHÀO MỪNG ĐẾN</h1>
        <h2 className="text-[40px] mb-[40px] font-normal leading-tight">LDG TECH</h2>
        <p className="text-[78px] italic mb-[30px] leading-none opacity-90" style={{ fontFamily: '"Math", serif' }}>
          Sáng tạo đổi mới giá trị
        </p>
        <p className="text-[28px] font-bold mb-[20px]">TỰ ĐỘNG - TIỆN ÍCH - MINH BẠCH</p>
        <p className="text-[18px] font-medium leading-relaxed">
          Hệ thống ERP - Quản lý doanh nghiệp <br /> tích hợp AI Chatbot
        </p>
      </div>

      {/* --- RIGHT SIDE (Form) --- */}
      <div className="w-full lg:w-[40%] bg-white text-[#0b3c9d] flex flex-col justify-center px-[40px] py-[60px]">
        
        {/* Nút quay lại */}
        {!isSuccess && (
            <div className="mb-8">
                <Link href="/login" className="inline-flex items-center text-gray-500 hover:text-[#0b3c9d] transition-colors font-medium text-sm">
                    <ArrowLeft size={16} className="mr-2" /> Quay lại đăng nhập
                </Link>
            </div>
        )}

        {!isSuccess ? (
          <>
            <h2 className="text-center text-[28px] font-bold mb-[30px]">ĐẶT LẠI MẬT KHẨU</h2>

            <form onSubmit={handleSubmit} className="w-full space-y-[18px]">
              
              {/* 1. Identifier (Email/Username) */}
              <div className="relative group">
                <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Email hoặc Tên đăng nhập"
                  className="w-full h-[48px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>

              {/* 2. New Password */}
              <div className="relative group">
                <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Mật khẩu mới"
                  className="w-full h-[48px] pl-[60px] pr-[45px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-[12px] top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0b3c9d]">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* 3. Confirm Password */}
              <div className="relative group">
                <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
                  <Lock size={18} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Xác nhận mật khẩu mới"
                  className="w-full h-[48px] pl-[60px] pr-[45px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-[12px] top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0b3c9d]">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="text-[#d8000c] text-[12px] text-center font-medium bg-red-50 p-2 rounded border border-red-100">
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0b3c9d] text-white py-[12px] px-[20px] rounded-[6px] text-[15px] font-medium hover:bg-[#1669b2] transition-colors flex justify-center items-center disabled:opacity-70 mt-4"
              >
                {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Xác nhận đổi mật khẩu"}
              </button>
            </form>
          </>
        ) : (
          /* GIAO DIỆN THÀNH CÔNG */
          <div className="flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
                <CheckCircle size={40} />
            </div>
            
            <h2 className="text-[24px] font-bold mb-[10px] text-gray-800">Đổi mật khẩu thành công!</h2>
            
            <p className="text-gray-500 mb-[30px]">
              Tài khoản <span className="font-bold text-[#0b3c9d]">{identifier}</span> đã được cập nhật mật khẩu mới. <br/>
              Bạn có thể đăng nhập ngay bây giờ.
            </p>

            <button
                onClick={() => router.push('/login')}
                className="w-full bg-[#0b3c9d] text-white py-[12px] px-[20px] rounded-[6px] font-medium hover:bg-[#1669b2] transition-colors"
            >
                Về trang Đăng nhập
            </button>
          </div>
        )}
      </div>
    </div>
  );
}