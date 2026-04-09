'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  MapPin, 
  CreditCard, 
  Truck, 
  CheckCircle, 
  Loader2,
  Banknote,
  QrCode
} from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  
  // State form
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    note: ''
  });
  
  const [paymentMethod, setPaymentMethod] = useState('cod'); // cod | banking | momo
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Nếu giỏ hàng trống thì đá về trang chủ
    if (items.length === 0) {
        // router.push('/'); // Uncomment nếu muốn chặn truy cập khi giỏ rỗng
    }
  }, [items.length, router]);

  // Tính toán tiền nong (Logic giống trang Cart)
  const subTotal = getTotalPrice(); // Lưu ý: hàm này cần tính giá sau discount trong store
  const shippingFee = subTotal > 50000000 ? 0 : 50000;
  const tax = subTotal * 0.08;
  const total = subTotal + shippingFee + tax;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
        toast.error("Giỏ hàng đang trống!");
        return;
    }

    setLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Tạo mã đơn hàng ngẫu nhiên
      const newOrderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
      
      clearCart(); 
      toast.success("Đặt hàng thành công!");
      
      // CHUYỂN HƯỚNG SANG TRANG CHI TIẾT
      router.push(`/orders/${newOrderId}`); 

    } catch (error) {
      toast.error("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // --- MÀN HÌNH THÀNH CÔNG ---
  if (isSuccess) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle size={40} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Đặt hàng thành công!</h2>
                <p className="text-gray-500 mb-6">
                    Cảm ơn bạn đã mua sắm tại LDG Store. <br/>
                    Mã đơn hàng của bạn là: <span className="font-bold text-[#0b3c9d]">#ORD-{Math.floor(Math.random() * 10000)}</span>
                </p>
                <div className="space-y-3">
                    <button 
                        onClick={() => router.push('/')}
                        className="w-full bg-[#0b3c9d] text-white py-3 rounded-xl font-bold hover:bg-blue-800 transition-all"
                    >
                        Tiếp tục mua sắm
                    </button>
                    <button className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all">
                        Xem chi tiết đơn hàng
                    </button>
                </div>
            </div>
        </div>
    );
  }

  // --- MÀN HÌNH CHÍNH ---
  return (
    <div className="min-h-screen bg-gray-50 font-[Segoe_UI,sans-serif] pb-12">
      
      {/* Header đơn giản */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
            <Link href="/cart" className="flex items-center text-gray-600 hover:text-[#0b3c9d] transition-colors gap-2">
                <ArrowLeft size={20} /> Quay lại giỏ hàng
            </Link>
            <div className="h-6 w-[1px] bg-gray-300"></div>
            <h1 className="text-lg font-bold text-[#0b3c9d]">Thanh Toán & Đặt Hàng</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-8">
            
            {/* === CỘT TRÁI: FORM THÔNG TIN === */}
            <div className="flex-1 space-y-6">
                
                {/* 1. Địa chỉ giao hàng */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <MapPin size={20} className="text-[#0b3c9d]" /> Thông tin giao hàng
                    </h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Họ và tên <span className="text-red-500">*</span></label>
                            <input required name="fullName" value={formData.fullName} onChange={handleInputChange} type="text" placeholder="Nguyễn Văn A" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#0b3c9d] focus:ring-1 focus:ring-[#0b3c9d]" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Số điện thoại <span className="text-red-500">*</span></label>
                            <input required name="phone" value={formData.phone} onChange={handleInputChange} type="tel" placeholder="09xxxxxxxxx" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#0b3c9d] focus:ring-1 focus:ring-[#0b3c9d]" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Email nhận hóa đơn</label>
                            <input required name="email" value={formData.email} onChange={handleInputChange} type="email" placeholder="email@example.com" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#0b3c9d] focus:ring-1 focus:ring-[#0b3c9d]" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Địa chỉ chi tiết <span className="text-red-500">*</span></label>
                            <input required name="address" value={formData.address} onChange={handleInputChange} type="text" placeholder="Số nhà, tên đường..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#0b3c9d] focus:ring-1 focus:ring-[#0b3c9d]" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Tỉnh / Thành phố <span className="text-red-500">*</span></label>
                            <input required name="city" value={formData.city} onChange={handleInputChange} type="text" placeholder="Hồ Chí Minh" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#0b3c9d] focus:ring-1 focus:ring-[#0b3c9d]" />
                        </div>
                        <div className="space-y-1 md:col-span-2">
                            <label className="text-sm font-medium text-gray-700">Ghi chú đơn hàng (Tùy chọn)</label>
                            <textarea name="note" value={formData.note} onChange={handleInputChange} rows={2} placeholder="Ví dụ: Giao hàng giờ hành chính..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#0b3c9d] focus:ring-1 focus:ring-[#0b3c9d]" />
                        </div>
                    </div>
                </div>

                {/* 2. Phương thức thanh toán */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CreditCard size={20} className="text-[#0b3c9d]" /> Phương thức thanh toán
                    </h2>
                    
                    <div className="space-y-3">
                        {/* Option 1: COD */}
                        <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-[#0b3c9d] bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                            <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 accent-[#0b3c9d]" />
                            <div className="ml-4 flex items-center gap-3">
                                <div className="p-2 bg-white rounded shadow-sm text-green-600"><Banknote size={20} /></div>
                                <div>
                                    <div className="font-bold text-gray-800">Thanh toán khi nhận hàng (COD)</div>
                                    <div className="text-xs text-gray-500">Thanh toán tiền mặt cho shipper</div>
                                </div>
                            </div>
                        </label>

                        {/* Option 2: QR */}
                        <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${paymentMethod === 'qr' ? 'border-[#0b3c9d] bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                            <input type="radio" name="payment" value="qr" checked={paymentMethod === 'qr'} onChange={(e) => setPaymentMethod(e.target.value)} className="w-5 h-5 accent-[#0b3c9d]" />
                            <div className="ml-4 flex items-center gap-3">
                                <div className="p-2 bg-white rounded shadow-sm text-blue-600"><QrCode size={20} /></div>
                                <div>
                                    <div className="font-bold text-gray-800">Chuyển khoản ngân hàng / VietQR</div>
                                    <div className="text-xs text-gray-500">Quét mã QR, xác nhận tự động 24/7</div>
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* === CỘT PHẢI: TÓM TẮT ĐƠN HÀNG === */}
            <div className="w-full lg:w-[380px] shrink-0">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24">
                    <h2 className="text-lg font-bold text-gray-800 mb-6">Đơn hàng ({items.length} sản phẩm)</h2>
                    
                    {/* List sản phẩm rút gọn */}
                    <div className="space-y-4 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {items.map((item) => (
                            <div key={item.id} className="flex gap-3">
                                <div className="w-14 h-14 bg-gray-100 rounded border border-gray-200 p-1 shrink-0">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium text-gray-800 line-clamp-2">{item.name}</h4>
                                    <div className="flex justify-between mt-1 text-xs">
                                        <span className="text-gray-500">SL: {item.quantity}</span>
                                        <span className="font-bold text-[#0b3c9d]">
                                            {formatCurrency(item.price * (1 - item.discount / 100) * item.quantity)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-gray-100 pt-4 space-y-3 text-sm">
                        <div className="flex justify-between text-gray-600">
                            <span>Tạm tính</span>
                            <span className="font-medium">{formatCurrency(subTotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Phí vận chuyển</span>
                            <span className="font-medium">
                                {shippingFee === 0 ? <span className="text-green-600">Miễn phí</span> : formatCurrency(shippingFee)}
                            </span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Thuế VAT (8%)</span>
                            <span className="font-medium">{formatCurrency(tax)}</span>
                        </div>
                        <div className="flex justify-between items-center text-base font-bold pt-2 border-t border-dashed border-gray-200">
                            <span>Tổng cộng</span>
                            <span className="text-xl text-[#0b3c9d]">{formatCurrency(total)}</span>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full mt-6 bg-[#0b3c9d] text-white py-3.5 rounded-xl font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Truck size={18} />}
                        {loading ? "Đang xử lý..." : "ĐẶT HÀNG NGAY"}
                    </button>

                    <p className="text-xs text-center text-gray-400 mt-4">
                        Nhấn "Đặt hàng ngay" đồng nghĩa với việc bạn đồng ý tuân theo <span className="underline cursor-pointer">Điều khoản LDG Store</span>
                    </p>
                </div>
            </div>

        </form>
      </div>
    </div>
  );
}