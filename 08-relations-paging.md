# Lesson 08 — Relations, Custom Queries, Paging

## Adding a second entity: Project

Tasks belong to projects. One project has many tasks. This is a **one-to-many** relation.

```java
@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    protected Project() {}
    public Project(String name) { this.name = name; }
    // getters/setters ...
}
```

Add the relation on the **many** side (Task):

```java
@Entity
@Table(name = "tasks")
public class Task {
    // ... existing fields ...

    @ManyToOne(fetch = FetchType.LAZY)   // many tasks -> one project
    @JoinColumn(name = "project_id")     // the foreign key column
    private Project project;
}
```

**Advice that will save you pain:** model only the `@ManyToOne` side. You *can* also put `@OneToMany List<Task> tasks` inside `Project`, but two-sided relations bring sync problems, JSON loops, and accidental huge loads. When you need "all tasks of a project", ask the repository:

```java
List<Task> findByProjectId(Long projectId);
```

## LAZY vs EAGER — the classic interview trap

`FetchType.LAZY` means: do not load the project until someone calls `task.getProject()`. `EAGER` means: always load it with every task, needed or not.

**Rule: always LAZY.** (`@ManyToOne` is EAGER by default — set it to LAZY yourself.)

The related trap is the **N+1 problem**: you load 100 tasks (1 query), then touch `getProject()` on each — 100 extra queries. Fix it when you really need the relation loaded:

```java
@Query("select t from Task t join fetch t.project")
List<Task> findAllWithProject();
```

`join fetch` loads tasks and their projects in **one** query.

## Custom queries with @Query

When method names get too long or too limited, write JPQL (SQL over entities, not tables):

```java
public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("""
           select t from Task t
           where t.done = false and t.createdAt < :cutoff
           """)
    List<Task> findOverdue(@Param("cutoff") Instant cutoff);

    @Query(value = "select * from tasks where title ilike '%' || :word || '%'",
           nativeQuery = true)   // real SQL when you need DB-specific features
    List<Task> searchNative(@Param("word") String word);
}
```

## Paging and sorting

Never return 100,000 rows in one response. Spring Data has paging built in — `JpaRepository` already accepts a `Pageable`:

```java
// service
public Page<Task> findAll(Pageable pageable) {
    return repository.findAll(pageable);
}
```

```java
// controller
@GetMapping
public Page<Task> all(@PageableDefault(size = 20, sort = "createdAt",
                                       direction = Sort.Direction.DESC)
                      Pageable pageable) {
    return service.findAll(pageable);
}
```

Clients control pages with query parameters — no extra code from you:

```
GET /api/tasks?page=0&size=10&sort=title,asc
```

The `Page<Task>` response includes the content plus metadata: `totalElements`, `totalPages`, `number`, `size`. Derived queries can page too: `Page<Task> findByDone(boolean done, Pageable pageable)`.

## Interview corner

- **LAZY vs EAGER?** LAZY loads relations on first access; EAGER always. Default to LAZY.
- **What is the N+1 problem and how do you fix it?** One query for a list plus one per element for a relation. Fix with `join fetch` or an `@EntityGraph`.
- **JPQL vs native query?** JPQL works on entities and is database-independent; native SQL is for DB-specific features.
- **How does pagination work in Spring Data?** Pass a `Pageable`, get back a `Page` with content and metadata.

## Exercise

1. Create `ProjectRepository`, a `ProjectService`, and endpoints `POST /api/projects` and `GET /api/projects`.
2. Extend `POST /api/tasks` so a task can be created with a `projectId`.
3. Add `GET /api/projects/{id}/tasks` using `findByProjectId` — with paging.

---
Next: **Lesson 09** — the service layer and transactions.
