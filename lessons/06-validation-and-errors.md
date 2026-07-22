# Lesson 06 — Validation and Error Handling

## The problem

Right now, a client can send `{"title": ""}` or even `{}` and we happily save garbage. Also, when something goes wrong, Spring returns an ugly default error. Real APIs validate input and return clean, consistent errors.

## Step 1: Add the validation starter

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>
```

## Step 2: Put rules on the request object

```java
import jakarta.validation.constraints.*;

public record TaskRequest(

        @NotBlank(message = "title must not be empty")
        @Size(max = 200, message = "title must be at most 200 characters")
        String title,

        boolean done
) {}
```

Common rules:

| Annotation | Checks |
|---|---|
| `@NotNull` | value is not null |
| `@NotBlank` | string is not null and not only spaces |
| `@Size(min, max)` | string/collection length |
| `@Min` / `@Max` | number range |
| `@Email` | looks like an email |
| `@Pattern(regexp)` | matches a regular expression |

## Step 3: Turn validation on with @Valid

```java
@PostMapping
public ResponseEntity<Task> create(@Valid @RequestBody TaskRequest request) {
    ...
}
```

Without `@Valid`, the rules are just decoration — nothing checks them. With it, a bad request never reaches your method: Spring throws `MethodArgumentNotValidException` first.

## Step 4: One place for all errors — @ControllerAdvice

Instead of try/catch in every controller, we define global error handling once.

First, our own exception for "not found":

```java
public class TaskNotFoundException extends RuntimeException {
    public TaskNotFoundException(String id) {
        super("Task not found: " + id);
    }
}
```

A clean error response shape (same shape for *every* error — clients love this):

```java
public record ApiError(
        int status,
        String message,
        Map<String, String> fieldErrors,   // filled for validation errors
        Instant timestamp
) {
    public static ApiError of(int status, String message) {
        return new ApiError(status, message, Map.of(), Instant.now());
    }
}
```

The global handler:

```java
@RestControllerAdvice     // applies to all controllers
public class GlobalExceptionHandler {

    // our "not found" -> 404
    @ExceptionHandler(TaskNotFoundException.class)
    public ResponseEntity<ApiError> notFound(TaskNotFoundException ex) {
        return ResponseEntity.status(404)
                .body(ApiError.of(404, ex.getMessage()));
    }

    // validation failure -> 400 with field details
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> invalid(MethodArgumentNotValidException ex) {
        Map<String, String> fields = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
          .forEach(err -> fields.put(err.getField(), err.getDefaultMessage()));

        return ResponseEntity.badRequest()
                .body(new ApiError(400, "Validation failed", fields, Instant.now()));
    }

    // everything else -> 500, and LOG it (never show internals to clients)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> unknown(Exception ex) {
        // log the full exception here for yourself
        return ResponseEntity.internalServerError()
                .body(ApiError.of(500, "Something went wrong"));
    }
}
```

## Step 5: Simplify the controller

Now the service can throw, and the controller gets shorter:

```java
// in TaskService
public Task getById(String id) {
    Task task = tasks.get(id);
    if (task == null) throw new TaskNotFoundException(id);
    return task;
}
```

```java
// in TaskController — no more Optional juggling
@GetMapping("/{id}")
public Task one(@PathVariable String id) {
    return service.getById(id);
}
```

The exception flies up, `@RestControllerAdvice` catches it, the client gets a clean 404. This pattern — *services throw, one global handler answers* — is how production Spring apps are built.

## Test it

```bash
curl -i -X POST http://localhost:8080/api/tasks \
     -H "Content-Type: application/json" \
     -d '{"title": ""}'
```

```json
{
  "status": 400,
  "message": "Validation failed",
  "fieldErrors": { "title": "title must not be empty" },
  "timestamp": "2026-07-18T10:00:00Z"
}
```

## Interview corner

- **How does validation work in Spring?** Jakarta Bean Validation annotations on the model + `@Valid` on the parameter; failures throw before your method runs.
- **What is @ControllerAdvice?** A global interceptor for exceptions (and more) across all controllers; `@RestControllerAdvice` returns JSON bodies.
- **Why not show exception details to clients?** Security — stack traces reveal your internals. Log details server-side, return a generic message.

## Exercise

1. Add a rule: `title` must not start with a space. (Hint: `@Pattern`.)
2. Make `PUT` and `DELETE` use `TaskNotFoundException` too, and remove the `ResponseEntity.notFound()` code from the controller.

---
Next: **Lesson 07** — a real database with Spring Data JPA and PostgreSQL.
