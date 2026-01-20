'use client';

import { use } from 'react'; // Import use để xử lý params
import Link from 'next/link';
import { 
  ArrowLeft, 
  Printer, 
  MapPin, 
  Phone, 
  CreditCard, 
  Package, 
  CheckCircle,
  Clock,
  Truck
} from 'lucide-react';
import { MOCK_ORDER_DETAIL } from '@/data/orders';

// Hàm helper render trạng thái
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">Chờ xác nhận</span>;
    case 'processing': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">Đang xử lý</span>;
    case 'shipping': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">Đang giao</span>;
    case 'delivered': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Đã giao</span>;
    case 'cancelled': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Đã hủy</span>;
    default: return null;
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. Lấy ID từ URL (Next.js 15)
  const { id } = use(params);
  
  // Trong thực tế: const order = await fetch(`/api/orders/${id}`)
  // Ở đây ta dùng Mock Data
  const order = { ...MOCK_ORDER_DETAIL, id: id }; // Gán ID từ URL vào để demo

  return (
    <div className="min-h-screen bg-gray-50 font-[Segoe_UI,sans-serif] pb-20">
      
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center text-gray-600 hover:text-[#0b3c9d] transition-colors gap-2 font-medium">
                <ArrowLeft size={20} /> Về trang chủ
            </Link>
            <h1 className="text-lg font-bold text-[#0b3c9d]">Chi Tiết Đơn Hàng</h1>
            <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0b3c9d]"
            >
                <Printer size={18} /> <span className="hidden sm:inline">In hóa đơn</span>
            </button>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8 max-w-5xl">
        
        {/* THANH TRẠNG THÁI (Stepper) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                        Đơn hàng #{order.id}
                        {getStatusBadge(order.status)}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Đặt ngày: {order.date}</p>
                </div>
            </div>
            
            {/* Demo Progress Bar */}
            <div className="relative flex items-center justify-between mt-8 px-2 md:px-10">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 -z-0"></div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-1 bg-green-500 -z-0"></div> {/* Demo 33% */}

                <div className="flex flex-col items-center bg-white z-10 p-2">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center"><FileText size={16} /></div>
                    <span className="text-xs font-bold mt-2 text-green-600">Đã đặt</span>
                </div>
                <div className="flex flex-col items-center bg-white z-10 p-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center"><Package size={16} /></div>
                    <span className="text-xs font-bold mt-2 text-blue-600">Đóng gói</span>
                </div>
                <div className="flex flex-col items-center bg-white z-10 p-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center"><Truck size={16} /></div>
                    <span className="text-xs mt-2 text-gray-400">Vận chuyển</span>
                </div>
                <div className="flex flex-col items-center bg-white z-10 p-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center"><CheckCircle size={16} /></div>
                    <span className="text-xs mt-2 text-gray-400">Hoàn tất</span>
                </div>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
            
            {/* CỘT TRÁI: DANH SÁCH SẢN PHẨM */}
            <div className="flex-1 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 font-bold text-gray-700">
                        Sản phẩm ({order.items.length})
                    </div>
                    <div className="divide-y divide-gray-100">
                        {order.items.map((item) => (
                            <div key={item.id} className="p-4 flex gap-4">
                                <div className="w-20 h-20 bg-gray-100 rounded border border-gray-200 p-1 shrink-0">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain mix-blend-multiply" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-gray-800 line-clamp-2">{item.name}</h3>
                                    <p className="text-xs text-gray-500 mt-1">{item.specs}</p>
                                    <div className="flex justify-between items-end mt-2">
                                        <div className="text-xs text-gray-500">x{item.quantity}</div>
                                        <div className="text-sm font-bold text-[#0b3c9d]">{formatCurrency(item.price)}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-800 mb-4">Chi tiết thanh toán</h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-gray-600">
                            <span>Tạm tính</span>
                            <span>{formatCurrency(order.costs.subTotal)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Phí vận chuyển</span>
                            <span>{order.costs.shipping === 0 ? 'Miễn phí' : formatCurrency(order.costs.shipping)}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                            <span>Thuế VAT (8%)</span>
                            <span>{formatCurrency(order.costs.tax)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold pt-3 border-t border-dashed">
                            <span>Tổng cộng</span>
                            <span className="text-[#0b3c9d] text-xl">{formatCurrency(order.costs.total)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CỘT PHẢI: THÔNG TIN KHÁCH HÀNG */}
            <div className="w-full lg:w-[350px] space-y-6">
                
                {/* Thông tin giao hàng */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <MapPin size={18} className="text-[#0b3c9d]" /> Địa chỉ nhận hàng
                    </h3>
                    <div className="text-sm text-gray-600 space-y-2">
                        <p className="font-bold text-gray-900">{order.customer.name}</p>
                        <p>{order.customer.phone}</p>
                        <p className="leading-relaxed">{order.customer.address}</p>
                    </div>
                </div>

                {/* Phương thức thanh toán */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <CreditCard size={18} className="text-[#0b3c9d]" /> Thanh toán
                    </h3>
                    <div className="text-sm text-gray-600">
                        <p className="mb-1">Phương thức: <span className="font-medium text-gray-900 uppercase">{order.paymentMethod}</span></p>
                        <p className="text-green-600 flex items-center gap-1 text-xs">
                           <CheckCircle size={12} /> Đã xác nhận
                        </p>
                    </div>
                </div>

                {/* Hỗ trợ */}
                <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-center">
                    <p className="text-sm text-blue-800 mb-3 font-medium">Bạn cần hỗ trợ đơn hàng này?</p>
                    <button className="bg-white text-blue-600 border border-blue-200 w-full py-2 rounded-lg text-sm font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2">
                        <Phone size={16} /> Liên hệ CSKH
                    </button>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}

// Icon Helper
function FileText({ size }: { size: number }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>;
}