// FILE: src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { authService } from '@/auth/auth.service';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Gọi API đăng nhập từ auth.service
      // Lưu ý: authService.loginApi đã tự động lưu token vào localStorage
      await authService.loginApi({
        email: email,
        password: password,
      });

      toast.success('Đăng nhập thành công!');
      
      // Chuyển hướng về trang chủ hoặc dashboard
      router.push('/'); 
      
    } catch (err: any) {
      toast.error(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[linear-gradient(135deg,#0b3c9d,#061a3a)] font-[Segoe_UI,sans-serif] text-white">
      
      {/* LEFT SIDE (Banner) */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center pt-[40px] px-[60px] text-center">
        <h1 className="text-[58px] mb-[5px] font-normal leading-tight">CHÀO MỪNG TRỞ LẠI</h1>
        <h2 className="text-[40px] mb-[40px] font-normal leading-tight">LDG TECH</h2>
        <p className="text-[18px] font-medium leading-relaxed opacity-90">
          Đăng nhập để tiếp tục quản lý hệ thống ERP <br /> và trải nghiệm mua sắm tốt nhất.
        </p>
      </div>

      {/* RIGHT SIDE (Form Login) */}
      <div className="w-full lg:w-[40%] bg-white text-[#0b3c9d] flex flex-col justify-center px-[40px] py-[60px]">
        <h2 className="text-center text-[28px] font-bold mb-[30px]">ĐĂNG NHẬP</h2>

        <form onSubmit={handleSubmit} className="w-full">
          
          {/* Email */}
          <div className="relative mb-[18px] group">
            <div className="absolute top-0 left-0 bottom-0 w-[45px] bg-[#0b3c9d] text-white flex items-center justify-center rounded-l-[6px]">
              <Mail size={18} />
            </div>
            <input
              type="email"
              placeholder="Email đăng nhập"
              className="w-full h-[48px] pl-[60px] pr-[15px] border-[2px] border-[#ccc] rounded-[6px] outline-none focus:border-[#0b3c9d] transition-colors text-black placeholder:text-gray-400"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="relative mb-[10px] group">
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

          {/* Quên mật khẩu */}
          <div className="flex justify-end mb-[25px]">
            <Link href="/reset-password" className="text-sm text-gray-500 hover:text-[#0b3c9d] transition-colors">
                Quên mật khẩu?
            </Link>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0b3c9d] text-white py-[12px] px-[20px] rounded-[6px] text-[15px] font-medium hover:bg-[#1669b2] transition-colors flex justify-center items-center disabled:opacity-70 shadow-lg shadow-blue-900/20"
          >
            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <span className="flex items-center gap-2">Đăng nhập <LogIn size={18}/></span>}
          </button>
        </form>

        {/* Redirect to Register */}
        <div className="text-center mt-8 text-[13px]">
           <span className="text-gray-500">Chưa có tài khoản? </span>
           <span 
             onClick={() => router.push('/register')} 
             className="text-[#0b3c9d] hover:underline font-bold cursor-pointer"
           >
             Đăng ký ngay
           </span>
        </div>
      </div>
    </div>
  );
}