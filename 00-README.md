# Spring Boot: From Zero to Senior

A 21-lesson series. Simple English. Real code. One project that grows with you.

## The project we build

A **Task Manager API** called `taskhub`. It starts as one small app. By the end it becomes a secure, tested, cached, message-driven system running in Docker. Every lesson adds one real piece to it.

## Versions used

- **Spring Boot 4.1** (current stable, June 2026)
- **Java 17+** (Java 21 recommended)
- Most code also works on Spring Boot 3.x. When something is different, the lesson says so.

## The path

### Part 1 — Foundations
| # | Lesson | You learn |
|---|--------|-----------|
| 01 | What is Spring Boot? | The problem it solves, IoC, Dependency Injection |
| 02 | Your first project | Spring Initializr, project structure, run the app |
| 03 | Beans and injection | @Component, @Bean, constructor injection |
| 04 | Configuration | application.yml, profiles, @ConfigurationProperties |
| 05 | REST basics | Controllers, GET/POST/PUT/DELETE, ResponseEntity |

### Part 2 — Real APIs
| # | Lesson | You learn |
|---|--------|-----------|
| 06 | Validation and errors | @Valid, @ControllerAdvice, clean error responses |
| 07 | Databases with JPA | Entities, repositories, PostgreSQL |
| 08 | Relations and queries | @OneToMany, custom queries, paging, sorting |
| 09 | Services and transactions | Service layer, @Transactional |
| 10 | DTOs and clean structure | Why DTOs, mapping, package layout |

### Part 3 — Security
| # | Lesson | You learn |
|---|--------|-----------|
| 11 | Spring Security basics | The filter chain, users, password hashing |
| 12 | JWT authentication | Tokens, login endpoint, roles |

### Part 4 — Testing
| # | Lesson | You learn |
|---|--------|-----------|
| 13 | Unit testing | JUnit 5, Mockito, testing services |
| 14 | Integration testing | MockMvc, @SpringBootTest, Testcontainers |

### Part 5 — Advanced tools
| # | Lesson | You learn |
|---|--------|-----------|
| 15 | Caching with Redis | @Cacheable, cache eviction, TTL |
| 16 | Messaging with Kafka | Producers, consumers, events between services |
| 17 | Actuator and monitoring | Health checks, metrics, logs |

### Part 6 — Microservices and deployment
| # | Lesson | You learn |
|---|--------|-----------|
| 18 | Microservices | Splitting the app, gateway, service discovery, Feign |
| 19 | Resilience | Circuit breakers, retries, timeouts |
| 20 | Docker and deployment | Dockerfile, docker-compose, the road to senior |

### Part 7 — Automation
| # | Lesson | You learn |
|---|--------|-----------|
| 21 | GitHub Actions and CI/CD | Workflows, build and test pipelines, automated deploys |

## How to study

1. **One lesson per sitting.** Do not rush. Two or three lessons per week is a good speed.
2. **Type the code yourself.** Do not copy-paste. Your fingers help your brain remember.
3. **Do the exercise at the end of each lesson.** It is short but important.
4. **Break things on purpose.** Delete an annotation and read the error. Errors teach you the most.

## What you need installed

- Java 21 (from [Adoptium](https://adoptium.net))
- IntelliJ IDEA Community (free) or VS Code with Java extensions
- Docker Desktop (needed from lesson 7 onward)
- A tool to send HTTP requests: Postman, or `curl`
