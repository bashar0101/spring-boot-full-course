# Lesson 03 — Beans and Dependency Injection

## Making a bean: @Component and friends

A **bean** is an object Spring creates and manages. The easiest way to make one: put an annotation on the class.

```java
@Component
public class TaskIdGenerator {
    public String next() {
        return java.util.UUID.randomUUID().toString();
    }
}
```

Spring has three "children" of `@Component`. They do the same thing, but the name tells readers (and some tools) what the class is for:

| Annotation | Use for |
|---|---|
| `@Service` | Business logic classes |
| `@Repository` | Database access classes (also translates DB exceptions) |
| `@RestController` | Web endpoint classes |

## Injecting a bean: use the constructor

We build the first real pieces of `taskhub`. For now, we store tasks in memory (a list). The database comes in lesson 07.

```java
// The model — a simple record
public record Task(String id, String title, boolean done) {}
```

```java
@Service
public class TaskService {

    private final TaskIdGenerator idGenerator;
    private final List<Task> tasks = new ArrayList<>();

    // Constructor injection: Spring sees the constructor needs a
    // TaskIdGenerator, finds that bean, and passes it in.
    public TaskService(TaskIdGenerator idGenerator) {
        this.idGenerator = idGenerator;
    }

    public Task create(String title) {
        Task task = new Task(idGenerator.next(), title, false);
        tasks.add(task);
        return task;
    }

    public List<Task> findAll() {
        return List.copyOf(tasks);
    }
}
```

```java
@RestController
public class TaskController {

    private final TaskService service;

    public TaskController(TaskService service) {
        this.service = service;
    }

    @GetMapping("/tasks")
    public List<Task> all() {
        return service.findAll();
    }
}
```

Run the app, open `http://localhost:8080/tasks` — you get `[]` (an empty JSON list). Spring turned your Java list into JSON automatically.

## Field injection: you will see it, do not copy it

```java
@Service
public class TaskService {
    @Autowired                        // <- works, but avoid it
    private TaskIdGenerator idGenerator;
}
```

Why constructor injection is better:

1. Fields can be `final` — the object is complete and safe after creation.
2. You can create the class in a test with `new TaskService(fakeGenerator)` — no Spring needed.
3. If a class asks for too many dependencies, a huge constructor makes the problem visible. That is a feature, not a bug.

Note: with one constructor, you do not need `@Autowired` at all. Spring uses it automatically.

## @Configuration and @Bean: for classes you do not own

`@Component` only works on *your* classes. What about a class from a library? Use a `@Bean` method:

```java
@Configuration
public class AppConfig {

    @Bean   // the return value becomes a bean
    public Clock clock() {
        return Clock.systemUTC();   // java.time.Clock — not our class,
    }                               // so we cannot annotate it
}
```

Now any class can inject `Clock` through its constructor.

## Bean scopes (short but interview-important)

By default, every bean is a **singleton**: Spring creates **one** instance and everyone shares it.

Because of this: **do not keep per-user state in fields of a bean.** Our `tasks` list is shared by all users — fine for a demo, wrong for real apps. The database will fix this properly.

Other scopes exist (`prototype` = new instance each time, `request` = one per HTTP request), but singleton covers 95% of real work.

## Interview corner

- **Difference between @Component and @Bean?** `@Component` goes on your own class; `@Bean` goes on a method in a `@Configuration` class and is used for third-party classes or objects that need setup logic.
- **Why constructor injection over field injection?** Final fields, easier tests, visible dependencies.
- **Default bean scope?** Singleton — one shared instance.
- **What if two beans of the same type exist?** Spring throws an error unless you mark one `@Primary` or select one with `@Qualifier("name")`.

## Exercise

1. Add a `POST /tasks` endpoint later? Not yet — for now, add a method `count()` in `TaskService` and an endpoint `GET /tasks/count` that returns it.
2. Create a second bean of type `TaskIdGenerator` using a `@Bean` method. Start the app. Read the error message carefully. Then fix it with `@Primary`.

---
Next: **Lesson 04** — configuration files, profiles, and why you never hardcode values.
