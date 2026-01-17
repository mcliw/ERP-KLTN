import { NextResponse } from 'next/server';
import { MOCK_PRODUCTS } from '@/data/products';

export async function GET(request: Request) {
  // Giả lập độ trễ mạng (Network Latency) 1 giây để thấy hiệu ứng loading
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Lấy params từ URL (Ví dụ: /api/products?brand=Apple)
  const { searchParams } = new URL(request.url);
  const brand = searchParams.get('brand');

  let filteredProducts = MOCK_PRODUCTS;

  // Nếu có brand trên URL thì lọc server-side luôn
  if (brand && brand !== 'Tất cả') {
    filteredProducts = MOCK_PRODUCTS.filter(
      (p) => p.brand.toLowerCase() === brand.toLowerCase()
    );
  }

  // Trả về JSON
  return NextResponse.json(filteredProducts);
}