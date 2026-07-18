# Lesson 05 — REST Basics: The Full CRUD

## The plan

`taskhub` gets a complete task API (still in memory — database next part):

| Method | Path | Meaning | Success status |
|---|---|---|---|
| GET | /api/tasks | List all tasks | 200 OK |
| GET | /api/tasks/{id} | One task | 200 OK (404 if missing) |
| POST | /api/tasks | Create a task | 201 Created |
| PUT | /api/tasks/{id} | Update a task | 200 OK |
| DELETE | /api/tasks/{id} | Delete a task | 204 No Content |

This table *is* REST in practice: URLs name **things** (tasks), HTTP methods name **actions**, status codes tell the result.

## The service (updated)

```java
@Service
public class TaskService {

    private final Map<String, Task> tasks = new ConcurrentHashMap<>();
    private final TaskIdGenerator idGenerator;

    public TaskService(TaskIdGenerator idGenerator) {
        this.idGenerator = idGenerator;
    }

    public List<Task> findAll() {
        return List.copyOf(tasks.values());
    }

    public Optional<Task> findById(String id) {
        return Optional.ofNullable(tasks.get(id));
    }

    public Task create(String title) {
        Task task = new Task(idGenerator.next(), title, false);
        tasks.put(task.id(), task);
        return task;
    }

    public Optional<Task> update(String id, String title, boolean done) {
        if (!tasks.containsKey(id)) return Optional.empty();
        Task updated = new Task(id, title, done);
        tasks.put(id, updated);
        return Optional.of(updated);
    }

    public boolean delete(String id) {
        return tasks.remove(id) != null;
    }
}
```

## The controller

```java
// A request body class: what the client sends us
public record TaskRequest(String title, boolean done) {}
```

```java
@RestController
@RequestMapping("/api/tasks")          // shared prefix for all methods
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    @GetMapping
    public List<Task> all() {
        return service.findAll();
    }

    @GetMapping("/{id}")               // {id} is a path variable
    public ResponseEntity<Task> one(@PathVariable String id) {
        return service.findById(id)
                .map(ResponseEntity::ok)                       // 200 + task
                .orElse(ResponseEntity.notFound().build());    // 404
    }

    @PostMapping
    public ResponseEntity<Task> create(@RequestBody TaskRequest request) {
        Task task = service.create(request.title());
        // 201 Created + Location header pointing to the new task
        return ResponseEntity
                .created(URI.create("/api/tasks/" + task.id()))
                .body(task);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> update(@PathVariable String id,
                                       @RequestBody TaskRequest request) {
        return service.update(id, request.title(), request.done())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        return service.delete(id)
                ? ResponseEntity.noContent().build()   // 204
                : ResponseEntity.notFound().build();   // 404
    }
}
```

## The annotations, one by one

| Annotation | Meaning |
|---|---|
| `@RequestMapping("/api/tasks")` | Prefix for all endpoints in the class |
| `@PathVariable` | Take a value from the URL path (`/tasks/abc` → `id = "abc"`) |
| `@RequestBody` | Turn the JSON body into a Java object (Jackson does this) |
| `@RequestParam` | Take a value from the query string (`/tasks?done=true`) |
| `ResponseEntity` | Full control: status code, headers, and body |

Query parameter example:

```java
@GetMapping(params = "done")   // used when ?done=... is present
public List<Task> byStatus(@RequestParam boolean done) {
    return service.findAll().stream()
            .filter(t -> t.done() == done)
            .toList();
}
```

## Try it with curl

```bash
# create
curl -X POST http://localhost:8080/api/tasks \
     -H "Content-Type: application/json" \
     -d '{"title": "Learn Spring Boot", "done": false}'

# list
curl http://localhost:8080/api/tasks

# get one (use a real id from the list)
curl http://localhost:8080/api/tasks/<id>

# update
curl -X PUT http://localhost:8080/api/tasks/<id> \
     -H "Content-Type: application/json" \
     -d '{"title": "Learn Spring Boot", "done": true}'

# delete
curl -X DELETE -i http://localhost:8080/api/tasks/<id>
```

## Status codes you must know

| Code | Meaning | When |
|---|---|---|
| 200 | OK | Successful GET/PUT |
| 201 | Created | Successful POST that made something |
| 204 | No Content | Success, nothing to return (DELETE) |
| 400 | Bad Request | Client sent bad data (lesson 06) |
| 401 | Unauthorized | Not logged in (lesson 11) |
| 403 | Forbidden | Logged in but not allowed (lesson 12) |
| 404 | Not Found | The thing does not exist |
| 500 | Internal Server Error | Your code crashed |

## Interview corner

- **PUT vs POST?** POST creates (server picks the id, not repeat-safe). PUT replaces at a known id (repeat-safe — running it twice gives the same result; this property is called *idempotent*).
- **@RestController vs @Controller?** `@RestController` = `@Controller` + `@ResponseBody`: return values become the response body (JSON), not the name of an HTML view.
- **@PathVariable vs @RequestParam?** Path = identity of the thing (`/tasks/5`). Param = options like filters and sorting (`?done=true&page=2`).

## Exercise

1. Add `PATCH /api/tasks/{id}/done` that only flips the task to done.
2. What status code should it return if the task does not exist? Make it so.
3. Test everything with curl or Postman.

---
Next: **Part 2, Lesson 06** — validation and clean error handling.
