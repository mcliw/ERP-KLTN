'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Star, 
  ShoppingCart, 
  Heart, 
  ArrowLeft, 
  Truck, 
  ShieldCheck, 
  RefreshCw,
  Minus,
  Plus,
  Check
} from 'lucide-react';
import { MOCK_PRODUCTS, Product } from '@/data/products';
import { useCartStore } from '@/stores/useCartStore'; // 1. IMPORT STORE

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  // 2. LẤY HÀM ADD TỪ STORE
  const { addItem } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'specs'>('desc');
  const [selectedColor, setSelectedColor] = useState('gray'); 
  
  useEffect(() => {
    const foundProduct = MOCK_PRODUCTS.find(p => p.id === Number(id));
    if (foundProduct) {
      setProduct(foundProduct);
    }
  }, [id]);

  // 3. HÀM XỬ LÝ THÊM VÀO GIỎ
  const handleAddToCart = () => {
    if (!product) return;

    // Thêm sản phẩm vào store
    // Vì store hiện tại logic là +1 mỗi lần add, ta lặp để thêm đúng số lượng user chọn
    // (Cách tốt hơn là update store để nhận tham số quantity, nhưng cách này nhanh nhất không cần sửa store)
    for (let i = 0; i < quantity; i++) {
        addItem({
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            discount: product.discount,
            image: product.image,
            specs: product.specs,
        });
    }

    alert(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
    // Reset số lượng về 1 nếu muốn
    setQuantity(1);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/cart'); // Chuyển hướng ngay sang giỏ hàng
  };

  if (!product) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0b3c9d]"></div>
        </div>
    );
  }

  const discountedPrice = product.price * (1 - product.discount / 100);

  return (
    <div className="min-h-screen bg-gray-50 font-[Segoe_UI,sans-serif] pb-20">
      
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
                <ArrowLeft size={20} />
            </Link>
            <div className="text-sm breadcrumbs text-gray-500">
                <Link href="/">Trang chủ</Link> <span className="mx-2">/</span>
                <span className="text-[#0b3c9d] font-medium truncate max-w-[200px] md:max-w-md">{product.name}</span>
            </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            
            {/* LEFT: HÌNH ẢNH */}
            <div className="lg:w-2/5 p-6 border-b lg:border-b-0 lg:border-r border-gray-100">
                <div className="relative w-full aspect-square bg-white rounded-xl flex items-center justify-center mb-4 overflow-hidden group">
                    <img 
                        src={product.image} 
                        alt={product.name} 
                        className="w-[90%] h-[90%] object-contain mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.discount > 0 && (
                        <span className="absolute top-4 left-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            Giảm {product.discount}%
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-4 gap-3">
                    {[product.image, product.image, product.image, product.image].map((img, idx) => (
                        <div key={idx} className={`aspect-square rounded-lg border-2 p-1 cursor-pointer hover:border-[#0b3c9d] transition-all ${idx === 0 ? 'border-[#0b3c9d]' : 'border-transparent bg-gray-50'}`}>
                            <img src={img} alt="thumb" className="w-full h-full object-contain mix-blend-multiply" />
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: THÔNG TIN */}
            <div className="lg:w-3/5 p-6 lg:p-10">
                <div className="mb-4">
                    <span className="text-[#0b3c9d] font-bold text-sm uppercase tracking-wide bg-blue-50 px-3 py-1 rounded-full">
                        {product.brand}
                    </span>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-3 leading-tight">
                        {product.name}
                    </h1>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-1 text-yellow-400">
                        <span className="font-bold text-black text-base mr-1">{product.avg_rating}</span>
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} size={16} fill={i < Math.floor(product.avg_rating) ? "currentColor" : "none"} />
                        ))}
                    </div>
                    <div className="w-[1px] h-4 bg-gray-300"></div>
                    <div>Đã bán <span className="font-bold text-black">{product.total_sold}</span></div>
                    <div className="w-[1px] h-4 bg-gray-300"></div>
                    <div className="text-green-600 font-medium flex items-center gap-1">
                        <Check size={14} /> Còn {product.stock} sản phẩm
                    </div>
                </div>

                <div className="mb-8">
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold text-[#0b3c9d]">{formatCurrency(discountedPrice)}</span>
                        {product.discount > 0 && (
                            <span className="text-lg text-gray-400 line-through mb-1">{formatCurrency(product.price)}</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">*Giá đã bao gồm VAT</p>
                </div>

                <div className="space-y-6 mb-8">
                    {/* Color */}
                    <div>
                        <span className="text-sm font-bold text-gray-900 mb-2 block">Màu sắc</span>
                        <div className="flex gap-3">
                            {['gray', 'silver', 'black'].map((color) => (
                                <button 
                                    key={color}
                                    onClick={() => setSelectedColor(color)}
                                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${selectedColor === color ? 'border-[#0b3c9d] ring-2 ring-blue-100' : 'border-gray-200'}`}
                                >
                                    <div className={`w-8 h-8 rounded-full ${color === 'gray' ? 'bg-gray-600' : color === 'silver' ? 'bg-gray-300' : 'bg-black'}`}></div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Quantity */}
                    <div>
                        <span className="text-sm font-bold text-gray-900 mb-2 block">Số lượng</span>
                        <div className="flex items-center border border-gray-300 rounded-lg w-fit">
                            <button 
                                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                className="p-3 hover:bg-gray-100 text-gray-600"
                            >
                                <Minus size={16} />
                            </button>
                            <span className="w-12 text-center font-bold text-gray-800">{quantity}</span>
                            <button 
                                onClick={() => setQuantity(q => q + 1)}
                                className="p-3 hover:bg-gray-100 text-gray-600"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 mb-8">
                    <button 
                        className="flex-1 bg-[#0b3c9d] text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-800 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98] flex items-center justify-center gap-2"
                        onClick={handleAddToCart} // GỌI HÀM XỬ LÝ MỚI
                    >
                        <ShoppingCart size={20} /> Thêm vào giỏ
                    </button>
                    <button 
                        onClick={handleBuyNow}
                        className="flex-1 bg-orange-50 text-orange-600 border border-orange-200 py-4 rounded-xl font-bold text-lg hover:bg-orange-100 transition-all active:scale-[0.98]"
                    >
                        Mua ngay
                    </button>
                    <button className="p-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Heart size={24} />
                    </button>
                </div>

                {/* Policies */}
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2"><Truck size={18} className="text-[#0b3c9d]"/> Freeship nội thành</div>
                    <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#0b3c9d]"/> Bảo hành 12 tháng</div>
                    <div className="flex items-center gap-2"><RefreshCw size={18} className="text-[#0b3c9d]"/> Đổi trả trong 7 ngày</div>
                    <div className="flex items-center gap-2"><Check size={18} className="text-[#0b3c9d]"/> Cam kết chính hãng</div>
                </div>

            </div>
          </div>

          {/* BOTTOM: TABS */}
          <div className="border-t border-gray-100">
            <div className="flex border-b border-gray-100">
                <button 
                    onClick={() => setActiveTab('desc')}
                    className={`px-8 py-4 font-bold text-sm uppercase transition-colors relative ${activeTab === 'desc' ? 'text-[#0b3c9d]' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    Mô tả sản phẩm
                    {activeTab === 'desc' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#0b3c9d]"></span>}
                </button>
                <button 
                    onClick={() => setActiveTab('specs')}
                    className={`px-8 py-4 font-bold text-sm uppercase transition-colors relative ${activeTab === 'specs' ? 'text-[#0b3c9d]' : 'text-gray-500 hover:text-gray-800'}`}
                >
                    Thông số kỹ thuật
                    {activeTab === 'specs' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#0b3c9d]"></span>}
                </button>
            </div>

            <div className="p-8 bg-gray-50/30 min-h-[300px]">
                {activeTab === 'desc' ? (
                    <div className="max-w-4xl mx-auto space-y-4 text-gray-700 leading-relaxed">
                        <h3 className="text-xl font-bold text-gray-900">Đánh giá chi tiết {product.name}</h3>
                        <p>{product.description}</p>
                        <p>
                            Sản phẩm mang đến hiệu năng vượt trội nhờ con chip thế hệ mới, giúp bạn xử lý mọi tác vụ văn phòng 
                            đến đồ họa nặng một cách mượt mà. Màn hình sắc nét, màu sắc trung thực là điểm cộng lớn cho dân thiết kế.
                        </p>
                        <div className="bg-white p-4 rounded-lg border border-gray-100 my-4">
                            <strong className="block mb-2 text-gray-900">Điểm nổi bật:</strong>
                            <ul className="list-disc pl-5 space-y-1">
                                <li>Thiết kế mỏng nhẹ, sang trọng.</li>
                                <li>Thời lượng pin ấn tượng lên đến 10 giờ.</li>
                                <li>Hệ thống tản nhiệt thông minh, vận hành êm ái.</li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto">
                        <table className="w-full text-sm text-left">
                            <tbody className="divide-y divide-gray-200">
                                <tr className="bg-white">
                                    <td className="py-3 px-4 font-medium text-gray-500 w-1/3">Thương hiệu</td>
                                    <td className="py-3 px-4 font-bold text-gray-900">{product.brand}</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-500">Cấu hình chi tiết</td>
                                    <td className="py-3 px-4 text-gray-900">{product.specs}</td>
                                </tr>
                                <tr className="bg-white">
                                    <td className="py-3 px-4 font-medium text-gray-500">Bảo hành</td>
                                    <td className="py-3 px-4 text-gray-900">12 Tháng chính hãng</td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 font-medium text-gray-500">Tình trạng</td>
                                    <td className="py-3 px-4 text-green-600 font-bold">Mới 100% Fullbox</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}