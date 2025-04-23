# ======= STAGE 1: Build the application using Maven =======
FROM maven:3.9.4-eclipse-temurin-17 AS build

# Set working directory inside the container
WORKDIR /app

# Copy only the pom.xml first to leverage Docker layer caching
COPY pom.xml .

# Download all dependencies (faster builds using cache)
RUN mvn dependency:go-offline

# Copy the rest of the project
COPY . .

# Build the application
RUN mvn clean install -DskipTests

# ======= STAGE 2: Run the application using a lightweight JDK image =======
FROM eclipse-temurin:17-jdk-jammy

# Set working directory
WORKDIR /app

# Copy the JAR from the builder stage
COPY --from=build /app/target/java-backend-0.0.1-SNAPSHOT.jar app.jar

# Expose the port your Spring Boot app runs on
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]
