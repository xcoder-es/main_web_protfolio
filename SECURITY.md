# Security policy

Do not disclose suspected vulnerabilities in a public issue. Contact the repository owner privately with the affected component, reproduction steps, impact and suggested mitigation when available.

## Baseline controls

- Never commit credentials, access tokens, private keys or production personal data.
- Keep provider SDKs behind outbound ports.
- Validate untrusted input at every inbound boundary.
- Return stable public errors without stack traces or provider internals.
- Redact sensitive values from logs and audit context.
- Use least-privilege credentials and rotate them after suspected exposure.
- Treat generated dependency updates as untrusted until CI and review pass.
