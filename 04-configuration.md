# Lesson 04 — Configuration and Profiles

## Why configuration files exist

Your app runs in different places: your laptop, a test server, production. Each place needs different values — database address, ports, secrets. These values must **not** live in Java code. They live in configuration files.

## application.properties vs application.yml

Both work. YAML is easier to read for nested settings. Delete `application.properties` and create `application.yml`:

```yaml
server:
  port: 8080

spring:
  application:
    name: taskhub

taskhub:
  greeting: "Hello from config!"
  max-open-tasks: 100
```

The `server` and `spring` parts are Spring's own settings. The `taskhub` part is **ours** — you can invent any keys you want.

## Reading one value: @Value

```java
@Service
public class GreetingService {

    private final String greeting;

    public GreetingService(@Value("${taskhub.greeting}") String greeting) {
        this.greeting = greeting;
    }
}
```

`@Value` is fine for one or two values. For groups of settings, there is a better way.

## Reading groups of values: @ConfigurationProperties

```java
@ConfigurationProperties(prefix = "taskhub")
public record TaskhubProperties(
        String greeting,
        int maxOpenTasks          // maps from max-open-tasks (kebab-case -> camelCase)
) {}
```

Enable it in your main class:

```java
@SpringBootApplication
@ConfigurationPropertiesScan   // finds all @ConfigurationProperties classes
public class TaskhubApplication { ... }
```

Now inject `TaskhubProperties` anywhere like a normal bean. Benefits over `@Value`: type-safe, all settings in one place, IDE auto-complete, easy to validate.

## Profiles: different settings per environment

A **profile** is a named set of configuration. Create files next to `application.yml`:

**application-dev.yml** (your laptop)
```yaml
taskhub:
  greeting: "Hi developer!"
logging:
  level:
    com.taskhub: DEBUG
```

**application-prod.yml** (production)
```yaml
server:
  port: 80
logging:
  level:
    com.taskhub: WARN
```

Choose the active profile:

```yaml
# in application.yml
spring:
  profiles:
    active: dev
```

Or better, from outside the app (no rebuild needed):

```bash
java -jar taskhub.jar --spring.profiles.active=prod
# or with an environment variable:
SPRING_PROFILES_ACTIVE=prod java -jar taskhub.jar
```

Rules: `application.yml` always loads first. The active profile's file loads after and **overrides** matching keys.

You can also make a bean exist only in one profile:

```java
@Service
@Profile("dev")
public class FakeEmailService implements EmailService { ... }

@Service
@Profile("prod")
public class RealEmailService implements EmailService { ... }
```

## Where values can come from (priority order)

Spring reads configuration from many places. Higher wins:

1. Command line arguments (`--server.port=9000`)
2. Environment variables (`SERVER_PORT=9000`)
3. Profile file (`application-prod.yml`)
4. Main file (`application.yml`)

This order is why Docker and cloud platforms work so well with Spring Boot: they inject environment variables, and those beat the files. **Secrets (passwords, API keys) should always come from environment variables, never from files in git.**

## Interview corner

- **How do profiles work?** Named configuration sets; the active profile's file overrides the base file; beans can be profile-specific with `@Profile`.
- **@Value vs @ConfigurationProperties?** `@Value` for single values; `@ConfigurationProperties` for grouped, type-safe settings.
- **Where should secrets live?** Environment variables or a secret manager — never in the repository.

## Exercise

1. Create `TaskhubProperties` with `greeting` and `maxOpenTasks`, and an endpoint `GET /config-demo` that returns the greeting.
2. Create a `test` profile with a different greeting. Start the app with the `test` profile from the command line and check the endpoint.

---
Next: **Lesson 05** — real REST endpoints: GET, POST, PUT, DELETE.
