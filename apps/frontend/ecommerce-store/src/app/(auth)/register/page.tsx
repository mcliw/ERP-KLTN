'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Mail, Eye, EyeOff, Loader2, Contact } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Register Data:", formData);
      router.push('/login'); 
    } catch (err) {
      setError("Đăng ký thất bại, vui lòng thử lại.");
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
      <div className="w-full lg:w-[45%] bg-white text-[#0b3c9d] flex flex-col justify-center px-[40px] py-[40px] overflow-y-auto">
        <h2 className="text-center text-[28px] font-bold mb-[25px]">ĐĂNG KÝ TÀI KHOẢN</h2>

        <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-[15px]">
          {/* Full Name */}
          <div className="relative group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <Contact size={18} />
            </div>
            <input
              name="fullName"
              type="text"
              placeholder="Họ và tên"
              className="w-full h-[45px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          {/* Username */}
          <div className="relative group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <User size={18} />
            </div>
            <input
              name="username"
              type="text"
              placeholder="Tên đăng nhập"
              className="w-full h-[45px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          {/* Email */}
          <div className="relative group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <Mail size={18} />
            </div>
            <input
              name="email"
              type="email"
              placeholder="Email liên hệ"
              className="w-full h-[45px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          {/* Password */}
          <div className="relative group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <Lock size={18} />
            </div>
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              className="w-full h-[45px] pl-[60px] pr-[45px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-[12px] top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0b3c9d]">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <Lock size={18} />
            </div>
            <input
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Nhập lại mật khẩu"
              className="w-full h-[45px] pl-[60px] pr-[45px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
             <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-[12px] top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0b3c9d]">
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="text-[#d8000c] text-[12px] text-center font-medium bg-red-50 p-2 rounded border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b3c9d] text-white py-[12px] px-[20px] rounded-[6px] text-[15px] font-medium hover:bg-[#1669b2] transition-colors flex justify-center items-center disabled:opacity-70 mt-4"
          >
            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "ĐĂNG KÝ"}
          </button>
        </form>
        
        <div className="text-center mt-6 text-[13px]">
           <span className="text-gray-500">Đã có tài khoản? </span>
           <span 
             onClick={() => router.push('/login')}
             className="text-[#0b3c9d] hover:underline font-bold cursor-pointer"
           >
             Đăng nhập ngay
           </span>
        </div>
      </div>
    </div>
  );
}