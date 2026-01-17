FROM nginx:1.25-alpine

# 1. Xóa các file cấu hình mặc định không cần thiết
RUN rm /etc/nginx/conf.d/default.conf

# 2. Copy file cấu hình tổng quát
COPY nginx.conf /etc/nginx/nginx.conf

# 3. Copy các file cấu hình site (portal, store)
COPY conf.d/*.conf /etc/nginx/conf.d/

# 4. Copy chứng chỉ SSL vào đúng thư mục
COPY certs/ /etc/nginx/certs/

# 5. Phân quyền chỉ đọc cho chứng chỉ để tăng tính bảo mật
RUN chmod 600 /etc/nginx/certs/private.key

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]