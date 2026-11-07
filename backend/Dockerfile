# -------------------------------------------------------------
# Stage 1: Build the Spring Boot application
# -------------------------------------------------------------
FROM eclipse-temurin:17-jdk-jammy AS builder
WORKDIR /workspace

# Copy maven wrapper and pom.xml first to leverage Docker layer caching
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x ./mvnw && ./mvnw dependency:go-offline -B

# Copy application source code
COPY src ./src

# Build production jar skipping tests (tests should be run in CI/local)
RUN ./mvnw clean package -DskipTests -B

# -------------------------------------------------------------
# Stage 2: Minimal runtime image
# -------------------------------------------------------------
FROM eclipse-temurin:17-jre-jammy AS runtime
WORKDIR /app

# Create application user for security
RUN groupadd -r assessmate && useradd -r -g assessmate assessmate

# Create uploads directories for proctoring and questions
RUN mkdir -p /app/uploads/questions \
             /app/uploads/proctoring/images \
             /app/uploads/proctoring/audio \
    && chown -R assessmate:assessmate /app

# Copy executable jar from builder stage
COPY --from=builder /workspace/target/*.jar /app/app.jar

# Switch to non-root user
USER assessmate

# Configure container memory limits tuned for Render Free Tier (512 MB RAM)
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=40.0 -XX:+ExitOnOutOfMemoryError"
ENV PORT=8080

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar /app/app.jar"]

