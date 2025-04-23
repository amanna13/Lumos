# =======================
# Stage 1: Build with Maven
# =======================
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /build

COPY pom.xml .
RUN mvn dependency:go-offline

COPY . .
RUN mvn clean package -DskipTests

# =======================
# Stage 2: Run the JAR
# =======================
FROM eclipse-temurin:17-jdk-jammy
WORKDIR /app

RUN ls -la target/

# Copy built JAR from Stage 1
COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
