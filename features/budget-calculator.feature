Feature: The school budget calculator

  A founder enters tuition and enrollment and sees, at once, what that revenue
  could pay for. The figures are planning estimates. The defaults (15% for
  facilities, 60% for staffing) are illustrations, not a standard.

  These steps call js/budget-calculator.js, the file the page runs, so the
  sentences below are checked against the shipped arithmetic.

  Scenario Outline: Revenue and its three parts
    Given tuition of <tuition> for <students> students
    And <facilities>% for facilities and <staffing>% for staffing
    Then annual revenue is <revenue>
    And the remaining budget is <remaining>% or <left> a year
    And the calculator reads as "<status>"

    Examples:
      | tuition   | students | facilities | staffing | revenue  | remaining | left      | status |
      | 10000     | 50       | 15         | 60       | $500,000 | 25        | $125,000  | ok     |
      | 10000     | 0        | 15         | 60       | $0       | 25        | $0        | ok     |
      | 0         | 50       | 15         | 60       | $0       | 25        | $0        | ok     |
      | 10000.50  | 50       | 15         | 60       | $500,025 | 25        | $125,006  | ok     |
      | 10000     | 50       | 26         | 60       | $500,000 | 14        | $70,000   | tight  |
      | 10000     | 50       | 40         | 60       | $500,000 | 0         | $0        | tight  |
      | 10000     | 50       | 40         | 90       | $500,000 | -30       | −$150,000 | over   |

  Scenario: Past 100%, the bar shows the deficit without a negative segment
    Given 40% for facilities and 90% for staffing
    Then no bar segment is narrower than zero
    And the deficit runs from the revenue mark to the end of the bar

  Scenario Outline: Input a founder might type by mistake is named, not used
    Then "<input>" is refused as <field>

    Examples:
      | input        | field   |
      |              | tuition |
      | -500         | tuition |
      | ten thousand | tuition |
      | 5000000      | tuition |
      | 12.5         | students |
      | -3           | students |
