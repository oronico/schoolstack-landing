Feature: The voice rules from CLAUDE.md section 2

  The reader is a capable founder running a real business. Copy names the value
  delivered, never the customer's shortfall. Two framings are out by name:
  "can't afford" says what they lack, "deserves" says what they are owed.

  Until these rules were code they bound only whoever remembered to read the
  Markdown, and they did not hold: "The back office platform your school
  deserves." reached production through two full green runs.

  Background:
    Given the published page

  Scenario: No headline, CTA or share field names what the reader lacks
    Then the copy carries no deficit framing where a reader meets it first

  Scenario: No em dashes
    Then the copy carries no em dash

  Scenario: No invented user counts
    Then the copy claims no number of schools already using SchoolStack

  Scenario: The planning-only disclaimer survives
    Then the copy still carries the planning-only disclaimer

  Scenario: Entitlement framing can only go down
    Entitlement framing is on the page today, and taking it off is a
    positioning decision for the owner rather than a side effect of adding a
    test. So the count is recorded and the check fails when it rises.

    Then entitlement framing appears on no more lines than the recorded debt
    And every remaining line is named in the run output

  Scenario Outline: Retired framings are caught wherever a reader meets them
    Given a <surface> that reads "<copy>"
    Then the voice check reports a fault matching "<fault>"

    Examples:
      | surface  | copy                                              | fault           |
      | headline | The back office your school can't afford to hire  | deficit framing |
      | CTA      | Cannot wait? Sign up                              | deficit framing |
      | og:title | Can't afford a CFO?                               | og:title        |
      | body     | Know your numbers — show your numbers.            | em dash         |
      | body     | Join 400 schools already running on SchoolStack.  | user counts     |

  Scenario Outline: Honest copy is left alone
    A rule that fires on true sentences gets switched off. An earlier draft of
    the user-count rule tripped on the founder's quote, which is true.

    Given a <surface> that reads "<copy>"
    Then the voice check reports no fault

    Examples:
      | surface  | copy                                                       |
      | body     | Last summer we met over 100 school founders who had quit.   |
      | body     | Built for schools of 10 to 500 students.                    |
      | body     | You can't be everywhere at once.                            |
      | headline | The back office small schools run on.                       |
