# Lesson 18 — Microservices

## First, the honest truth

Microservices are **not** an upgrade from a monolith. They are a trade: you gain independent deployment and scaling, you pay with network failures, distributed data, and much harder debugging. Many companies run excellent modular monoliths. A senior knows *when* to split, not just *how*. The best reason to split: **separate teams need to deploy separately.** The worst reason: "microservices are modern."

That said, most large companies use them, so you must master them.

## Splitting taskhub

Our feature-based packages (lesson 10) now pay off — the seams already exist:

```
BEFORE (one app)                AFTER (three services)
taskhub                         task-service      (tasks + projects, own DB)
├── task/                       user-service      (users, auth, issues JWTs)
├── project/                    notification-service (listens to Kafka, sends mail)
├── user/
└── notification/               + api-gateway     (single entry door)
```

**Golden rule: one service, one database.** Services never touch each other's tables. They talk only through APIs (REST) or events (Kafka). Shared databases secretly glue services back together — the worst of both worlds.

## Problem 1: who lives where? Service discovery

Services run on changing addresses (containers come and go). Hardcoding `http://localhost:8081` breaks immediately. A **service registry** fixes this: every service registers its address under a name; others look the name up.

Classic Spring stack — **Eureka**:

```xml
<!-- in the registry app -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-server</artifactId>
</dependency>
```

```java
@SpringBootApplication
@EnableEurekaServer
public class RegistryApplication { ... }
```

Each service registers itself:

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-eureka-client</artifactId>
</dependency>
```

```yaml
spring:
  application:
    name: task-service          # this is the name others look up
eureka:
  client:
    service-url:
      defaultZone: http://localhost:8761/eureka
```

Reality note: on Kubernetes, the platform provides discovery via DNS and Eureka is often unnecessary. Learn Eureka for interviews and non-K8s setups; know that K8s replaces it.

## Problem 2: calling another service — OpenFeign

`task-service` needs user info from `user-service`. **OpenFeign** turns HTTP calls into an interface — you declare it, Spring implements it (same trick as Spring Data repositories):

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
</dependency>
```

```java
@SpringBootApplication
@EnableFeignClients
public class TaskServiceApplication { ... }
```

```java
@FeignClient(name = "user-service")     // resolved through Eureka by name
public interface UserClient {

    @GetMapping("/api/users/{id}")
    UserDto getUser(@PathVariable("id") Long id);
}
```

```java
@Service
public class TaskService {
    private final UserClient userClient;
    ...
    public TaskDetails detailsWithOwner(Long taskId) {
        Task task = getById(taskId);
        UserDto owner = userClient.getUser(task.getOwnerId());  // network call!
        return TaskDetails.of(task, owner);
    }
}
```

That innocent-looking line is a network call that can fail or hang — lesson 19 deals with that.

## Problem 3: one front door — API Gateway

Clients should not know about your internal services. A **gateway** is the single public entry: it routes requests, and it is the perfect place for cross-cutting work (JWT checking, rate limiting, CORS).

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway-server-webflux</artifactId>
</dependency>
```

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: tasks
          uri: lb://task-service        # lb:// = look up in Eureka, load-balance
          predicates:
            - Path=/api/tasks/**, /api/projects/**
        - id: users
          uri: lb://user-service
          predicates:
            - Path=/api/users/**, /api/auth/**
```

Flow: client → gateway (checks JWT) → task-service → (Feign) → user-service. Meanwhile notification-service consumes Kafka events, fully decoupled — exactly why we introduced events in lesson 16.

## Problem 4: same config everywhere — Config Server

Ten services, each with its own yml, and one shared value changes? **Spring Cloud Config Server** serves configuration from a central git repository; services fetch their config at startup by application name. Know it exists and why; setup is mechanical.

## Data across services (the interview favorite)

No shared DB means no cross-service JOIN and **no cross-service transaction**. Instead:

- **A service owns its data and publishes events** when it changes (`UserRenamedEvent` → task-service updates its local copy of the username).
- Long business processes spanning services use the **saga pattern**: a chain of local transactions with compensating actions on failure (e.g., order → payment fails → publish event that cancels the order). Say the word "saga" in an interview and be able to draw this.
- **Eventual consistency**: copies are briefly out of date and that is accepted. Fighting this with distributed locks is a beginner move.

## Interview corner

- **When should you NOT use microservices?** Small team, one deployable unit is fine, no independent scaling needs — a modular monolith is simpler and faster to build.
- **How do services find each other?** Service registry (Eureka/Consul) or platform DNS on Kubernetes.
- **How do you handle a transaction across two services?** You do not — sagas with compensating actions, driven by events.
- **What belongs in an API gateway?** Routing, authentication, rate limiting, CORS — nothing business-specific.

## Exercise

1. On paper (really): draw taskhub as the four boxes above with arrows for every call and event. This drawing is a standard interview exercise.
2. Extract `user-service` into its own Spring Boot project with its own database and move `/api/auth/**` there.
3. Add a gateway that routes to both services. Log in through the gateway, create a task through the gateway.

---
Next: **Lesson 19** — what happens when a service is down: resilience.
