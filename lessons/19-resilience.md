# Lesson 19 — Resilience: Surviving Failure

## The new reality

In a monolith, a method call never "half-works". In microservices, every Feign call crosses the network, and networks fail: slow answers, timeouts, dead services. Worse, failures **spread**: if user-service hangs, every task-service thread waiting on it hangs too, until task-service itself dies. This chain reaction is called a **cascading failure** — the thing that turns one sick service into a dead platform.

Resilience patterns are the immune system. The standard library: **Resilience4j**.

```xml
<dependency>
    <groupId>io.github.resilience4j</groupId>
    <artifactId>resilience4j-spring-boot3</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

## Pattern 1: Timeouts — never wait forever

The most basic protection, and the most forgotten. Every remote call needs a time limit:

```yaml
# Feign client timeouts
spring:
  cloud:
    openfeign:
      client:
        config:
          user-service:
            connect-timeout: 1000    # ms to establish connection
            read-timeout: 2000       # ms to wait for the answer
```

No timeout = a hung dependency can hold your threads hostage indefinitely.

## Pattern 2: Retry — for short hiccups

Some failures heal in milliseconds (a dropped packet, a restarting pod). Retrying once or twice fixes them invisibly:

```java
@Retry(name = "userService")
public UserDto getOwner(Long id) {
    return userClient.getUser(id);
}
```

```yaml
resilience4j:
  retry:
    instances:
      userService:
        max-attempts: 3
        wait-duration: 200ms
        enable-exponential-backoff: true    # 200ms, 400ms, 800ms...
```

Two rules seniors know:

1. **Only retry safe (idempotent) operations.** Retrying a GET is fine. Retrying a "charge credit card" POST can charge twice.
2. **Use exponential backoff.** Instant retries from a thousand clients can finish off a struggling service — a retry storm.

## Pattern 3: Circuit Breaker — stop kicking a dead service

If user-service is *down* (not hiccuping), retrying makes things worse. A **circuit breaker** watches the failure rate and reacts like an electrical fuse:

```
CLOSED  --too many failures-->  OPEN  --after wait time-->  HALF_OPEN
(normal:                        (fail instantly,            (let a few test
 calls go through,               do NOT call the             calls through;
 failures counted)               sick service)               success -> CLOSED
                                                             failure -> OPEN)
```

While OPEN, callers fail in microseconds instead of waiting for timeouts — threads stay free, the cascade is broken, and the sick service gets quiet time to recover.

```java
@CircuitBreaker(name = "userService", fallbackMethod = "ownerFallback")
public UserDto getOwner(Long id) {
    return userClient.getUser(id);
}

// same signature + exception parameter
private UserDto ownerFallback(Long id, Throwable ex) {
    return UserDto.unknown(id);    // degraded but alive: "owner unavailable"
}
```

```yaml
resilience4j:
  circuitbreaker:
    instances:
      userService:
        sliding-window-size: 10             # judge on the last 10 calls
        failure-rate-threshold: 50          # >50% failed -> OPEN
        wait-duration-in-open-state: 10s
        permitted-number-of-calls-in-half-open-state: 3
```

## Pattern 4: Fallbacks — degrade, do not die

The fallback above is a design decision, not just error handling: *task details without the owner's name are better than no task details at all.* Think per call: What can I show from cache? What default is acceptable? What must hard-fail (payments)? Products that keep working "in reduced mode" are what users experience as reliable.

## Pattern 5: Bulkhead — one leak must not sink the ship

Limit how many concurrent calls may go to one dependency:

```yaml
resilience4j:
  bulkhead:
    instances:
      userService:
        max-concurrent-calls: 20
```

If user-service slows down, at most 20 threads are stuck with it — the rest of task-service keeps serving requests that do not need users. (Named after ship compartments that contain flooding.)

## Combining them (typical production setup)

Order for one remote call: **Timeout** (always) → **Retry** (only idempotent, with backoff) → **Circuit breaker** (with fallback) → **Bulkhead** (limit blast radius). Resilience4j lets you stack the annotations on one method.

Watch it live: circuit breaker states appear in `/actuator/health` and metrics (lesson 17) — in production you alert on breakers going OPEN.

## Interview corner

- **Explain the circuit breaker states.** CLOSED (normal, counting failures), OPEN (instant fail, no calls), HALF_OPEN (probing recovery). Draw it.
- **Why is retry dangerous?** Non-idempotent duplication and retry storms; mitigate with backoff, jitter, and retry budgets.
- **What is a cascading failure?** One slow service exhausts its callers' threads, which exhausts *their* callers — patterns above break the chain.
- **Circuit breaker vs bulkhead?** Breaker reacts to failure rate over time; bulkhead caps concurrent exposure regardless of health.

## Exercise

1. Add timeout + retry + circuit breaker to the Feign call from lesson 18.
2. Kill user-service. Call task details 15 times. Watch: first timeouts/retries, then instant fallbacks (breaker OPEN). Check `/actuator/health`.
3. Restart user-service, wait 10 seconds, call again — watch the breaker close itself.

---
Next: **Lesson 20** — Docker, docker-compose, and the road to senior.
