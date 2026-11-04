Feature: The durability snapshot

  A founder enters full tuition, enrollment, free seats and an average
  discount, and sees at once what they actually collect and what is left for
  program once facilities and staffing are paid. It is a one-year snapshot,
  not a budget. SchoolStack suggests 15% as a ceiling for facilities; around
  60% for staffing is a starting point that moves with each school's model.

  These steps call js/budget-calculator.js, the file the page runs, so the
  sentences below are checked against the shipped arithmetic.

  Scenario Outline: Free seats and discounts come off before anything is allocated
    Given tuition of <tuition> for <students> students
    And <free> students attend free and paying students average a <discount>% discount
    Then annual revenue is <collected>
    And <given> is given up against full tuition

    Examples:
      | tuition | students | free | discount | collected | given    |
      | 10000   | 50       | 2    | 10       | $432,000  | $68,000  |
      | 10000   | 50       | 0    | 0        | $500,000  | $0       |
      | 10000   | 50       | 50   | 0        | $0        | $500,000 |
      | 12000   | 40       | 4    | 25       | $324,000  | $156,000 |

  Scenario Outline: Collected tuition and its three parts
    Given tuition of <tuition> for <students> students
    And every student pays full tuition
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

  Scenario: Facilities above the 15% ceiling are flagged
    Given 16% for facilities and 60% for staffing
    Then facilities are flagged as above the ceiling

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
      | 51           | free seats |
