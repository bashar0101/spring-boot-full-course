# Lesson 11 — Spring Security Basics

## What happens when you add the starter

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

Restart the app and try `GET /api/tasks` — you get **401 Unauthorized**. Spring Security locked *everything* by default. Good default: closed until you open it.

## The core idea: the filter chain

Before any request reaches your controller, it passes through a chain of **filters**. Each filter has one job: read credentials, check the session, verify tokens, decide access.

```
Request -> [Filter 1] -> [Filter 2] -> ... -> [Filter N] -> Controller
              |               |
           reads login     checks "may this
           information     user access this URL?"
```

Two words you must keep apart:

- **Authentication** — *who are you?* (login, tokens)
- **Authorization** — *what may you do?* (roles, permissions)

401 means authentication failed (we do not know you). 403 means authorization failed (we know you, but you may not do this).

## Configuring the chain

Since Spring Security 6, configuration is a `SecurityFilterChain` bean with lambdas (old tutorials show `WebSecurityConfigurerAdapter` — that is dead, skip those tutorials):

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            // CSRF protection is for browser-cookie sessions.
            // A stateless token API does not need it (lesson 12 explains).
            .csrf(csrf -> csrf.disable())

            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()      // login is open
                .requestMatchers(HttpMethod.GET, "/api/tasks/**").authenticated()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()                      // default: closed
            )

            .httpBasic(Customizer.withDefaults());   // temporary: user+password
                                                     // in a header. JWT next lesson.
        return http.build();
    }
}
```

Rules are checked top to bottom — first match wins. Put specific rules first, `anyRequest()` last.

## Users and the UserDetailsService

Spring Security asks one interface for users: `UserDetailsService` — *give me the user with this username.* For now, users in memory; a real user table comes with JWT in lesson 12.

```java
@Bean
public UserDetailsService users(PasswordEncoder encoder) {
    UserDetails user = User.withUsername("bashar")
            .password(encoder.encode("secret123"))
            .roles("USER")
            .build();
    UserDetails admin = User.withUsername("admin")
            .password(encoder.encode("admin123"))
            .roles("USER", "ADMIN")
            .build();
    return new InMemoryUserDetailsManager(user, admin);
}
```

## Passwords: hashing with BCrypt

Never store passwords as plain text. Store a **hash** — a one-way transformation. You cannot get the password back from the hash; on login you hash the input and compare.

```java
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}
```

Why BCrypt and not SHA-256? BCrypt is **deliberately slow** and salted. Slow is a feature: an attacker trying billions of guesses is slowed to a crawl. A salt (random extra input) means two users with the same password get different hashes.

Test with basic auth:

```bash
curl -u bashar:secret123 http://localhost:8080/api/tasks     # 200
curl http://localhost:8080/api/tasks                          # 401
curl -u bashar:secret123 http://localhost:8080/api/admin/x    # 403 (no ADMIN role)
```

## Method-level security

Besides URL rules you can guard single methods:

```java
@EnableMethodSecurity          // add to SecurityConfig
```

```java
@PreAuthorize("hasRole('ADMIN')")
public void deleteProject(Long id) { ... }
```

Useful when the rule depends on logic, not just the URL.

## Interview corner

- **Authentication vs authorization?** Who you are vs what you may do. 401 vs 403.
- **What is the SecurityFilterChain?** The ordered list of servlet filters every request passes through before reaching controllers.
- **Why BCrypt?** Slow by design and salted — resistant to brute force and rainbow tables.
- **What replaced WebSecurityConfigurerAdapter?** A `SecurityFilterChain` bean (component-based configuration).

## Exercise

1. Add the security starter and the config above. Verify the three curl calls behave as shown (200 / 401 / 403).
2. Create an endpoint `GET /api/me` that returns the current username. (Hint: inject `Authentication` as a controller method parameter and return `authentication.getName()`.)

---
Next: **Lesson 12** — replacing basic auth with JWT tokens.
