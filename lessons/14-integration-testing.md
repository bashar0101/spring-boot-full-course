# Lesson 14 — Integration Testing

## The testing pyramid

```
        /  E2E  \          few — slow, whole system
       / integr. \         some — app + real DB
      /   unit    \        many — fast, logic
```

Unit tests (lesson 13) prove your logic. **Integration tests** prove the pieces work *together*: HTTP → security → controller → service → JPA → a real database. Fewer of them, but they catch what unit tests cannot: wrong SQL, broken mappings, security misconfiguration, JSON shape mistakes.

## Tool 1: @WebMvcTest — controller slice

Loads **only** the web layer (controller + advice + security), mocks the rest. Fast.

```java
@WebMvcTest(TaskController.class)
@AutoConfigureMockMvc(addFilters = false)   // skip security here; tested separately
class TaskControllerTest {

    @Autowired MockMvc mockMvc;             // fake HTTP calls, no real server

    @MockitoBean TaskService service;       // replaces the real bean in context
                                            // (Spring Boot 3.x name: @MockBean)

    @Test
    void getTask_returns200AndJson() throws Exception {
        Task task = new Task("Read lesson 14");
        when(service.getById(1L)).thenReturn(task);

        mockMvc.perform(get("/api/tasks/1"))
               .andExpect(status().isOk())
               .andExpect(jsonPath("$.title").value("Read lesson 14"))
               .andExpect(jsonPath("$.done").value(false));
    }

    @Test
    void getTask_returns404_whenMissing() throws Exception {
        when(service.getById(99L)).thenThrow(new TaskNotFoundException("99"));

        mockMvc.perform(get("/api/tasks/99"))
               .andExpect(status().isNotFound())
               .andExpect(jsonPath("$.message").value("Task not found: 99"));
    }

    @Test
    void createTask_returns400_whenTitleEmpty() throws Exception {
        mockMvc.perform(post("/api/tasks")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\": \"\"}"))
               .andExpect(status().isBadRequest())
               .andExpect(jsonPath("$.fieldErrors.title").exists());
    }
}
```

This is where you test: URL mappings, status codes, JSON shapes, validation, and your `@RestControllerAdvice`.

## Tool 2: @SpringBootTest + Testcontainers — the real thing

`@SpringBootTest` starts the **whole** application. But which database? Not your dev DB (tests would pollute it) and not H2 in-memory (it is not PostgreSQL — SQL differences hide bugs).

**Testcontainers** starts a real PostgreSQL in Docker just for the test, then throws it away. This is the industry standard.

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-testcontainers</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class TaskApiIntegrationTest {

    @Container
    @ServiceConnection      // Boot auto-wires datasource to this container!
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    @Autowired TestRestTemplate rest;       // real HTTP against the random port
    @Autowired TaskRepository repository;

    @BeforeEach
    void clean() {
        repository.deleteAll();
    }

    @Test
    void fullLifecycle_createReadDelete() {
        // create
        var created = rest.postForEntity("/api/tasks",
                new CreateTaskRequest("Integration!", null), TaskResponse.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Long id = created.getBody().id();

        // read
        var fetched = rest.getForEntity("/api/tasks/" + id, TaskResponse.class);
        assertThat(fetched.getBody().title()).isEqualTo("Integration!");

        // it is really in PostgreSQL
        assertThat(repository.findById(id)).isPresent();

        // delete
        rest.delete("/api/tasks/" + id);
        assertThat(repository.findById(id)).isEmpty();
    }
}
```

`@ServiceConnection` (Spring Boot 3.1+) is the magic line: Boot sees the container and points the datasource at it. No manual URL wiring.

Note: with security on, these calls need a token — obtain one via `/api/auth/login` in a helper method, or configure a test-profile security setup. Doing the login flow in the test is itself a great integration test.

## Testing with security

```java
@WebMvcTest(TaskController.class)
class TaskControllerSecurityTest {

    @Autowired MockMvc mockMvc;
    @MockitoBean TaskService service;

    @Test
    void anonymous_gets401() throws Exception {
        mockMvc.perform(get("/api/tasks")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "USER")     // pretend a USER is logged in
    void user_gets200() throws Exception {
        mockMvc.perform(get("/api/tasks")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "USER")
    void user_cannotAccessAdmin() throws Exception {
        mockMvc.perform(get("/api/admin/stats")).andExpect(status().isForbidden());
    }
}
```

`@WithMockUser` fakes an authenticated user — no tokens needed for authorization tests.

## Which tool when?

| Question | Tool |
|---|---|
| Is my business logic right? | Unit test (lesson 13) |
| Are my URLs, JSON, validation, error responses right? | `@WebMvcTest` + MockMvc |
| Are my queries/mappings right against real PostgreSQL? | `@SpringBootTest` + Testcontainers |
| Are my security rules right? | `@WebMvcTest` + `@WithMockUser` |

## Interview corner

- **@WebMvcTest vs @SpringBootTest?** Slice with only the web layer and mocked services, vs the full application context.
- **Why Testcontainers instead of H2?** H2 is a different database; SQL that passes on H2 can fail on PostgreSQL. Test against what you run in production.
- **What does @MockitoBean do?** Replaces a bean in the Spring test context with a Mockito mock (called `@MockBean` before Spring Boot 4 / Framework 6.2).
- **What is the testing pyramid?** Many unit tests, fewer integration tests, few end-to-end tests — balancing speed and confidence.

## Exercise

1. Write `@WebMvcTest` tests for the project endpoints, including the 409 from the 100-open-tasks rule.
2. Write one Testcontainers test: register a user via `/api/auth/register`, log in, and call a protected endpoint with the token.
3. Run `./mvnw test` and look at how long each test class takes. Feel the pyramid.

---
Next: **Part 5, Lesson 15** — making it fast with Redis caching.
