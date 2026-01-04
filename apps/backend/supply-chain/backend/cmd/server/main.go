package main

import (
	"github.com/gin-gonic/gin"
	"net/http"
)

func main() {
	r := gin.Default()

	// Endpoint kiểm tra sức khỏe hệ thống
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "Supply Chain Backend is running",
		})
	})

	// Chạy server trên cổng 8080
	// Lưu ý: Phải dùng ":8080" để Docker có thể map cổng chính xác
	r.Run(":8080") 
}