# Durable Object cost considerations for Whottos

Cloudflare Durable Objects charge for compute requests and duration while an object is active in memory. On the Workers Free plan, the daily allotment is 100,000 requests and 13,000 GB-seconds; paid plans include 1 million requests plus $0.15 per million beyond that, and 400,000 GB-seconds plus $12.50 per million GB-seconds over the included pool. WebSocket connections count as one request to establish, and incoming WebSocket messages are discounted at a 20:1 ratio for billing. The WebSocket hibernation API can stop duration charges once event handlers finish, which is important for long-lived multiplayer sessions. Storage reads and writes only bill on paid plans, while SQLite-backed Durable Objects currently incur no extra storage cost beyond compute. Cloudflare publishes worked examples: a single coordination Durable Object handling 1.5 million requests in a month costs roughly $5.08, whereas keeping 100 Durable Objects online with 50 WebSocket clients each for eight hours daily reaches about $138.65 because of sustained duration usage.

To stay cost-effective:

- Consolidate matchmaking and leaderboard duties into shared Durable Objects so traffic pools into fewer instances that stay warm instead of spawning many idle objects.
- Use WebSocket hibernation in rooms where players are idle to release compute time until new messages arrive.
- Prefer SQLite-backed storage (the default) so leaderboard updates count as row reads/writes instead of bespoke storage operations, and clean up unused records to avoid future storage billing.
- Monitor request and duration metrics per namespace and set alerts before free-tier limits are exhausted so you can scale to a paid plan intentionally.
