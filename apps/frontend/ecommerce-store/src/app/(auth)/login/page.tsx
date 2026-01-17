'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Giả lập gọi API (Delay 1.5s)
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      console.log('Login Success:', { username, password });
      router.push('/'); // Chuyển hướng về trang chủ
    } catch (err) {
      setError('Đăng nhập thất bại. Vui lòng kiểm tra lại.');
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
      <div className="w-full lg:w-[40%] bg-white text-[#0b3c9d] flex flex-col justify-center px-[40px] py-[60px]">
        <h2 className="text-center text-[28px] font-bold mb-[30px]">ĐĂNG NHẬP</h2>

        <form onSubmit={handleSubmit} className="w-full">
          {/* Username */}
          <div className="relative mb-[18px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <User size={18} />
            </div>
            <input
              type="text"
              placeholder="Tên tài khoản"
              className="w-full h-[48px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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

          {/* Options */}
          <div className="flex justify-between items-center text-[13px] mb-[20px]">
            <label className="flex items-center space-x-2 cursor-pointer select-none text-[#0b3c9d]">
              <input type="checkbox" className="accent-[#0b3c9d] w-4 h-4" />
              <span>Nhớ mật khẩu</span>
            </label>
            <span 
              onClick={() => router.push('/reset-password')} 
              className="text-[#7fb5ff] hover:text-[#1669b2] hover:underline cursor-pointer font-medium">
              Quên mật khẩu?
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="text-[#d8000c] text-[12px] mb-[15px] text-center font-medium bg-red-50 p-2 rounded border border-red-100">
              {error}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b3c9d] text-white py-[12px] px-[20px] rounded-[6px] text-[15px] font-medium hover:bg-[#1669b2] transition-colors flex justify-center items-center disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Đăng nhập"}
          </button>
        </form>

        <div className="text-center mt-4 text-[13px]">
           <span className="text-gray-500">Chưa có tài khoản? </span>
           <span 
             onClick={() => router.push('/register')} 
             className="text-[#7fb5ff] hover:text-[#1669b2] hover:underline cursor-pointer font-medium"
           >
             Đăng ký ngay
           </span>
        </div>
      </div>
    </div>
  );
}