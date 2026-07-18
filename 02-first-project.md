# Lesson 02 — Your First Project

## Create the project

Go to [start.spring.io](https://start.spring.io) (Spring Initializr). Choose:

- **Project:** Maven
- **Language:** Java
- **Spring Boot:** 4.1.x (latest stable)
- **Group:** `com.taskhub`
- **Artifact:** `taskhub`
- **Java:** 21
- **Dependencies:** add **Spring Web**

Click **Generate**, unzip the file, and open the folder in IntelliJ.

## What is in the project?

```
taskhub/
├── pom.xml                        <- build file: dependencies live here
├── src/main/java/com/taskhub/
│   └── TaskhubApplication.java    <- the entry point
├── src/main/resources/
│   └── application.properties     <- configuration
└── src/test/java/...              <- tests
```

### pom.xml (the important part)

```xml
<dependencies>
    <!-- One starter = web server + JSON + Spring MVC, all matching versions -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

One dependency. Behind it: Tomcat, Jackson (JSON), Spring MVC, logging. This is the power of starters.

### The entry point

```java
@SpringBootApplication
public class TaskhubApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskhubApplication.class, args);
    }
}
```

`@SpringBootApplication` is three annotations in one:

| Annotation | What it does |
|---|---|
| `@Configuration` | This class can define beans |
| `@EnableAutoConfiguration` | Turn on Spring Boot's auto-setup magic |
| `@ComponentScan` | Scan this package (and below) for your beans |

**Important:** component scan starts from the package of this class. Put all your code in `com.taskhub` or a sub-package like `com.taskhub.task`. Code *outside* it will not be found — this is a very common beginner bug.

## Run it

In IntelliJ, press the green play button. Or in a terminal:

```bash
./mvnw spring-boot:run
```

You should see:

```
Tomcat started on port 8080 (http)
Started TaskhubApplication in 1.4 seconds
```

Your app is running at `http://localhost:8080`. Open it in a browser — you get a "Whitelabel Error Page". That is fine! It means the server works but has no pages yet.

## Your first endpoint

Create `src/main/java/com/taskhub/HelloController.java`:

```java
package com.taskhub;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController               // "This class answers HTTP requests"
public class HelloController {

    @GetMapping("/hello")     // "This method answers GET /hello"
    public String hello() {
        return "Hello from taskhub!";
    }
}
```

Restart the app and open `http://localhost:8080/hello`. You should see the message.

What happened:

1. Component scan found `HelloController` (it is in the right package).
2. Spring created it as a bean.
3. Spring MVC mapped `GET /hello` to your method.
4. Tomcat received your browser's request and passed it to that method.

## Interview corner

- **What does @SpringBootApplication do?** Combines @Configuration, @EnableAutoConfiguration, and @ComponentScan.
- **Where does component scan look?** The package of the main class, and everything under it.
- **What server does Spring Boot use by default?** Embedded Tomcat, on port 8080.

## Exercise

1. Add a second endpoint `GET /time` that returns the current time (`java.time.LocalTime.now().toString()`).
2. Move `HelloController` to a package *outside* `com.taskhub` (e.g. `com.other`). Restart. What happens? Why? Move it back.

---
Next: **Lesson 03** — beans and dependency injection in real code.
