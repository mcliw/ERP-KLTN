'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// [FIX LỖI] Import đầy đủ các icon còn thiếu
import { User, Lock, Eye, EyeOff, Loader2, Mail, Phone, MapPin, UserCheck } from 'lucide-react';
import { authService } from '@/auth/auth.service'; // Đảm bảo đường dẫn import đúng

export default function RegisterPage() {
  const router = useRouter();

  // [FIX LỖI] Khai báo đầy đủ State cho các trường dữ liệu mới
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Validate cơ bản ở Client
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      setLoading(false);
      return;
    }

    try {
      // 2. Gọi API Đăng ký
      // Lưu ý: Backend hiện tại có thể chưa lưu FullName/Phone/Address 
      // nhưng ta vẫn gửi đi để mở rộng sau này.
      await authService.registerApi({
        email: email,
        password: password,
        role: "CUSTOMER", // Mặc định cho luồng đăng ký này
        // Các trường bổ sung (nếu backend hỗ trợ mở rộng DTO)
        fullName: fullName,
        phone: phone,
        address: address
      });
      
      console.log('Register Success');
      // Đăng ký xong chuyển hướng về trang đăng nhập
      router.push('/login'); 
      
    } catch (err: any) {
      setError(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[linear-gradient(135deg,#0b3c9d,#061a3a)] font-[Segoe_UI,sans-serif] text-white">
      
      {/* LEFT SIDE (Banner) */}
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

      {/* RIGHT SIDE (Form) */}
      <div className="w-full lg:w-[40%] bg-white text-[#0b3c9d] flex flex-col justify-center px-[40px] py-[60px] overflow-y-auto">
        <h2 className="text-center text-[28px] font-bold mb-[30px]">ĐĂNG KÝ TÀI KHOẢN</h2>

        <form onSubmit={handleSubmit} className="w-full">
          
          {/* --- NHÓM THÔNG TIN CÁ NHÂN --- */}
          
          {/* Full Name */}
          <div className="relative mb-[18px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <User size={18} />
            </div>
            <input
              type="text"
              placeholder="Họ và tên"
              className="w-full h-[48px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          {/* Phone */}
          <div className="relative mb-[18px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <Phone size={18} />
            </div>
            <input
              type="tel"
              placeholder="Số điện thoại"
              className="w-full h-[48px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {/* Address */}
          <div className="relative mb-[18px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <MapPin size={18} />
            </div>
            <input
              type="text"
              placeholder="Địa chỉ"
              className="w-full h-[48px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          {/* --- NHÓM TÀI KHOẢN --- */}

          {/* Email */}
          <div className="relative mb-[18px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <Mail size={18} />
            </div>
            <input
              type="email"
              placeholder="Email (Tên đăng nhập)"
              className="w-full h-[48px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="relative mb-[18px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              className="w-full h-[48px] pl-[60px] pr-[45px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-[12px] top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0b3c9d] cursor-pointer"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative mb-[25px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <UserCheck size={18} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Xác nhận mật khẩu"
              className="w-full h-[48px] pl-[60px] pr-[45px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-[#d8000c] text-[12px] mb-[15px] text-center font-medium bg-red-50 p-2 rounded border border-red-100">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b3c9d] text-white py-[12px] px-[20px] rounded-[6px] text-[15px] font-medium hover:bg-[#1669b2] transition-colors flex justify-center items-center disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Đăng ký"}
          </button>
        </form>

        {/* Redirect to Login */}
        <div className="text-center mt-6 text-[13px]">
           <span className="text-gray-500">Đã có tài khoản? </span>
           <span 
             onClick={() => router.push('/login')} 
             className="text-[#7fb5ff] hover:text-[#1669b2] hover:underline cursor-pointer font-medium"
           >
             Đăng nhập ngay
           </span>
        </div>
      </div>
    </div>
  );
}