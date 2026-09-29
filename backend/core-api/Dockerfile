FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /src
COPY backend/pom.xml backend/pom.xml
COPY backend/common backend/common
COPY backend/testkit backend/testkit
COPY backend/core-api backend/core-api
COPY backend/ai-gateway/pom.xml backend/ai-gateway/pom.xml
COPY db/migrations db/migrations
WORKDIR /src/backend
RUN mvn -q -pl core-api -am package -DskipTests

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /src/backend/core-api/target/core-api-*.jar /app/app.jar
COPY db/migrations /migrations
ENV STUDYLOOP_MIGRATIONS=/migrations
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
