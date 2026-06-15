# Runtime configuration

The package root exposes browser-safe configuration only. Private runtime configuration is defined separately and is not available to the public web application.

Invalid configuration fails during startup with field-level error details. Optional provider capabilities are represented by explicit feature flags rather than inferred from partial configuration.
