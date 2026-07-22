# Lesson 15 — Caching with Redis

## Why cache?

Some data is read thousands of times but changes rarely (a project's details, a user profile). Hitting PostgreSQL every time is wasted work. A **cache** keeps recent answers in fast memory: first request computes and stores, later requests return the stored copy in microseconds.

**Redis** is the standard tool: an in-memory key-value store, running as a separate server, shared by all copies of your app. (A cache inside the Java process would give each app copy a different cache — inconsistent answers. That is why an external cache wins in real systems.)

## Setup

```bash
docker run --name taskhub-redis -p 6379:6379 -d redis:7
```

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-cache</artifactId>
</dependency>
```

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
  cache:
    type: redis
    redis:
      time-to-live: 10m     # entries die after 10 minutes
```

Turn caching on:

```java
@SpringBootApplication
@EnableCaching
public class TaskhubApplication { ... }
```

## The three annotations

```java
@Service
public class ProjectService {

    // 1. @Cacheable: check cache first. Hit -> return cached, method NOT run.
    //    Miss -> run method, store result under key "projects::5".
    @Cacheable(cacheNames = "projects", key = "#id")
    public ProjectResponse getById(Long id) {
        System.out.println("Hitting the database for project " + id);
        return projectRepository.findById(id)
                .map(ProjectResponse::from)
                .orElseThrow(() -> new ProjectNotFoundException(id));
    }

    // 2. @CachePut: always run the method, then UPDATE the cache with the result.
    @CachePut(cacheNames = "projects", key = "#id")
    @Transactional
    public ProjectResponse rename(Long id, String name) {
        Project p = projectRepository.findById(id)
                .orElseThrow(() -> new ProjectNotFoundException(id));
        p.setName(name);
        return ProjectResponse.from(p);
    }

    // 3. @CacheEvict: run the method, then DELETE the cache entry.
    @CacheEvict(cacheNames = "projects", key = "#id")
    @Transactional
    public void delete(Long id) {
        projectRepository.deleteById(id);
    }
}
```

Call `getById(5)` twice: the print appears **once**. The second call never touched your method or the database.

**Cache DTOs, not entities.** Entities carry lazy proxies that cannot be serialized to Redis sensibly. This is another reason DTOs (lesson 10) were the right move.

(One serialization step is needed: register a `RedisCacheConfiguration` bean with a JSON serializer, or make DTOs `Serializable`. The Spring docs snippet for `GenericJackson2JsonRedisSerializer` is the usual choice.)

## The hard part: stale data

Caching has one famous problem: the cache can hold an **old** answer after the data changed. Strategies:

1. **TTL (time-to-live).** Entries expire automatically (we set 10m). Simple, always have it as a safety net.
2. **Evict/update on write.** What `@CacheEvict`/`@CachePut` do — the moment data changes, fix the cache. Works only if *all* writes go through your annotated methods.
3. **Accept staleness.** For some data (view counters), being 1 minute old is fine. Decide per use case.

And the classic quote worth knowing: *"There are only two hard things in computer science: cache invalidation and naming things."* Interviewers love asking about exactly this trade-off.

## When NOT to cache

- Data that changes on almost every read (you pay cache costs, win nothing)
- Data where staleness is unacceptable (account balances)
- Before you have measured a problem — caching adds complexity and a new failure mode; do it when numbers justify it

Also know: `@Cacheable` uses the same proxy mechanism as `@Transactional`, so **self-invocation skips the cache** (lesson 09's trap applies here too).

## Peek inside Redis

```bash
docker exec -it taskhub-redis redis-cli
> KEYS *
1) "projects::5"
> TTL "projects::5"      # seconds left to live
(integer) 583
```

## Interview corner

- **How does @Cacheable work?** A proxy checks the cache by key before the method; hit skips the method, miss runs and stores it.
- **@CachePut vs @Cacheable?** `@CachePut` always executes and refreshes the entry; `@Cacheable` skips execution on a hit.
- **Why an external cache (Redis) instead of in-process?** Shared and consistent across all app instances; survives app restarts.
- **How do you keep cache and DB consistent?** Evict or update on every write path, plus a TTL as a safety net; accept the trade-offs.

## Exercise

1. Cache `getById` for projects, watch the log print only once, and check the key in `redis-cli`.
2. Rename the project through your API, then read it again — do you get the new name? Now remove `@CachePut`, repeat, and watch stale data appear. Put it back.
3. Set TTL to 30 seconds, and watch a stale entry heal itself.

---
Next: **Lesson 16** — events between systems with Kafka.
