// --- 1. ĐỊNH NGHĨA INTERFACE (Khớp với DB) ---

export interface Product {
  // Từ bảng: product
  id: number;
  name: string;
  avg_rating: number; // DB: avg_rating
  total_sold: number; // DB: total_sold
  description?: string; // DB: description

  // Từ bảng: cate_brand_link (Đã JOIN để lấy tên thương hiệu)
  brand: string; 

  // Từ bảng: product_variant (Lấy biến thể mặc định hoặc giá thấp nhất)
  price: number;      // DB: original_price
  discount: number;   // DB: discount_percent
  stock: number;      // DB: stock

  // Từ bảng: img_product (Lấy ảnh đại diện đầu tiên)
  image: string;      

  // Từ bảng: product_attribute_value (Đã gộp các thuộc tính quan trọng để hiển thị)
  specs: string;      
}

// --- 2. MOCK DATA (Dữ liệu mẫu khớp cấu trúc) ---

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "MacBook Air M2 2023",
    brand: "Apple",
    // Mapping từ product_variant
    price: 24990000, 
    discount: 10,
    stock: 50,
    // Mapping từ product
    avg_rating: 5.0,
    total_sold: 120,
    description: "Laptop mỏng nhẹ, hiệu năng mạnh mẽ với chip M2 thế hệ mới.",
    // Mapping từ img_product
    image: "https://cdn.tgdd.vn/Products/Images/44/309018/apple-macbook-air-15-inch-m2-2023-midnight-thumb-600x600.jpg",
    // Mapping từ product_attribute_value (CPU, RAM, SSD)
    specs: "M2 Chip • 8GB • 256GB SSD"
  },
  {
    id: 2,
    name: "Dell XPS 13 Plus",
    brand: "Dell",
    price: 41500000,
    discount: 0,
    stock: 20,
    avg_rating: 4.5,
    total_sold: 45,
    description: "Thiết kế tương lai, màn hình OLED 3.5K sắc nét.",
    image: "https://hungphatlaptop.com/wp-content/uploads/2023/10/DELL-XPS-13-Plus-9320-2023-Features-02.jpeg",
    specs: "Core i7 • 16GB • 512GB SSD"
  },
  {
    id: 3,
    name: "ASUS ROG Strix G16",
    brand: "Asus",
    price: 32990000,
    discount: 5,
    stock: 100,
    avg_rating: 4.8,
    total_sold: 89,
    description: "Chiến thần gaming, tản nhiệt cực mát.",
    image: "https://cdnv2.tgdd.vn/mwg-static/tgdd/Products/Images/44/333094/asus-rog-strix-g16-g614ju-i7-n3509w-1-638700328702961785-750x500.jpg",
    specs: "RTX 4060 • 16GB • 1TB SSD"
  },
  {
    id: 4,
    name: "HP Envy x360 2-in-1",
    brand: "HP",
    price: 18990000,
    discount: 15,
    stock: 35,
    avg_rating: 4.2,
    total_sold: 230,
    description: "Xoay gập 360 độ, cảm ứng mượt mà.",
    image: "https://ttcenter.com.vn/uploads/product/o7hqlo3h-1353-hp-envy-x360-2in1-16-ac0013dx-2024-core-ultra-7-155u-16gb-512gb-iris-xe-graphics-16-fhd-touch-new.jpg",
    specs: "Core i5 • 8GB • Touch Screen"
  },
  {
    id: 5,
    name: "Lenovo ThinkPad X1 Carbon",
    brand: "Lenovo",
    price: 45000000,
    discount: 0,
    stock: 15,
    avg_rating: 5.0,
    total_sold: 12,
    description: "Đẳng cấp doanh nhân, bền bỉ chuẩn quân đội.",
    image: "https://www.laptopvip.vn/images/ab__webp/detailed/39/ThinkPad-X1-Carbon-Gen-13-CT1-05-www.laptopvip.vn-1731149987.webp",
    specs: "Core i7 • 32GB • Business"
  },
  {
    id: 6,
    name: "Acer Nitro 5 Tiger",
    brand: "Acer",
    price: 17990000,
    discount: 20,
    stock: 60,
    avg_rating: 4.6,
    total_sold: 340,
    description: "Laptop gaming quốc dân, hiệu năng trên giá thành tốt nhất.",
    image: "https://cdn2.cellphones.com.vn/insecure/rs:fill:0:358/q:90/plain/https://cellphones.com.vn/media/catalog/product/2/8/28_1_17.jpg",
    specs: "RTX 3050 • 8GB • 512GB"
  },
];