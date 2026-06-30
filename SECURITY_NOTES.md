# Security Notes — codepromoreduc.fr

## Hosting Platform Constraint

**Hostinger Horizons does not expose reverse-proxy configuration.**

Direct access to nginx/LiteSpeed directives — including `proxy_set_header`,
`proxy_http_version`, chunked transfer handling, and WebSocket upgrade
configuration — is not available on this platform. This is a known platform
limitation. Full proxy-level hardening would require migrating to a Hostinger
VPS or equivalent hosting with direct server access.

This document records the application-layer mitigations implemented in lieu
of proxy-level controls. It is an accepted and documented limitation, not an
oversight, and should be referenced in any future security audit.

---

## Mitigations Implemented at the Application Layer

### 1. Request Smuggling (Issue #15)

**Proxy-level ideal fix:** enforce `proxy_http_version 1.1` and normalize
chunked encoding at the reverse proxy before forwarding to Node.js.

**Application-layer mitigation (implemented in `src/middleware.ts`):**

- Reject any request carrying **both** `Content-Length` and
  `Transfer-Encoding` simultaneously — this is the classic CL.TE / TE.CL
  smuggling vector.
- Reject any `DELETE` or `OPTIONS` request that carries a body or
  `Transfer-Encoding` header, since these methods carry no body in this
  application's legitimate usage.
- Reject any `Transfer-Encoding` value other than exactly `"chunked"` —
  obfuscated variants (`"chunked, identity"`, `"Chunked"`, `"chunk ed"`)
  are known smuggling techniques.

All rejections return HTTP 400 and occur before any route handler runs.

**Residual risk:** If Hostinger's LiteSpeed proxy itself is vulnerable to
smuggling from an upstream CDN or edge node before the request reaches
Node.js, application-layer validation cannot intercept that. This requires
proxy-level configuration that is not available on this plan.

---

### 2. WebSocket SSRF (Issue #1)

**Proxy-level ideal fix:** validate `Origin` and block unauthenticated
WebSocket upgrade requests at the nginx/LiteSpeed layer.

**Findings from codebase audit:**

No WebSocket server exists in this codebase. Specifically:
- No `ws` / `socket.io` / `uws` library is installed or used
- No route handler processes `Upgrade: websocket` requests
- No custom HTTP server with upgrade event handling exists
- The `wss://` entry in `next.config.mjs` CSP `connect-src` is for the
  **browser** connecting outbound to Supabase Realtime — it is not a
  server-side WebSocket

The Next.js HMR WebSocket (used during `next dev`) is a development-only
feature. It is NOT compiled into the production build (`next build`) and is
NOT exposed when the app runs via `next start`. The security scanner likely
flagged the dev server's HMR endpoint or the Supabase Realtime `wss://`
URL in the CSP header.

**Application-layer mitigation (implemented in `src/middleware.ts`):**

Any HTTP request with `Upgrade: websocket` is validated against an explicit
origin allowlist:
```
https://codepromoreduc.fr
https://www.codepromoreduc.fr
```
Requests with a missing, empty, or non-allowlisted `Origin` are rejected
with HTTP 403 and `Connection: close` before reaching any handler. This
provides defense-in-depth for any WebSocket functionality that may be added
in the future.

**Residual risk:** Low. No WebSocket server exists in this application.
The mitigation is preemptive.

---

## If You Migrate to a VPS

The following nginx directives should be added to complete the proxy-level
hardening:

```nginx
# HTTP/1.1 required for proper chunked encoding and keep-alive handling
proxy_http_version 1.1;

# Normalize hop-by-hop headers before forwarding
proxy_set_header Connection "";
proxy_set_header Upgrade $http_upgrade;

# WebSocket origin validation at proxy level
# (requires ngx_http_map_module or lua-nginx-module)

# Reject smuggling vectors at ingress
# (use modsecurity or similar WAF rule)
```

---

## Audit Trail

| Date | Action | Reference |
|------|--------|-----------|
| 2026-06-30 | Next.js upgraded 14.2.35 → 15.5.19 | Fixes CVE-2026-23870, -23869, -23864, and RSC cache poisoning |
| 2026-06-30 | serialize-javascript upgraded 4.0.0 → 7.0.6 | Fixes CVE-2020-7660 (incomplete) |
| 2026-06-30 | glob upgraded 10.3.10 → 10.5.0 | CLI command injection fix |
| 2026-06-30 | next-pwa replaced with @ducanh2912/next-pwa | Next.js 15 compatibility |
| 2026-06-30 | RSC Vary headers added to next.config.mjs | Cache poisoning mitigation |
| 2026-06-30 | Request smuggling validation added to middleware | Application-layer proxy substitute |
| 2026-06-30 | WebSocket origin validation added to middleware | SSRF defense-in-depth |
| 2026-06-30 | PostCSS 8.4.31 (Next.js internal) | Cannot be overridden — build-time only, not exploitable at runtime |
