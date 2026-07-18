# Lesson 17 — Actuator, Metrics, and Logging

## Why observability matters

In production you cannot open a debugger. When something is slow or broken at 3 AM, you need the app to *tell you* what is happening: health status, metrics, logs. Seniors are expected to build apps that can be operated, not just apps that run.

## Actuator: ready-made inspection endpoints

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Endpoints appear under `/actuator`:

| Endpoint | Shows |
|---|---|
| `/actuator/health` | Is the app OK? (DB up? Redis up? Kafka up?) |
| `/actuator/metrics` | Numbers: request times, memory, GC, DB pool |
| `/actuator/info` | Version and build info |
| `/actuator/env` | All configuration values (sensitive!) |
| `/actuator/loggers` | View and CHANGE log levels at runtime |

Only `health` is exposed over HTTP by default. Expose selectively:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics, prometheus
  endpoint:
    health:
      show-details: when-authorized
```

**Security note:** never expose `env` or `heapdump` publicly — they leak secrets. Lock `/actuator/**` down in your `SecurityFilterChain` (allow `health` for the load balancer, require `ADMIN` for the rest).

## Health checks — plugged in automatically

`GET /actuator/health`:

```json
{
  "status": "UP",
  "components": {
    "db":    { "status": "UP" },
    "redis": { "status": "UP" },
    "kafka": { "status": "UP" }
  }
}
```

You wrote zero code for this — auto-configuration saw PostgreSQL, Redis, and Kafka and added checks. Kubernetes and load balancers call this endpoint to decide if your instance should receive traffic (`liveness` and `readiness` probes use `/actuator/health/liveness` and `/readiness`).

A custom check is one small class:

```java
@Component
public class TaskBacklogHealthIndicator implements HealthIndicator {

    private final TaskRepository repository;

    public TaskBacklogHealthIndicator(TaskRepository repository) {
        this.repository = repository;
    }

    @Override
    public Health health() {
        long open = repository.countByDone(false);
        return open < 10_000
                ? Health.up().withDetail("openTasks", open).build()
                : Health.down().withDetail("openTasks", open)
                        .withDetail("reason", "backlog too large").build();
    }
}
```

## Metrics with Micrometer

Spring Boot records metrics through **Micrometer** (a facade, like SLF4J but for metrics). Out of the box: HTTP request timings, JVM memory, GC, connection pools.

```
GET /actuator/metrics/http.server.requests
```

Your own metrics:

```java
@Service
public class TaskService {

    private final Counter tasksCreated;

    public TaskService(..., MeterRegistry registry) {
        this.tasksCreated = Counter.builder("taskhub.tasks.created")
                .description("Total tasks created")
                .register(registry);
    }

    public Task create(String title) {
        tasksCreated.increment();
        ...
    }
}
```

The standard production stack: add `micrometer-registry-prometheus`, expose `/actuator/prometheus`, let **Prometheus** scrape it, and draw dashboards in **Grafana**. Know these names — they appear in most job descriptions.

## Logging properly

Spring Boot uses SLF4J + Logback. Get a logger and use levels with intent:

```java
private static final Logger log = LoggerFactory.getLogger(TaskService.class);

log.debug("Looking up task {}", id);          // developer detail (dev only)
log.info("Task {} completed by {}", id, user); // normal business events
log.warn("Project {} near open-task limit: {}", pid, count); // needs attention soon
log.error("Failed to publish event for task {}", id, exception); // needs attention now
```

Rules that separate professionals from beginners:

1. **Use `{}` placeholders**, never string concatenation (placeholders cost nothing when the level is off).
2. **Pass the exception as the last argument** — you get the full stack trace. `log.error("failed: " + e)` throws the trace away.
3. **Never log secrets** — no passwords, no tokens, no full personal data.
4. **In production, log as JSON** (structured logging) so tools like Elasticsearch/Loki can search fields. Spring Boot: `logging.structured.format.console: ecs`.

Runtime log-level change — no restart needed (great during an incident):

```bash
curl -X POST http://localhost:8080/actuator/loggers/com.taskhub \
     -H "Content-Type: application/json" \
     -d '{"configuredLevel": "DEBUG"}'
```

## The three pillars (vocabulary for interviews)

- **Logs** — what happened, as text events.
- **Metrics** — numbers over time (request rate, latency, errors).
- **Traces** — the path of one request across services (tool: Micrometer Tracing + Zipkin/Tempo; becomes vital with microservices, next lesson).

## Interview corner

- **What is Actuator?** Production-ready endpoints for health, metrics, and management that Spring Boot adds for free.
- **How do Kubernetes probes connect to Spring Boot?** Liveness/readiness probes call the corresponding actuator health groups.
- **What is Micrometer?** A vendor-neutral metrics facade; Prometheus is the usual backend.
- **Why structured (JSON) logging?** Machines parse fields reliably; searching "all ERRORs for user X" becomes a query, not a grep adventure.

## Exercise

1. Add Actuator, expose health and metrics, and secure the rest.
2. Build the custom `HealthIndicator` above and force it DOWN (insert 10,001 open tasks with a loop or SQL). Watch `/actuator/health` change.
3. Add the `taskhub.tasks.created` counter and find it under `/actuator/metrics`.

---
Next: **Part 6, Lesson 18** — breaking the monolith: microservices.
