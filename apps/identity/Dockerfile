FROM maven:3.9.11-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY .mvn/ .mvn
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline
COPY src ./src
RUN ./mvnw clean install

FROM eclipse-temurin:21.0.8_9-jre-jammy AS final
WORKDIR /app
EXPOSE 8080
COPY --from=build /opt/app/target/*.jar /opt/app/*.jar
ENTRYPOINT ["java", "-jar", "/opt/app/*.jar"]