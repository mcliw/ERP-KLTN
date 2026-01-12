package erp.company.identity.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import erp.company.identity.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    @Query("SELECT u FROM User u " +
           "LEFT JOIN FETCH u.role r " +
           "LEFT JOIN FETCH r.permissions " +
           "WHERE u.email = :email")
    Optional<User> findByEmailWithRoleAndPermissions(String email);

    Optional<User> findByEmailAndAccountType(String email, String accountType);

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
