# Payment contracts

Money is represented in positive integer minor units with an explicit ISO currency code. Payment request DTOs are application-owned and do not expose PayPal order or capture payloads.

This prevents floating-point amount handling and keeps browser inputs separate from server-controlled payment values.
