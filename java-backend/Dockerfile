# =======================
# Stage 1: Build with Maven
# =======================
FROM maven:3.9.4-eclipse-temurin-17 AS build
WORKDIR /build

COPY pom.xml .
RUN mvn dependency:go-offline

COPY . .
RUN mvn clean package -DskipTests

# Debug - Check what files were created
RUN ls -la target/
RUN find /build -name "*.jar"

# =======================
# Stage 2: Run the JAR
# =======================
FROM eclipse-temurin:17-jdk-jammy
WORKDIR /app

# Copy built JAR from Stage 1 - using more specific path based on your project
COPY --from=build /build/target/*.jar ./app.jar

# Verify the jar was copied
RUN ls -la .

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]