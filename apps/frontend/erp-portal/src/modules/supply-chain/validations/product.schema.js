import { z } from "zod";

const emptyToUndefined = (schema) =>
  z.preprocess((val) => (val === "" || val === null ? undefined : val), schema.optional());

export const productSchema = z.object({
  name: z.string().min(1, "Tên sản phẩm là bắt buộc"),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
  
  type: z.enum(["Hàng hóa kinh doanh", "Tài sản công ty"], {
      errorMap: () => ({ message: "Vui lòng chọn phân loại" }) 
  }),
  
  brand: z.string().min(1, "Thương hiệu là bắt buộc"),
  unit: z.string().min(1, "Đơn vị tính là bắt buộc"),
  
  // SKU có thể để trống lúc nhập để hệ thống tự sinh
  code: emptyToUndefined(z.string()),
  
  minStock: z.coerce.number().min(0).default(0),
  warranty: z.coerce.number().min(0).default(0),
  description: emptyToUndefined(z.string()),
  
  // URL ảnh (nếu backend hỗ trợ upload thì xử lý khác, ở đây dùng string base64/url)
  image: emptyToUndefined(z.string()), 
  
  status: z.string().default("Hoạt động"),
});