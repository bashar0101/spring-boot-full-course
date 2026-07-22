# Lesson 10 — DTOs and Clean Project Structure

## The problem with returning entities

Until now our controllers return `Task` — the JPA entity — directly. Three real dangers:

1. **You leak your database schema.** Every internal field goes to the client. Add a secret field later? It leaks automatically.
2. **Lazy-loading crashes.** JSON serialization touches `task.getProject()` outside a transaction → `LazyInitializationException` (a famous error — you will meet it).
3. **You cannot change the DB without breaking clients.** The entity is now your public API contract, by accident.

The fix: **DTOs** (Data Transfer Objects) — separate classes for what goes in and out of the API.

## In and out DTOs

Java records are perfect for DTOs:

```java
// what the client sends
public record CreateTaskRequest(
        @NotBlank @Size(max = 200) String title,
        Long projectId
) {}

// what the client receives
public record TaskResponse(
        Long id,
        String title,
        boolean done,
        Long projectId,
        Instant createdAt
) {
    // a factory method is the simplest mapper
    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.isDone(),
                task.getProject() != null ? task.getProject().getId() : null,
                task.getCreatedAt()
        );
    }
}
```

The controller now speaks only DTOs:

```java
@PostMapping
public ResponseEntity<TaskResponse> create(@Valid @RequestBody CreateTaskRequest req) {
    Task task = service.createInProject(req.projectId(), req.title());
    return ResponseEntity
            .created(URI.create("/api/tasks/" + task.getId()))
            .body(TaskResponse.from(task));
}

@GetMapping
public Page<TaskResponse> all(Pageable pageable) {
    return service.findAll(pageable).map(TaskResponse::from);  // Page has map()!
}
```

Rule of thumb: **entities never cross the controller line.** Requests come in as DTOs, responses go out as DTOs.

## Mapping options

- **Static factory methods** (what we did): zero magic, easy to debug. Best for small/medium projects.
- **MapStruct**: generates mappers at compile time from an interface. Popular in big companies — worth learning before interviews, not before you understand manual mapping.
- Avoid reflection-based mappers (runtime magic, slow, hides errors).

## Package structure: by feature, not by layer

Two common styles:

```
BY LAYER (avoid)                 BY FEATURE (prefer)
com.taskhub/                     com.taskhub/
├── controllers/                 ├── task/
│   ├── TaskController           │   ├── Task.java
│   └── ProjectController        │   ├── TaskController.java
├── services/                    │   ├── TaskService.java
│   ├── TaskService              │   ├── TaskRepository.java
│   └── ProjectService           │   └── dto/...
├── repositories/                ├── project/
└── entities/                    │   └── (same idea)
                                 └── common/
                                     ├── ApiError.java
                                     └── GlobalExceptionHandler.java
```

Why by feature wins: everything about tasks sits together; deleting or extracting a feature is easy (this matters for microservices later, lesson 18); you can make classes package-private so features cannot reach into each other's internals.

## Checkpoint: what taskhub looks like now

- Full CRUD for tasks and projects, backed by PostgreSQL
- Validation on all inputs, one global error handler, one error shape
- Business rules and transactions in the service layer
- DTOs in and out, feature-based packages

This is a solid, professional single-service API. Everything from here on builds on it.

## Interview corner

- **Why DTOs instead of entities in controllers?** Hide internal schema, avoid lazy-loading crashes, keep the API contract stable while the DB evolves.
- **What is LazyInitializationException?** Accessing a lazy relation after the transaction/session is closed — often triggered by JSON serialization of entities.
- **Package by feature or by layer?** By feature: better cohesion, easier extraction, allows package-private encapsulation.

## Exercise

1. Convert all remaining endpoints (projects too) to DTOs.
2. Reorganize your packages by feature as shown.
3. Try making `TaskRepository` package-private (remove `public`). Does everything still compile? What does that tell you?

---
Next: **Part 3, Lesson 11** — Spring Security: locking the doors.
