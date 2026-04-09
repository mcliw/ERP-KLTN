'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link'; // Import Link để điều hướng
import { 
  ShoppingCart, 
  Search, 
  User, 
  Bell, 
  LogOut, 
  Laptop, 
  Star,
  Filter,
  Loader2,
  TrendingUp 
} from 'lucide-react';
import { Product } from '@/data/products';
import { useCartStore } from '@/stores/useCartStore';
import { toast } from 'sonner';

const CATEGORIES = ["Tất cả", "Apple", "Dell", "Asus", "HP", "Lenovo", "Acer", "MSI"];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

export default function HomePage() {
  const router = useRouter();
  
  // 1. LẤY STATE TỪ ZUSTAND STORE
  const { items, addItem } = useCartStore();
  
  // Tính tổng số lượng hiển thị trên Badge (Icon giỏ hàng)
  // Hydration fix: Chỉ hiển thị số lượng khi client đã load
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const cartCount = mounted ? items.reduce((total, item) => total + item.quantity, 0) : 0;

  // Local State
  const [selectedCategory, setSelectedCategory] = useState("Tất cả");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // 2. FETCH DATA TỪ API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/products'); 
        const data = await res.json();
        setProducts(data);
      } catch (error) {
        console.error("Lỗi tải sản phẩm:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 3. XỬ LÝ LỌC SẢN PHẨM
  const filteredProducts = selectedCategory === "Tất cả" 
    ? products 
    : products.filter(p => p.brand === selectedCategory);

  // 4. XỬ LÝ THÊM VÀO GIỎ
  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault(); // Ngăn chặn nhảy vào trang chi tiết khi bấm nút Mua
    e.stopPropagation();

    addItem({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        discount: product.discount,
        image: product.image,
        specs: product.specs,
    });

    // Thông báo đơn giản (có thể thay bằng toast)
    alert(`Đã thêm ${product.name} vào giỏ!`);
  };

  const handleLogout = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 font-[Segoe_UI,sans-serif]">
      
      {/* ================= HEADER ================= */}
      <header className="sticky top-0 z-50 bg-[#0b3c9d] text-white shadow-lg">
        <div className="container mx-auto px-4 h-[70px] flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="bg-white p-1 rounded-md">
                <Laptop className="text-[#0b3c9d]" size={24} />
            </div>
            <div className="leading-tight">
                <h1 className="text-xl font-bold tracking-wider">LDG STORE</h1>
                <p className="text-[10px] opacity-80 uppercase tracking-widest">Premium Laptops</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-xl mx-8 relative">
            <input 
              type="text" 
              placeholder="Bạn muốn tìm laptop gì hôm nay?..." 
              className="w-full h-[40px] pl-4 pr-12 rounded-full text-black outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button className="absolute right-1 top-1 w-[32px] h-[32px] bg-[#0b3c9d] rounded-full flex items-center justify-center hover:bg-blue-800">
                <Search size={16} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer hover:opacity-80">
                <Bell size={24} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </div>

            {/* Cart Icon - Bấm vào chuyển sang trang Cart */}
            <div 
              onClick={() => router.push('/cart')} 
              className="relative cursor-pointer hover:opacity-80 transition-transform active:scale-95"
            >
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-[#0b3c9d]">
                  {cartCount}
                </span>
              )}
            </div>

            {/* User Dropdown */}
            <div className="flex items-center gap-2 cursor-pointer group relative">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                    <User size={20} />
                </div>
                <div className="hidden sm:block text-sm">
                    <p className="font-semibold">Xin chào,</p>
                    <p className="text-xs opacity-80">Admin</p>
                </div>
                <div className="absolute top-full right-0 mt-2 w-48 bg-white text-black rounded-lg shadow-xl border border-gray-100 hidden group-hover:block animate-in fade-in slide-in-from-top-2">
                    <div className="p-2">
                        <div className="px-4 py-2 hover:bg-gray-50 rounded cursor-pointer text-sm">Tài khoản của tôi</div>
                        <div 
                            onClick={handleLogout}
                            className="px-4 py-2 hover:bg-red-50 text-red-600 rounded cursor-pointer text-sm flex items-center gap-2 mt-2 border-t"
                        >
                            <LogOut size={14} /> Đăng xuất
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </header>

      {/* ================= HERO SECTION ================= */}
      <section className="bg-gradient-to-r from-[#0b3c9d] to-[#1e5ccc] text-white py-12">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 space-y-6 animate-in slide-in-from-left duration-700">
                <span className="bg-white/20 px-4 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                    🎉 Khuyến mãi mùa tựu trường
                </span>
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                    Nâng Tầm <br/> <span className="text-yellow-400">Công Nghệ</span> Của Bạn
                </h1>
                <button className="bg-yellow-400 text-[#0b3c9d] px-8 py-3 rounded-full font-bold hover:bg-yellow-300 transition-transform hover:scale-105 shadow-lg shadow-yellow-400/20">
                    Mua Ngay Hôm Nay
                </button>
            </div>
            <div className="md:w-1/2 mt-8 md:mt-0 flex justify-center animate-in zoom-in duration-700">
                <div className="w-[400px] h-[250px] bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center shadow-2xl transform -rotate-6 hover:rotate-0 transition-all">
                   <Laptop size={120} className="text-white opacity-50" />
                </div>
            </div>
        </div>
      </section>

      {/* ================= MAIN CONTENT ================= */}
      <main className="container mx-auto px-4 py-12">
        
        {/* Category Filter */}
        <div className="flex flex-wrap items-center gap-3 mb-10 justify-center">
            {CATEGORIES.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                        selectedCategory === cat 
                        ? 'bg-[#0b3c9d] text-white shadow-md transform scale-105' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-[#0b3c9d] hover:text-[#0b3c9d]'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Filter size={24} className="text-[#0b3c9d]" /> 
                {selectedCategory === "Tất cả" ? "Sản Phẩm Nổi Bật" : `Laptop ${selectedCategory}`}
            </h2>
            <span className="text-sm text-gray-500">{filteredProducts.length} sản phẩm</span>
        </div>

        {/* --- PRODUCT GRID --- */}
        {loading ? (
          // Skeleton Loading
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
             {[1,2,3,4].map(i => (
                <div key={i} className="bg-white h-[350px] rounded-xl shadow-sm animate-pulse border border-gray-100">
                   <div className="h-[200px] bg-gray-200 w-full rounded-t-xl"></div>
                   <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-6 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                   </div>
                </div>
             ))}
          </div>
        ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden group flex flex-col">
                    
                    {/* Image Area - Wrap in Link */}
                    <Link href={`/products/${product.id}`} className="block relative h-[200px] p-4 bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors cursor-pointer">
                        {product.discount > 0 && (
                            <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-10">
                                -{product.discount}%
                            </span>
                        )}
                        
                        <img 
                            src={product.image} 
                            alt={product.name}
                            className="max-h-full object-contain group-hover:scale-110 transition-transform duration-300 mix-blend-multiply"
                            onError={(e) => {
                                e.currentTarget.src = "https://via.placeholder.com/300x300?text=No+Image";
                            }}
                        />
                    </Link>

                    {/* Content Area */}
                    <div className="p-4 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-1">
                            <div className="text-xs text-gray-500">{product.brand}</div>
                            {/* Dữ liệu database: total_sold */}
                            <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                <TrendingUp size={12} /> Đã bán {product.total_sold}
                            </div>
                        </div>

                        {/* Title - Wrap in Link */}
                        <Link href={`/products/${product.id}`}>
                            <h3 className="font-bold text-gray-800 mb-1 line-clamp-2 min-h-[48px] group-hover:text-[#0b3c9d] transition-colors cursor-pointer">
                                {product.name}
                            </h3>
                        </Link>
                        
                        {/* Specs */}
                        <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded inline-block w-fit mb-3">
                            {product.specs}
                        </div>

                        {/* Rating (Dữ liệu database: avg_rating) */}
                        <div className="flex items-center gap-1 mb-4">
                            {[...Array(5)].map((_, i) => (
                                <Star 
                                    key={i} 
                                    size={12} 
                                    className={`${i < Math.floor(product.avg_rating) ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} 
                                />
                            ))}
                            <span className="text-xs text-gray-400">({product.avg_rating})</span>
                        </div>

                        {/* Price & Add To Cart */}
                        <div className="mt-auto flex items-center justify-between">
                            <div>
                                <div className="text-lg font-bold text-[#0b3c9d]">
                                    {formatCurrency(product.price * (1 - product.discount/100))}
                                </div>
                                {product.discount > 0 && (
                                    <div className="text-xs text-gray-400 line-through">
                                        {formatCurrency(product.price)}
                                    </div>
                                )}
                            </div>
                            
                            {/* Nút thêm vào giỏ */}
                            <button 
                                onClick={(e) => handleAddToCart(e, product)}
                                className="bg-[#0b3c9d] text-white p-2 rounded-full hover:bg-blue-700 active:scale-95 transition-all shadow-md shadow-blue-900/10"
                                title="Thêm vào giỏ"
                            >
                                <ShoppingCart size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        ) : (
            <div className="text-center py-20 text-gray-500">
                <Laptop size={48} className="mx-auto mb-4 opacity-20" />
                <p>Không tìm thấy sản phẩm nào thuộc danh mục này.</p>
            </div>
        )}

      </main>

      {/* ================= FOOTER ================= */}
      <footer className="bg-slate-900 text-gray-400 py-12 mt-12 border-t border-slate-800">
         <div className="container mx-auto px-4 text-center text-xs">
            © 2026 LDG Tech Ecommerce. All rights reserved.
         </div>
      </footer>
    </div>
  );
}