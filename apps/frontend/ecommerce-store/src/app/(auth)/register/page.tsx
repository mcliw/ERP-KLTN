// FILE: src/app/(auth)/register/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User, Lock, Eye, EyeOff, Loader2, Mail, Phone, MapPin, UserCheck, ArrowLeft } from 'lucide-react';
import { authService } from '@/auth/auth.service'; 
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate mật khẩu khớp nhau
    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);

    try {
      // Gọi API Đăng ký thật
      await authService.registerApi({
        email: email,
        password: password,
        role: "CUSTOMER", 
        fullName: fullName,
        phone: phone,
        address: address
      });
      
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      
      // Chuyển hướng về trang đăng nhập
      router.push('/login'); 
      
    } catch (err: any) {
      toast.error(err.message || 'Đăng ký thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[linear-gradient(135deg,#0b3c9d,#061a3a)] font-[Segoe_UI,sans-serif] text-white">
      
      {/* LEFT SIDE (Banner) */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center pt-[40px] px-[60px] text-center">
        <h1 className="text-[58px] mb-[5px] font-normal leading-tight">GIA NHẬP</h1>
        <h2 className="text-[40px] mb-[40px] font-normal leading-tight">LDG TECH</h2>
        <p className="text-[28px] font-bold mb-[20px]">TỰ ĐỘNG - TIỆN ÍCH - MINH BẠCH</p>
        <p className="text-[18px] font-medium leading-relaxed opacity-90">
          Tạo tài khoản để bắt đầu hành trình <br /> quản trị và mua sắm thông minh.
        </p>
      </div>

      {/* RIGHT SIDE (Form Register) */}
      <div className="w-full lg:w-[40%] bg-white text-[#0b3c9d] flex flex-col justify-center px-[40px] py-[40px] overflow-y-auto max-h-screen">
        
        {/* Nút Back Mobile */}
        <div className="lg:hidden mb-4">
            <Link href="/" className="text-gray-500 flex items-center gap-1 text-sm"><ArrowLeft size={16}/> Trang chủ</Link>
        </div>

        <h2 className="text-center text-[28px] font-bold mb-[25px]">ĐĂNG KÝ TÀI KHOẢN</h2>

        <form onSubmit={handleSubmit} className="w-full">
          
          {/* --- NHÓM THÔNG TIN CÁ NHÂN --- */}
          
          <div className="relative mb-[15px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <User size={18} />
            </div>
            <input
              type="text"
              placeholder="Họ và tên"
              className="w-full h-[45px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="relative mb-[15px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <Phone size={18} />
            </div>
            <input
              type="tel"
              placeholder="Số điện thoại"
              className="w-full h-[45px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="relative mb-[15px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <MapPin size={18} />
            </div>
            <input
              type="text"
              placeholder="Địa chỉ liên hệ"
              className="w-full h-[45px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          {/* --- NHÓM TÀI KHOẢN --- */}

          <div className="relative mb-[15px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <Mail size={18} />
            </div>
            <input
              type="email"
              placeholder="Email (Tên đăng nhập)"
              className="w-full h-[45px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="relative mb-[15px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <Lock size={18} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Mật khẩu"
              className="w-full h-[45px] pl-[60px] pr-[45px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
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

          <div className="relative mb-[25px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <UserCheck size={18} />
            </div>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Xác nhận mật khẩu"
              className="w-full h-[45px] pl-[60px] pr-[45px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b3c9d] text-white py-[12px] px-[20px] rounded-[6px] text-[15px] font-medium hover:bg-[#1669b2] transition-colors flex justify-center items-center disabled:opacity-70 shadow-lg shadow-blue-900/20"
          >
            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : "Đăng ký tài khoản"}
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