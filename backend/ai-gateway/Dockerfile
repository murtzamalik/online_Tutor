FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY backend/pom.xml backend/pom.xml
COPY backend/common backend/common
COPY backend/testkit backend/testkit
COPY backend/ai-gateway backend/ai-gateway
COPY backend/core-api/pom.xml backend/core-api/pom.xml
WORKDIR /src/backend
RUN mvn -q -pl ai-gateway -am package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /src/backend/ai-gateway/target/ai-gateway-*.jar /app/app.jar
EXPOSE 8090
ENTRYPOINT ["java","-jar","/app/app.jar"]
