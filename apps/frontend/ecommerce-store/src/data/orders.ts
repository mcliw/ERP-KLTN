// Dữ liệu mẫu cho 1 đơn hàng hoàn chỉnh
export const MOCK_ORDER_DETAIL = {
  id: "ORD-8823",
  date: "20/05/2024 14:30",
  status: "processing", // pending | processing | shipping | delivered | cancelled
  paymentMethod: "cod", // cod | banking
  customer: {
    name: "Nguyễn Văn A",
    phone: "0909 123 456",
    address: "123 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
    email: "nguyenva@gmail.com"
  },
  items: [
    {
      id: 1,
      name: "MacBook Air M2 2023",
      image: "https://cdn.tgdd.vn/Products/Images/44/289472/macbook-air-m2-2022-gray-600x600.jpg",
      price: 24990000,
      quantity: 1,
      specs: "M2 Chip • 8GB • 256GB"
    },
    {
      id: 3,
      name: "Chuột Logitech MX Master 3S",
      image: "https://cdn.tgdd.vn/Products/Images/86/285223/chuot-bluetooth-logitech-mx-master-3s-xam-thumb-600x600.jpg",
      price: 2490000,
      quantity: 1,
      specs: "Grey"
    }
  ],
  costs: {
    subTotal: 27480000,
    shipping: 0,
    tax: 2198400,
    total: 29678400
  }
};