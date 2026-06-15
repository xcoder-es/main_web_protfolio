# API error contract

All HTTP adapters will map failures to the shared response shape:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "The request contains invalid fields.",
  "correlationId": "request-identifier",
  "fieldErrors": {
    "email": ["Enter a valid email address."]
  }
}
```

`fieldErrors` is optional. Provider error payloads, stack traces and internal exception names must never cross the public API boundary.
