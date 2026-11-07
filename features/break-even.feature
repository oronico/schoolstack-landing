Feature: The break-even enrollment

  A founder enters what a year of running the school costs, debt service
  included, and the tuition or per-pupil funding each student brings in. The
  page answers with the enrollment that covers the year: the budget's driver
  number. One-time purchases such as a build-out stay out, the same basis
  SchoolStack Budget uses for break-even.

  These steps call js/budget-calculator.js, the file the page runs.

  Scenario Outline: Students needed to cover a year
    Given yearly expenses of <expenses> and <per_student> per student
    Then the school needs <students> to break even
    And at that enrollment it collects <collected>

    Examples:
      | expenses | per_student | students     | collected  |
      | 600000   | 10000       | 60 students  | $600,000   |
      | 600001   | 10000       | 61 students  | $610,000   |
      | 1000000  | 12345.67    | 82 students  | $1,012,345 |
      | 0        | 10000       | 0 students   | $0         |
      | 0.01     | 10000       | 1 student    | $10,000    |
      | 50000000 | 1           | 50,000,000 students | $50,000,000 |

  Scenario: A remainder rounds up, so the count always covers the year
    Given yearly expenses of 600001 and 10000 per student
    Then one student fewer would fall short of the expenses

  Scenario Outline: Input a founder might type by mistake is named, not used
    Then "<input>" is refused as <field>

    Examples:
      | input        | field       |
      |              | expenses    |
      | -500         | expenses    |
      | six hundred  | expenses    |
      | 50000001     | expenses    |
      | 0            | per-student |
      | 0.50         | per-student |
      | 1000001      | per-student |
