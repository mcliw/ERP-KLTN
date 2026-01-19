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

                // --- CÁC ROUTE BỔ SUNG TỪ APPLICATION.YML ---

                // Route 3: Sales Service
                .route("sales-service", r -> r.path("/api/sales/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://sales-service:8080"))

                // Route 4: Supply Chain Service
                .route("supply-chain-service", r -> r.path("/api/supply-chain/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://supply-chain-service:8080"))

                // Route 5: Accounting Service
                .route("accounting-service", r -> r.path("/api/accounting/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://accounting-service:8080"))

                // Route 6: AI Assistant Service
                .route("ai-service", r -> r.path("/api/ai/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://ai-service:8000"))

                // Route 7: Face Recognition Service
                .route("face-service", r -> r.path("/api/face/**")
                        .filters(f -> f.stripPrefix(1))
                        .uri("http://face-service:8000")) 

                .build();
    }
}