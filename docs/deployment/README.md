# Deployment

The initial topology uses a Render Static Site for Astro and a Render Free Web Service for Fastify. Supabase, Clerk, Resend, PayPal and Cloudflare Turnstile remain replaceable integrations.

## References

- [Verified provider baseline](../providers/verified-provider-baseline-2026-06-15.md)
- [Architecture decisions](../adr/README.md)
- [Phone-only setup](../operations/provider-setup-from-phone.md)

## Confirmed Render constraints

- The free API sleeps after 15 minutes without inbound traffic.
- Public pages remain static while the API sleeps.
- Durable state cannot use the Render filesystem.
- Email uses HTTPS rather than SMTP.
- Blueprint secret placeholders use `sync: false` and values are entered in the dashboard.

The concrete `render.yaml`, health checks and smoke tests are delivered after the application adapters exist.
