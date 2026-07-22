# Lesson 09 — The Service Layer and Transactions

## Why three layers?

```
Controller  ->  Service  ->  Repository
 (HTTP)        (business       (database)
                 rules)
```

Each layer has ONE job:

- **Controller:** speak HTTP. Read requests, return responses, nothing else. No business rules here.
- **Service:** the brain. Rules, decisions, combining repositories. Knows nothing about HTTP.
- **Repository:** load and save. No rules.

Test for a healthy controller: could you reuse the service from a scheduled job or a Kafka listener without changes? If yes, your layers are right.

## A real business rule

New requirement: *a project can have at most 100 open tasks.* This is a business rule — it belongs in the service:

```java
@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;

    public TaskService(TaskRepository taskRepository,
                       ProjectRepository projectRepository) {
        this.taskRepository = taskRepository;
        this.projectRepository = projectRepository;
    }

    public Task createInProject(Long projectId, String title) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        long open = taskRepository.countByProjectIdAndDone(projectId, false);
        if (open >= 100) {
            throw new TooManyOpenTasksException(projectId);
        }

        Task task = new Task(title);
        task.setProject(project);
        return taskRepository.save(task);
    }
}
```

Add a handler for `TooManyOpenTasksException` in your `GlobalExceptionHandler` returning **409 Conflict**.

## Transactions: all or nothing

New requirement: *when a project is archived, close all its open tasks and mark the project archived.* Two changes — they must **both** happen, or **neither**. If the app crashes in the middle, we must not end with closed tasks but an active project. That is a **transaction**.

```java
@Service
public class ProjectService {

    // ...

    @Transactional
    public void archive(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ProjectNotFoundException(projectId));

        List<Task> openTasks = taskRepository.findByProjectIdAndDone(projectId, false);
        openTasks.forEach(t -> t.setDone(true));
        taskRepository.saveAll(openTasks);

        project.setArchived(true);
        projectRepository.save(project);
        // If ANY exception flies out of this method,
        // ALL database changes above are rolled back.
    }
}
```

How `@Transactional` works: Spring wraps your bean in a **proxy**. Before the method runs, the proxy starts a database transaction. If the method finishes normally → commit. If a `RuntimeException` escapes → rollback.

## The traps everyone falls into

**Trap 1 — self-invocation.** Calling a `@Transactional` method from *another method of the same class* skips the proxy — no transaction!

```java
public void outer() {
    this.archive(5L);   // "this" bypasses the proxy -> @Transactional ignored
}
```

Fix: call it from another bean, or restructure.

**Trap 2 — checked exceptions do not roll back** by default. Only `RuntimeException` and `Error` do. If you must: `@Transactional(rollbackFor = Exception.class)`. (Best habit: use runtime exceptions for business errors, like we do.)

**Trap 3 — @Transactional on private methods** does nothing. Proxies can only wrap public methods.

**Read-only optimization** for query-only methods:

```java
@Transactional(readOnly = true)
public List<Task> findAll() { ... }
```

This lets Hibernate skip change-tracking — faster and it signals intent.

## Dirty checking — a nice JPA surprise

Inside a transaction, JPA watches loaded entities. If you change one, JPA saves it at commit **even without calling save()**:

```java
@Transactional
public void rename(Long id, String newTitle) {
    Task task = taskRepository.findById(id).orElseThrow();
    task.setTitle(newTitle);
    // no save() call — still persisted at commit. This is "dirty checking".
}
```

Knowing this exists will save you hours of confusion when data changes "by itself".

## Interview corner

- **How does @Transactional work?** Through a proxy that begins, commits, or rolls back a transaction around the method.
- **Why does self-invocation break it?** Internal calls go directly to the object, not through the proxy.
- **Which exceptions trigger rollback?** Unchecked (`RuntimeException`) by default; configure `rollbackFor` for others.
- **What is dirty checking?** JPA automatically persists changes to managed entities at transaction commit.

## Exercise

1. Implement `archive` including the `archived` field on `Project` and an endpoint `POST /api/projects/{id}/archive`.
2. Throw a `RuntimeException` on purpose *after* `saveAll` but *before* `project.setArchived(true)`. Check the database: were the tasks rolled back?
3. Remove `@Transactional` and repeat. What is different?

---
Next: **Lesson 10** — DTOs and a clean project structure.
