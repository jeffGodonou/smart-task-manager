FROM maven:3.9.11-eclipse-temurin-25 AS build
WORKDIR /app
COPY pom.xml ./
COPY src ./src
RUN mvn -DskipTests package

FROM eclipse-temurin:25-jdk
WORKDIR /app
ENV PORT=10000
COPY --from=build /app/target/backend.jar app.jar
EXPOSE 10000
CMD ["sh", "-c", "java -jar app.jar"]
