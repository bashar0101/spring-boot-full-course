# Lesson 13 — Unit Testing with JUnit and Mockito

## Why constructor injection pays off now

A **unit test** tests one class alone, with all its dependencies replaced by fakes. Fast (milliseconds), no Spring, no database. Because our services take dependencies through constructors, we can hand them fakes directly. This is the payoff of lesson 03.

Spring Boot projects already include the test starter (`spring-boot-starter-test`): JUnit 5, Mockito, AssertJ — all there.

## Anatomy of a test

```java
class TaskServiceTest {                     // no Spring annotations — plain Java!

    TaskRepository taskRepository = mock(TaskRepository.class);
    ProjectRepository projectRepository = mock(ProjectRepository.class);

    TaskService service = new TaskService(taskRepository, projectRepository);

    @Test
    void getById_returnsTask_whenItExists() {
        // given — prepare the world
        Task task = new Task("Write tests");
        when(taskRepository.findById(1L)).thenReturn(Optional.of(task));

        // when — do the thing
        Task result = service.getById(1L);

        // then — check the result
        assertThat(result.getTitle()).isEqualTo("Write tests");
    }

    @Test
    void getById_throws_whenMissing() {
        when(taskRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99L))
                .isInstanceOf(TaskNotFoundException.class)
                .hasMessageContaining("99");
    }
}
```

The **given / when / then** structure keeps every test readable. Name tests as sentences: `method_expectedResult_condition`.

## Mockito in five lines

```java
TaskRepository repo = mock(TaskRepository.class);   // create a fake

when(repo.findById(1L)).thenReturn(Optional.of(task));   // program it
when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0)); // echo back input

verify(repo).deleteById(1L);            // assert a call happened
verify(repo, never()).save(any());      // assert a call did NOT happen
```

A **mock** answers what you programmed and records every call. Unprogrammed methods return null/empty/0 — a common source of surprise NPEs in tests.

You can also use annotations instead of manual `mock(...)`:

```java
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {
    @Mock TaskRepository taskRepository;
    @Mock ProjectRepository projectRepository;
    @InjectMocks TaskService service;    // creates service with the mocks
    ...
}
```

## Testing a real business rule

Remember the rule from lesson 09: max 100 open tasks per project. This is exactly what unit tests are for:

```java
@Test
void createInProject_throws_whenProjectHas100OpenTasks() {
    when(projectRepository.findById(1L))
            .thenReturn(Optional.of(new Project("Big project")));
    when(taskRepository.countByProjectIdAndDone(1L, false))
            .thenReturn(100L);

    assertThatThrownBy(() -> service.createInProject(1L, "one more"))
            .isInstanceOf(TooManyOpenTasksException.class);

    verify(taskRepository, never()).save(any());   // nothing was saved
}

@Test
void createInProject_saves_whenBelowLimit() {
    when(projectRepository.findById(1L))
            .thenReturn(Optional.of(new Project("Big project")));
    when(taskRepository.countByProjectIdAndDone(1L, false))
            .thenReturn(99L);
    when(taskRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    Task result = service.createInProject(1L, "one more");

    assertThat(result.getTitle()).isEqualTo("one more");
    verify(taskRepository).save(any(Task.class));
}
```

Notice: no database, no HTTP, no Spring context. These tests run in milliseconds and test *logic*, which is where bugs live.

## AssertJ: assertions that read like sentences

```java
assertThat(tasks).hasSize(3)
                 .extracting(Task::getTitle)
                 .containsExactly("a", "b", "c");

assertThat(result).isNotNull();
assertThat(page.getTotalElements()).isEqualTo(42);
```

Prefer AssertJ (`assertThat`) over JUnit's `assertEquals` — better error messages, more readable.

## What to unit test (and what not)

**Test:** services with logic — rules, branches, edge cases, exceptions.
**Do not test:** getters/setters, Spring itself, generated repository methods (`findByDone` works; Spring's tests cover it). Testing those adds noise, not safety.

Rule of thumb: every `if` in a service deserves at least two tests.

## Interview corner

- **What is a unit test?** Tests one class in isolation with dependencies replaced by test doubles; no framework, no I/O.
- **Mock vs stub?** A stub only returns programmed answers; a mock also records calls so you can verify interactions. Mockito objects do both.
- **Why avoid Spring context in unit tests?** Speed and focus — a context start costs seconds; plain tests cost milliseconds.
- **What is @InjectMocks?** Mockito creates the object under test and passes the `@Mock` fields into its constructor.

## Exercise

1. Write both tests for the archive logic of lesson 09: it closes open tasks, and it throws for a missing project.
2. Write a test proving `delete` throws `TaskNotFoundException` when the task does not exist, and verify `deleteById` was never called.
3. Run everything with `./mvnw test`.

---
Next: **Lesson 14** — integration tests: the whole app, a real database, real HTTP.
