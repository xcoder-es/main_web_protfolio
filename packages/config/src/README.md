# Configuration boundaries

`index.ts` contains browser-safe configuration only.

`private-runtime.ts` contains server runtime configuration and must never be imported by `apps/web`.

The repository boundary check fails CI when server-only configuration or provider credential names appear in the web source tree.
