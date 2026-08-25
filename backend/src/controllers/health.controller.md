# Controller: System Health & Observability Probe (`health.controller.js`)

## Purpose
Exposes a lightweight, non-blocking operational health probe at `/health` and `/api/v1/health` for uptime monitoring, Docker/Kubernetes readiness probes, and operational diagnostics.

---

## Metrics Emitted in Response Payload

```json
{
  "success": true,
  "message": "System health operational.",
  "data": {
    "status": "UP",
    "timestamp": "2026-08-25T13:15:00.000Z",
    "environment": "development",
    "uptime_seconds": 3840,
    "database": {
      "status": "UP",
      "latency_ms": 2
    },
    "queue": {
      "active_workers": 0,
      "queued_jobs": 0,
      "max_concurrency": 5,
      "total_completed": 12
    },
    "memory": {
      "rss_mb": 114,
      "heap_used_mb": 48,
      "heap_total_mb": 72
    },
    "check_duration_ms": 3
  }
}
```

---

## Mentor & Technical Assessment Interview Questions

### 1. Why must a health check be lightweight?
Health checks are polled by automated orchestrators (Kubernetes, AWS ALB, Render) every 10–30 seconds. If a health probe executes heavy database joins or calls external LLMs like Groq, it would exhaust database connections and trigger false-positive failovers under high load.

### 2. Difference between Liveness and Readiness probes?
* **Liveness Probe**: Checks if the Node.js process is running and not deadlocked (restarts the container if failed).
* **Readiness Probe**: Checks if the service is ready to accept user traffic (e.g. database pool is connected and reachable). If failed, traffic is diverted away without killing the process.
