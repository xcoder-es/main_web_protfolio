Feature: Public enquiry forms

  Scenario: Save a valid enquiry
    Given a visitor completes the form normally
    When the enquiry is submitted
    Then one lead is saved
    And a success response is returned

  Scenario: Retry an existing enquiry
    Given an enquiry was already saved
    When the same idempotency key is submitted again
    Then the existing lead is returned
    And no duplicate lead is created

  Scenario: Reject a filled honeypot
    Given the hidden website field has a value
    When the enquiry is submitted
    Then the request is rejected
    And no lead is saved

  Scenario: Reject an implausibly fast form
    Given the form was completed too quickly
    When the enquiry is submitted
    Then the request is rejected
    And no lead is saved

  Scenario: Verification is temporarily unavailable
    Given external verification is required but unavailable
    When the enquiry is submitted
    Then a retryable response is returned
    And no lead is saved

  Scenario: Notification delivery fails after persistence
    Given the enquiry is valid
    And notification delivery fails
    When the enquiry is submitted
    Then the lead remains saved
    And the visitor still receives a success response
