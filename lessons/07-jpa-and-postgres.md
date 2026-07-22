# Lesson 07 — Databases with Spring Data JPA

## The idea

Writing SQL by hand for every save and load is repetitive. **JPA** (Jakarta Persistence API) maps Java classes to database tables. **Hibernate** is the library that implements JPA. **Spring Data JPA** sits on top and removes even more code: you write an interface, Spring writes the implementation.

Layers, top to bottom: `Spring Data JPA → JPA (the standard) → Hibernate (the worker) → JDBC → PostgreSQL`.

## Step 1: Dependencies and database

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
```

Start PostgreSQL with Docker (one command, no installation):

```bash
docker run --name taskhub-db -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=taskhub -p 5432:5432 -d postgres:17
```

Configure the connection in `application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/taskhub
    username: postgres
    password: secret          # in real life: environment variable!
  jpa:
    hibernate:
      ddl-auto: update        # dev only: create/update tables from entities
    show-sql: true            # dev only: print SQL to console
```

`ddl-auto` values worth knowing: `update` (adjust tables to match entities — fine for learning), `validate` (only check, change nothing — good for production), `create-drop` (fresh tables each start — good for tests). Production teams use migration tools (Flyway/Liquibase) instead of `update`.

## Step 2: The entity

Our `Task` record becomes a JPA **entity** — a class mapped to a table. JPA needs a no-args constructor and setters, so entities are normal classes, not records.

```java
@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)  // DB assigns the id
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false)
    private boolean done;

    private Instant createdAt;

    protected Task() {}            // JPA needs this; protected keeps it hidden

    public Task(String title) {
        this.title = title;
        this.done = false;
        this.createdAt = Instant.now();
    }

    // getters and setters ...
}
```

## Step 3: The repository — an interface, no implementation

```java
public interface TaskRepository extends JpaRepository<Task, Long> {
}
```

That is the whole file. By extending `JpaRepository<Task, Long>` (entity type, id type) you get for free:

`save(task)`, `findById(id)`, `findAll()`, `deleteById(id)`, `count()`, `existsById(id)` — and many more. Spring generates the implementation at startup.

## Step 4: Derived queries — method names become SQL

Spring Data reads your method **name** and writes the query for you:

```java
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByDone(boolean done);
    List<Task> findByTitleContainingIgnoreCase(String part);
    long countByDone(boolean done);
    boolean existsByTitle(String title);
}
```

`findByDone(true)` becomes `SELECT * FROM tasks WHERE done = true`. No SQL written by you.

## Step 5: Rewire the service

```java
@Service
public class TaskService {

    private final TaskRepository repository;

    public TaskService(TaskRepository repository) {
        this.repository = repository;
    }

    public Task create(String title) {
        return repository.save(new Task(title));
    }

    public List<Task> findAll() {
        return repository.findAll();
    }

    public Task getById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new TaskNotFoundException(id.toString()));
    }

    public Task update(Long id, String title, boolean done) {
        Task task = getById(id);
        task.setTitle(title);
        task.setDone(done);
        return repository.save(task);
    }

    public void delete(Long id) {
        if (!repository.existsById(id)) {
            throw new TaskNotFoundException(id.toString());
        }
        repository.deleteById(id);
    }
}
```

Note the id changed from `String` to `Long` — update the controller too (`@PathVariable Long id`).

Restart the app, POST a task, then restart again: **the task is still there.** Your data now survives restarts. Delete the in-memory map and the `TaskIdGenerator` — the database does both jobs now.

## Interview corner

- **JPA vs Hibernate vs Spring Data JPA?** JPA is the standard (interfaces/annotations). Hibernate implements it. Spring Data JPA generates repositories on top.
- **What does @GeneratedValue(IDENTITY) do?** The database assigns the id on insert.
- **Why is `ddl-auto: update` bad for production?** It can change your schema in surprising ways and cannot handle all changes. Use `validate` plus Flyway/Liquibase migrations.
- **What is a derived query?** A query Spring builds from the repository method name, like `findByDone`.

## Exercise

1. Add a `GET /api/tasks?search=word` endpoint using `findByTitleContainingIgnoreCase`.
2. Set `ddl-auto: validate`, restart, and read the error you get after adding a new field to the entity. Understand it, then set it back to `update`.

---
Next: **Lesson 08** — relations between entities, paging, and sorting.
