'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Trash2, 
  Minus, 
  Plus, 
  ArrowLeft, 
  ShoppingBag, 
  CreditCard,
  TicketPercent,
  Truck
} from 'lucide-react';
import { useCartStore } from '@/stores/useCartStore'; // Import Store

export default function CartPage() {
  const router = useRouter();
  
  // 1. LẤY DATA TỪ ZUSTAND STORE
  const { items, updateQuantity, removeItem } = useCartStore();
  
  // 2. FIX LỖI HYDRATION (Bắt buộc khi dùng LocalStorage)
  // Chỉ render giao diện khi client đã load xong để tránh lệch dữ liệu với server
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // --- LOGIC TÍNH TOÁN ---
  
  // Hàm tính giá thực tế (Giá gốc - % giảm giá)
  const getRealPrice = (price: number, discount: number) => {
    return price * (1 - discount / 100);
  };

  // Tính tổng tiền hàng (Subtotal)
  const subTotal = items.reduce((sum, item) => {
    return sum + (getRealPrice(item.price, item.discount) * item.quantity);
  }, 0);
  
  // Logic Vận chuyển: Miễn phí nếu đơn > 50 triệu
  const shippingFee = subTotal > 50000000 ? 0 : 50000; 
  
  // Thuế VAT (8%)
  const tax = subTotal * 0.08; 
  
  // Tổng thanh toán cuối cùng
  const total = subTotal + shippingFee + tax;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Nếu chưa mount xong thì không render gì cả
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-50 font-[Segoe_UI,sans-serif] pb-12">
      
      {/* HEADER ĐƠN GIẢN */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center text-gray-600 hover:text-[#0b3c9d] transition-colors gap-2 font-medium">
                <ArrowLeft size={20} /> Tiếp tục mua sắm
            </Link>
            <h1 className="text-xl font-bold text-[#0b3c9d]">Giỏ Hàng ({items.length})</h1>
            <div className="w-[100px]"></div> {/* Spacer để căn giữa tiêu đề */}
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        
        {items.length > 0 ? (
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* --- CỘT TRÁI: DANH SÁCH SẢN PHẨM --- */}
            <div className="flex-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Table Header (Desktop) */}
                    <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-gray-50 text-sm font-semibold text-gray-500 border-b">
                        <div className="col-span-6">Sản phẩm</div>
                        <div className="col-span-2 text-center">Đơn giá</div>
                        <div className="col-span-2 text-center">Số lượng</div>
                        <div className="col-span-2 text-center">Tạm tính</div>
                    </div>

                    {/* Items List */}
                    <div className="divide-y divide-gray-100">
                        {items.map((item) => (
                            <div key={item.id} className="p-4 flex flex-col md:grid md:grid-cols-12 gap-4 items-center group hover:bg-gray-50/50 transition-colors">
                                
                                {/* Info Image & Name */}
                                <div className="col-span-6 flex items-center gap-4 w-full">
                                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 border border-gray-200 p-1 relative">
                                        <img 
                                            src={item.image} 
                                            alt={item.name} 
                                            className="w-full h-full object-contain mix-blend-multiply" 
                                            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150"; }}
                                        />
                                        {item.discount > 0 && (
                                            <span className="absolute top-0 left-0 bg-red-500 text-white text-[10px] px-1 rounded-br font-bold">
                                                - {item.discount}%
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-xs text-[#0b3c9d] font-bold mb-1 uppercase">{item.brand}</div>
                                        {/* Link quay lại trang chi tiết */}
                                        <Link href={`/products/${item.id}`} className="font-medium text-gray-800 line-clamp-2 hover:text-[#0b3c9d] transition-colors cursor-pointer">
                                            {item.name}
                                        </Link>
                                        <p className="text-xs text-gray-500 mt-1">{item.specs}</p>
                                        
                                        {/* Nút xóa trên Mobile */}
                                        <button 
                                            onClick={() => removeItem(item.id)}
                                            className="text-red-500 text-xs mt-2 flex items-center gap-1 hover:underline md:hidden"
                                        >
                                            <Trash2 size={12} /> Xóa
                                        </button>
                                    </div>
                                </div>

                                {/* Price */}
                                <div className="col-span-2 text-center font-medium text-gray-600 hidden md:block">
                                    <div className="text-gray-900">{formatCurrency(getRealPrice(item.price, item.discount))}</div>
                                    {item.discount > 0 && (
                                        <div className="text-xs text-gray-400 line-through">{formatCurrency(item.price)}</div>
                                    )}
                                </div>

                                {/* Quantity Control */}
                                <div className="col-span-2 flex justify-center w-full md:w-auto mt-4 md:mt-0">
                                    <div className="flex items-center border border-gray-300 rounded-lg bg-white">
                                        <button 
                                            onClick={() => updateQuantity(item.id, -1)}
                                            disabled={item.quantity <= 1}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 text-gray-600 transition-colors"
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={item.quantity} 
                                            className="w-10 text-center text-sm font-semibold text-gray-800 focus:outline-none"
                                        />
                                        <button 
                                            onClick={() => updateQuantity(item.id, 1)}
                                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 text-gray-600 transition-colors"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {/* Subtotal & Remove Desktop */}
                                <div className="col-span-2 text-center w-full md:w-auto flex items-center justify-between md:justify-center mt-4 md:mt-0">
                                    <span className="md:hidden text-sm font-medium text-gray-500">Thành tiền:</span>
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-[#0b3c9d]">
                                            {formatCurrency(getRealPrice(item.price, item.discount) * item.quantity)}
                                        </span>
                                        <button 
                                            onClick={() => removeItem(item.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors hidden md:block p-2"
                                            title="Xóa khỏi giỏ"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Note Shipping */}
                <div className="mt-4 bg-blue-50 text-blue-800 text-sm p-4 rounded-lg flex items-center gap-3 border border-blue-100">
                    <div className="bg-white p-2 rounded-full shadow-sm"><Truck size={18} className="text-[#0b3c9d]" /></div>
                    <span>
                        Đơn hàng của bạn đang được <strong>Miễn phí vận chuyển</strong> (với đơn trên 50.000.000₫)
                    </span>
                </div>
            </div>

            {/* --- CỘT PHẢI: TỔNG KẾT ĐƠN HÀNG --- */}
            <div className="w-full lg:w-[380px] shrink-0">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24">
                    <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <CreditCard size={20} className="text-[#0b3c9d]" />
                        Thanh toán
                    </h2>
                    
                    <div className="space-y-4 text-sm mb-6 border-b border-gray-100 pb-6">
                        <div className="flex justify-between text-gray-600">
                            <span>Tạm tính ({items.length} sản phẩm)</span>
                            <span className="font-medium text-gray-900">{formatCurrency(subTotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Phí vận chuyển</span>
                            <span className="font-medium">
                                {shippingFee === 0 ? <span className="text-green-600 font-bold">Miễn phí</span> : formatCurrency(shippingFee)}
                            </span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Thuế VAT (8%)</span>
                            <span className="font-medium text-gray-900">{formatCurrency(tax)}</span>
                        </div>
                    </div>

                    <div className="flex justify-between items-end mb-6">
                        <span className="text-gray-800 font-bold text-lg">Tổng cộng</span>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-[#0b3c9d]">{formatCurrency(total)}</div>
                            <div className="text-xs text-gray-500 mt-1">(Đã bao gồm VAT)</div>
                        </div>
                    </div>

                    {/* Coupon Input */}
                    <div className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <TicketPercent size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Mã giảm giá" 
                                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-[#0b3c9d] transition-colors"
                            />
                        </div>
                        <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">
                            Áp dụng
                        </button>
                    </div>

                    {/* Checkout Button */}
                    <button 
                        onClick={() => router.push('/checkout')}
                        className="w-full bg-[#0b3c9d] text-white py-4 rounded-lg font-bold hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] text-base"
                    >
                        TIẾN HÀNH ĐẶT HÀNG
                    </button>

                    <div className="mt-6 text-center">
                        <span className="text-[11px] text-gray-400 uppercase tracking-wide">
                            Chấp nhận thanh toán
                        </span>
                        <div className="flex justify-center gap-3 mt-3 opacity-60 grayscale hover:grayscale-0 transition-all">
                            <div className="h-6 bg-gray-200 w-10 rounded"></div> {/* Giả lập icon Visa */}
                            <div className="h-6 bg-gray-200 w-10 rounded"></div> {/* Giả lập icon Master */}
                            <div className="h-6 bg-gray-200 w-10 rounded"></div> {/* Giả lập icon Momo */}
                        </div>
                    </div>
                </div>
            </div>
          </div>
        ) : (
          /* EMPTY STATE (Giỏ hàng trống) */
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-gray-100 animate-in fade-in zoom-in duration-300">
            <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                <ShoppingBag size={64} className="text-gray-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Giỏ hàng của bạn đang trống</h2>
            <p className="text-gray-500 mb-8 max-w-md text-center">
                Có vẻ như bạn chưa thêm sản phẩm nào vào giỏ hàng. <br/>
                Hãy khám phá các mẫu laptop mới nhất với giá ưu đãi nhé!
            </p>
            <Link 
                href="/" 
                className="bg-[#0b3c9d] text-white px-8 py-3 rounded-full font-bold hover:bg-blue-800 transition-all shadow-lg"
            >
                Quay lại mua sắm
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}