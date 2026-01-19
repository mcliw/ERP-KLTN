package erp.company.identity.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import erp.company.identity.entity.RefreshToken;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    // Tìm kiếm Token để xác thực khi người dùng yêu cầu làm mới Access Token
    // Sử dụng FETCH JOIN để lấy luôn thông tin User (cho claim "sub")
    @Query("SELECT t FROM RefreshToken t JOIN FETCH t.user WHERE t.token = :token")
    Optional<RefreshToken> findByTokenWithUser(String token);

    // Xóa tất cả token cũ của user khi login mới (đảm bảo bảo mật)
    void deleteByUserId(UUID userId);
}