# Configuration safety

- Browser-safe configuration contains only public URLs and publishable identifiers.
- Private runtime configuration is isolated in a separate module.
- Provider secrets are never exported through the web-facing package root.
- CI scans web source code for server-only imports and credential names.
- Invalid private configuration fails before the API begins serving traffic.
