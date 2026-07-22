# Lesson 16 — Messaging with Kafka

## The problem Kafka solves

New requirement: *when a task is completed, send a notification email and update statistics.* The direct way:

```java
public void complete(Long id) {
    task.setDone(true);
    emailService.send(...);       // slow: 2 seconds
    statsService.update(...);     // what if this crashes?
}
```

Problems: the API call is now slow; if email fails, does the whole thing fail?; every new reaction ("also post to Slack!") means editing this method again.

The messaging way: `TaskService` only **announces** what happened — "task 5 was completed" — and moves on. Other components **listen** and react on their own time. The announcer does not know or care who listens. This is **event-driven architecture**, and **Kafka** is the most used tool for it.

## Kafka in four words

- **Topic** — a named stream of messages (like `task-events`).
- **Producer** — writes messages to a topic.
- **Consumer** — reads messages from a topic, at its own speed.
- **Consumer group** — a team of consumers sharing the work; each message goes to one member of each group, but every *group* gets every message.

Two key differences from a classic queue: messages are **kept** (for days), not deleted when read — new consumers can even replay history; and multiple independent groups can all read the same stream.

## Setup

```bash
docker run --name taskhub-kafka -p 9092:9092 -d apache/kafka:4.0.0
```

```xml
<dependency>
    <groupId>org.springframework.kafka</groupId>
    <artifactId>spring-kafka</artifactId>
</dependency>
```

```yaml
spring:
  kafka:
    bootstrap-servers: localhost:9092
    producer:
      key-serializer: org.apache.kafka.common.serialization.StringSerializer
      value-serializer: org.springframework.kafka.support.serializer.JsonSerializer
    consumer:
      group-id: taskhub
      key-deserializer: org.apache.kafka.common.serialization.StringDeserializer
      value-deserializer: org.springframework.kafka.support.serializer.JsonDeserializer
      properties:
        spring.json.trusted.packages: "com.taskhub.*"
```

## The event and the producer

```java
// The event: a fact about the past, named in past tense.
public record TaskCompletedEvent(Long taskId, String title, Instant completedAt) {}
```

```java
@Service
public class TaskEventPublisher {

    private static final String TOPIC = "task-events";
    private final KafkaTemplate<String, TaskCompletedEvent> kafka;

    public TaskEventPublisher(KafkaTemplate<String, TaskCompletedEvent> kafka) {
        this.kafka = kafka;
    }

    public void publishCompleted(Task task) {
        var event = new TaskCompletedEvent(task.getId(), task.getTitle(), Instant.now());
        // key = task id -> all events of one task keep their order
        kafka.send(TOPIC, task.getId().toString(), event);
    }
}
```

Hook it into the service:

```java
@Transactional
public Task complete(Long id) {
    Task task = getById(id);
    task.setDone(true);
    eventPublisher.publishCompleted(task);   // fire and continue — no waiting
    return task;
}
```

## The consumer

```java
@Component
public class TaskEventListener {

    @KafkaListener(topics = "task-events", groupId = "notifications")
    public void onTaskCompleted(TaskCompletedEvent event) {
        // runs in the background, completely outside the HTTP request
        System.out.printf("Sending notification: task '%s' completed at %s%n",
                event.title(), event.completedAt());
    }

    @KafkaListener(topics = "task-events", groupId = "statistics")
    public void updateStats(TaskCompletedEvent event) {
        // different group -> ALSO receives every event, independently
        System.out.println("Updating statistics for task " + event.taskId());
    }
}
```

Complete a task via the API — both listeners print, after the API already answered. Stop the app, complete nothing, start it again: consumers continue where they left off (Kafka remembers each group's position, called the **offset**).

## What can go wrong (senior-level awareness)

- **At-least-once delivery.** After a crash at the wrong moment, a consumer may see the same event twice. Consumers must be **idempotent**: processing an event twice must be harmless (e.g., "set done=true" is safe; "add +1 to counter" is not — check before adding).
- **Poison messages.** A message that always crashes the listener would block the stream. Configure a **dead letter topic**: after N failed tries, the message is parked in `task-events.DLT` for humans to inspect.
- **The dual-write problem (advanced).** `publishCompleted` inside `@Transactional` is not atomic with the DB commit — the send is not part of the DB transaction. If the app dies between commit and send, the event is lost. The clean fix is the **outbox pattern** (write the event to a DB table in the same transaction; a background job publishes it). Knowing this pattern *by name* is a strong senior signal.

## Kafka vs REST call — when which?

| | REST (Feign, lesson 18) | Kafka event |
|---|---|---|
| Style | "Do this now, I wait for the answer" | "This happened, whoever cares reacts" |
| Coupling | Caller must know the callee | Producer knows nobody |
| If receiver is down | Call fails | Event waits in the topic |
| Use for | Queries, commands needing an answer | Notifications, data sync, side effects |

## Interview corner

- **What is a consumer group?** Consumers sharing a topic's work; one delivery per group; different groups each get everything.
- **How does Kafka keep order?** Only within a partition; messages with the same key land in the same partition — pick keys accordingly.
- **What does idempotent consumer mean?** Handling the same event twice has the same effect as once — required because delivery is at-least-once.
- **What is the outbox pattern?** Persist events with the business data in one DB transaction; publish them afterwards — solves the dual-write problem.

## Exercise

1. Build the flow above and watch both listeners react to one completed task.
2. Throw an exception inside `onTaskCompleted` and watch retries happen. Then read about `DefaultErrorHandler` and route failures to a dead letter topic.
3. Make the statistics listener idempotent: keep a set of processed task ids and skip repeats.

---
Next: **Lesson 17** — Actuator: seeing inside a running app.
