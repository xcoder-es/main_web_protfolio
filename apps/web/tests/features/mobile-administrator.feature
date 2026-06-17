Feature: Mobile administrator operations

  Scenario: Authorised administrator reviews and progresses a lead
    Given an administrator has a valid Clerk session
    And the identity is on the server-side allowlist
    When the administrator opens the mobile workspace
    Then recent leads and service diagnostics are loaded
    When the administrator opens a lead
    Then contact shortcuts, project context, notes and audit history are visible
    When the administrator adds a note and changes the lead status
    Then the API records both actions against the verified administrator identity

  Scenario: Administrator recovers failed delivery
    Given a notification is in a failed state
    When the administrator selects retry
    Then a new delivery attempt is recorded
    And the lead remains unchanged

  Scenario: Administrator creates and shares a payment request
    Given commercial terms have been agreed for a lead
    When the administrator creates a fixed payment request
    And activates the request
    Then a shareable public URL is available
    And payment history remains visible in the workspace

  Scenario: Unauthorised identity opens the administrator route
    Given a user has a valid Clerk session
    But the identity is not on the administrator allowlist
    When the user opens the workspace
    Then the API returns forbidden
    And no lead, notification, payment or audit data is shown

  Scenario: Mobile service configuration is incomplete
    Given a required provider is unavailable
    When the administrator opens diagnostics
    Then the unavailable capability is clearly identified
    And unrelated administrator workflows remain visible where possible
