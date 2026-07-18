# Lesson 20 — Docker, Deployment, and the Road to Senior

## Why Docker

"It works on my machine" dies here. A **container image** packs your app + Java + settings into one sealed box that runs identically on your laptop, a test server, and production. You have already *used* containers (PostgreSQL, Redis, Kafka). Now we put taskhub itself into one.

## A production-grade Dockerfile

```dockerfile
# ---- Stage 1: build (has Maven + JDK, thrown away afterwards) ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app

# copy pom first: Docker caches layers, so dependencies
# re-download ONLY when pom.xml changes — fast rebuilds
COPY pom.xml mvnw ./
COPY .mvn .mvn
RUN ./mvnw dependency:go-offline

COPY src src
RUN ./mvnw package -DskipTests

# ---- Stage 2: run (small JRE image, no build tools) ----
FROM eclipse-temurin:21-jre
WORKDIR /app

# never run as root inside a container
RUN useradd -r appuser
USER appuser

COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

Three habits shown here that reviewers look for: **multi-stage build** (final image has no JDK/Maven — smaller and safer), **dependency layer caching** (rebuilds take seconds), **non-root user**.

```bash
docker build -t taskhub:1.0 .
docker run -p 8080:8080 -e SPRING_PROFILES_ACTIVE=prod taskhub:1.0
```

Notice how lesson 04 pays off: environment variables override the yml files, so **one image runs in every environment** — only the injected config differs. Never bake secrets into images.

## docker-compose: the whole system with one command

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:17
    environment:
      POSTGRES_DB: taskhub
      POSTGRES_PASSWORD: ${DB_PASSWORD}     # from .env file (not in git!)
    volumes:
      - dbdata:/var/lib/postgresql/data     # data survives restarts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      retries: 10

  redis:
    image: redis:7

  kafka:
    image: apache/kafka:4.0.0

  app:
    build: .
    ports:
      - "8080:8080"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/taskhub   # "db" = service name!
      SPRING_DATASOURCE_PASSWORD: ${DB_PASSWORD}
      SPRING_DATA_REDIS_HOST: redis
      SPRING_KAFKA_BOOTSTRAP_SERVERS: kafka:9092
      TASKHUB_JWT_SECRET: ${JWT_SECRET}
    depends_on:
      db:
        condition: service_healthy          # wait until postgres answers

volumes:
  dbdata:
```

```bash
docker compose up --build     # entire system: app + db + redis + kafka
docker compose logs -f app    # follow the app logs
docker compose down           # stop everything
```

Key detail: inside the compose network, containers reach each other **by service name** (`db`, `redis`, `kafka`) — not `localhost`. This confuses everyone exactly once.

## What comes after compose (know the words)

- **Kubernetes (K8s)** — runs containers across many machines: restarts crashed ones, scales copies up/down, routes traffic. Your actuator health endpoints (lesson 17) become its liveness/readiness probes. Compose is for one machine; K8s is for fleets.
- **CI/CD** — a pipeline (GitHub Actions, GitLab CI) that on every push: runs tests → builds the image → pushes it to a registry → deploys. Senior expectation: you can write a basic pipeline yml.
- **Native images (GraalVM)** — Spring Boot can compile to a native binary: ~50ms startup, small memory. Trade-offs: long builds, reflection limits. Good to mention, not required to master.

## You made it. The road to senior from here

The 20 lessons gave you the *knowledge*. Seniority is knowledge + judgment + repetitions. The gap is closed by doing:

**1. Finish taskhub completely.** Every exercise, all services, compose file, tests green. This *is* a portfolio project — push it to GitHub with a good README.

**2. Learn the missing production pieces** (in this order): Flyway migrations (replace `ddl-auto` — a day of work, big interview value), OpenAPI/Swagger documentation (`springdoc-openapi` — an hour), a basic GitHub Actions pipeline, then the outbox pattern from lesson 16 — implementing it puts you ahead of most candidates.

**3. Practice the interview drawings.** The five diagrams you must draw fluently: the three-layer architecture, the JWT login flow, the microservice map of taskhub, circuit breaker states, and the saga/outbox event flow. All five are in these lessons.

**4. Read real code.** Pick one well-known open Spring project and read it (e.g. Spring Petclinic first, then something bigger). Reading code you did not write is the most senior skill of all.

**5. Depth beats breadth from now on.** You know the map. When a topic comes up at work — say, JPA locking or Kafka partitioning — go one level deeper than needed. Two years of that habit is what "senior" actually means.

## Final interview corner

- **Why multi-stage Docker builds?** Small final image, no build tools in production, better caching and security.
- **How does the same image run in dev and prod?** Configuration comes from the environment (12-factor principle), not from the image.
- **Compose vs Kubernetes?** One host and simplicity vs orchestration: self-healing, scaling, rolling deployments across a cluster.
- **How do containers find each other in compose?** Built-in DNS: service names resolve to container addresses.

## Last exercise

1. Write the Dockerfile and compose file; run the full system with one command; run your Testcontainers suite against it.
2. Push taskhub to GitHub with a README containing your architecture drawing.
3. Add Flyway. You will never miss `ddl-auto: update`.

---
**The end — and the beginning.** Re-do any lesson that felt foggy; the second pass is where it sticks.
