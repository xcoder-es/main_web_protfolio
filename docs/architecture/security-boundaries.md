# Security boundaries

Public frontend code may import shared contracts and browser-safe configuration only. Private runtime configuration, provider credentials and server adapters remain outside the web application dependency graph.
