# Lesson 12 — JWT Authentication

## Why not basic auth or sessions?

Basic auth sends the password with **every** request — bad. Server-side sessions store login state in server memory — that breaks when you run 3 copies of your app behind a load balancer (which server has my session?).

**JWT (JSON Web Token)** solves both: after login, the server gives the client a signed token. The client sends it with each request. The server verifies the **signature** — no server-side state needed. Any copy of the app can verify it. This is called **stateless** authentication.

## What a JWT looks like

Three base64 parts joined by dots: `header.payload.signature`

```json
// payload (the "claims") — readable by anyone!
{
  "sub": "bashar",           // subject = username
  "roles": ["USER"],
  "iat": 1752835200,         // issued at
  "exp": 1752838800          // expires at
}
```

**Key fact:** the payload is only *encoded*, not *encrypted*. Anyone can read it. The signature only guarantees nobody **changed** it. So: never put secrets in a JWT, and the signing key must stay private on the server.

## Step 1: A real user entity

```java
@Entity
@Table(name = "users")
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String passwordHash;

    private String role;      // "USER" or "ADMIN" — enough for now
    // constructors, getters ...
}
```

```java
public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);
}
```

Replace the in-memory users with a DB-backed `UserDetailsService`:

```java
@Service
public class DbUserDetailsService implements UserDetailsService {

    private final AppUserRepository repository;

    public DbUserDetailsService(AppUserRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        AppUser u = repository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(username));
        return User.withUsername(u.getUsername())
                .password(u.getPasswordHash())
                .roles(u.getRole())
                .build();
    }
}
```

## Step 2: Create and verify tokens

Add the jjwt library:

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt</artifactId>
    <version>0.13.0</version>
</dependency>
```

```java
@Service
public class JwtService {

    private final SecretKey key;
    private final Duration validity = Duration.ofHours(1);

    // Secret from configuration — environment variable in production!
    public JwtService(@Value("${taskhub.jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generate(UserDetails user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getUsername())
                .claim("roles", user.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority).toList())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(validity)))
                .signWith(key)
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token)       // throws if invalid or expired
                .getPayload().getSubject();
    }
}
```

## Step 3: The login endpoint

```java
public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
public record TokenResponse(String token) {}
```

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authManager;
    private final JwtService jwtService;

    public AuthController(AuthenticationManager authManager, JwtService jwtService) {
        this.authManager = authManager;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest req) {
        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.username(), req.password()));
        // authenticate() throws BadCredentialsException on wrong password -> 401
        return new TokenResponse(jwtService.generate((UserDetails) auth.getPrincipal()));
    }
}
```

Expose the `AuthenticationManager` bean in `SecurityConfig`:

```java
@Bean
public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg)
        throws Exception {
    return cfg.getAuthenticationManager();
}
```

## Step 4: A filter that reads the token

Every request with `Authorization: Bearer <token>` should be treated as logged in:

```java
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthFilter(JwtService jwtService, UserDetailsService uds) {
        this.jwtService = jwtService;
        this.userDetailsService = uds;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            try {
                String username = jwtService.extractUsername(header.substring(7));
                UserDetails user = userDetailsService.loadUserByUsername(username);
                var auth = new UsernamePasswordAuthenticationToken(
                        user, null, user.getAuthorities());
                // tell Spring Security: this request is authenticated
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (JwtException e) {
                // invalid/expired token -> stay anonymous; the chain
                // will reject protected URLs with 401
            }
        }
        chain.doFilter(request, response);
    }
}
```

Plug it into the chain and make the API stateless:

```java
http
    .csrf(csrf -> csrf.disable())
    .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
    .authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/auth/**").permitAll()
        .anyRequest().authenticated())
    .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
```

Why disabling CSRF is OK here: CSRF attacks abuse cookies that browsers attach automatically. We use an Authorization header that scripts must add explicitly — the attack does not apply. (If you ever store the JWT in a cookie, CSRF matters again.)

## The full flow

```bash
# 1. login
curl -X POST http://localhost:8080/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"bashar","password":"secret123"}'
# -> {"token":"eyJhbGciOi..."}

# 2. use the token
curl http://localhost:8080/api/tasks \
     -H "Authorization: Bearer eyJhbGciOi..."
```

## Interview corner

- **Why is JWT stateless?** All needed data is in the signed token; the server stores nothing per user.
- **Can you revoke a JWT?** Not directly — that is JWT's biggest weakness. Options: short expiry plus refresh tokens, or a server-side blocklist (which reintroduces state).
- **Where should the browser store a JWT?** Trade-off question: localStorage is exposed to XSS; httpOnly cookies are exposed to CSRF. Know both sides.
- **What if someone edits the payload?** The signature check fails and the token is rejected.

## Exercise

1. Add `POST /api/auth/register` (validate input, hash the password with `PasswordEncoder`, save the user).
2. Set token validity to 1 minute, log in, wait, and watch the request fail with 401.
3. Bonus: add a refresh-token endpoint and explain to yourself why refresh tokens exist.

---
Next: **Part 4, Lesson 13** — unit testing with JUnit and Mockito.
