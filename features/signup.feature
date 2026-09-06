Feature: The design partner application form

  The form is the only behaviour on the site and the only thing the page is
  ultimately for. Every way it breaks, it breaks quietly:

  Netlify pairs a submission to a form by the hidden form-name field. If that
  stops matching the form's name, Netlify answers 200, the visitor reads
  "Thanks for applying", and the application is discarded. Nothing goes red.

  The error path is the one visitors meet on a bad day, and it is the least
  likely to have been opened in a browser.

  Background:
    Given the page is loaded at 1440 pixels wide

  Scenario: The Netlify contract holds
    Then the form is named "early-access"
    And it posts with a hidden form-name of "early-access"
    And it declares a honeypot field

  Scenario: The marketing consent is a separate, optional ask
    Then the "emailConsent" field is not required
    And the "schoolName" field is required

  Scenario: A good submission reaches Netlify and thanks the visitor
    When a visitor submits the form and the submission succeeds
    Then exactly one request is sent
    And the request is a POST of urlencoded fields to "/"
    And the posted body carries form-name "early-access"
    And the form is replaced by the confirmation

  Scenario: A server error keeps the visitor's details and lets them retry
    When a visitor submits the form and the server answers 500
    Then an error is shown
    And the visitor's answers are still in the form
    And the button is usable again with its original label

  Scenario: A dropped network points the visitor at a human
    When a visitor submits the form and the network drops
    Then an error is shown
    And the error names an email address

  Scenario: A submission in flight cannot be sent twice
    When a visitor submits the form and the request never settles
    Then the button is disabled
    And the button reads "Submitting..."

  Scenario: An empty form never reaches the network
    The browser's own validation should stop it, so no request is made and the
    visitor is not told anything went wrong with the server.

    When a visitor submits the form empty
    Then no request is sent
