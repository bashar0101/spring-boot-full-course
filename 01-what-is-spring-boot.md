# Lesson 01 — What is Spring Boot?

## The problem first

Imagine you write a Java web app with no framework. You must write code for:

- opening a web server and listening on a port
- reading HTTP requests and turning JSON into Java objects
- connecting to a database and managing connections
- creating your objects in the right order and wiring them together

That is a lot of boring, repeated work. Every company would write the same code again and again.

**Spring** is a framework that does this boring work for you.
**Spring Boot** is Spring with smart defaults, so you can start in minutes instead of days.

## The one big idea: Inversion of Control (IoC)

Normally, *your* code creates objects:

```java
// You are in control. You create everything yourself.
TaskRepository repo = new TaskRepository();
TaskService service = new TaskService(repo);
TaskController controller = new TaskController(service);
```

This gets painful fast. If `TaskRepository` one day needs a database connection, you must change every place that creates it.

With Spring, you *give up* control. You only say **what you need**, and Spring creates and connects the objects for you. This is called **Inversion of Control**: the control moves from your code to the framework.

Think of it like a phone contract. You do not build cell towers to make a call. You sign up with a provider, and the network is just *there* when you need it. Spring is the provider. Your objects are the calls.

## Dependency Injection (DI)

DI is *how* Spring does IoC. "Dependency" means: an object another object needs. "Injection" means: Spring puts it in for you.

```java
public class TaskService {

    private final TaskRepository repository;

    // TaskService needs a TaskRepository.
    // It does NOT create one. It just asks for one in the constructor.
    // Spring sees this and injects (passes in) the repository.
    public TaskService(TaskRepository repository) {
        this.repository = repository;
    }
}
```

Why is this good?

1. **Less glue code.** You never write the wiring.
2. **Easy to change.** Swap the real repository for another one — no code changes in `TaskService`.
3. **Easy to test.** In a test, you can pass a fake repository. (Lesson 13 uses this a lot.)

The objects that Spring creates and manages are called **beans**. Remember this word. Everything in Spring is about beans.

## What Spring Boot adds on top of Spring

| Plain Spring | Spring Boot |
|---|---|
| You configure everything (lots of setup) | Smart defaults, almost no setup |
| You install and configure a web server | Web server (Tomcat) is built in |
| You manage library versions yourself | "Starters" bring matching versions together |
| Slow to start a new project | New project running in 5 minutes |

A **starter** is a package of libraries for one purpose. Example: `spring-boot-starter-web` gives you everything for building web APIs — with one line in your build file.

**Auto-configuration** is Spring Boot's magic: it looks at what is on your classpath and configures it. You add the PostgreSQL driver? It prepares a database connection. You add the web starter? It starts Tomcat on port 8080. You can always override the defaults.

## Interview corner

These questions come up in almost every interview:

- **What is IoC?** Control over object creation moves from your code to the framework.
- **What is DI?** The framework passes an object's dependencies to it, usually through the constructor.
- **Spring vs Spring Boot?** Spring is the framework. Spring Boot adds auto-configuration, starters, and an embedded server so you start fast.
- **What is a bean?** An object created and managed by the Spring container.

## Exercise

No code yet. Answer in your own words (write it down, really):

1. Why is `new TaskService(new TaskRepository())` everywhere in your code a problem?
2. What does Spring Boot's auto-configuration do when it finds the web starter?

---
Next: **Lesson 02** — we create the `taskhub` project and run it.
