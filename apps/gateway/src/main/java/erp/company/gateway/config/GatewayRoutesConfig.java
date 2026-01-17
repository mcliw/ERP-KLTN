package erp.company.gateway.config;

import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GatewayRoutesConfig {

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        return builder.routes()
                // Route 1: Identity Service
                .route("identity-service", r -> r.path("/api/identity/**")
                        .filters(f -> f.stripPrefix(1)) // Cắt bỏ /api
                        .uri("http://identity-service:8080")) // Forward đến service

                // Route 2: HRM Service
                .route("hrm-service", r -> r.path("/api/hrm/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://hrm-service:8080"))

                // Bạn có thể thêm các route khác tương tự (Sales, Supply Chain...) tại đây
                .build();
    }
}