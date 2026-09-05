Feature: Structural facts no other check derives

  verify-render asserts a fixed list of ids exists. That catches a page which
  failed to load; it does not catch a NEW anchor pointing at an id nobody
  wrote, because the list is hardcoded rather than read off the links.

  The font rules guard a failure with history: the OG card once shipped in
  DejaVu Sans because the render sandbox could not reach Google Fonts and
  nothing said so. The same drift between fonts/fonts.css and the custom
  properties in :root would paint the whole site in Trebuchet MS, with every
  request answering 200 and every other check green.

  Background:
    Given the published page

  Scenario: Every in-page link scrolls somewhere
    Then no anchor points at an id that does not exist

  Scenario: Every new tab is opened safely
    Then no link opens a new tab without rel="noopener"

  Scenario: The page asks only for fonts that fonts.css serves
    Then every declared font family has a matching @font-face

  Scenario Outline: The brand faces are the ones actually painted
    Asked of the browser rather than the file, and asked as "which face got
    used" rather than "could this text be painted". document.fonts.check()
    answers the second question, so it returned true for a family name that
    did not exist.

    Given the page is loaded at <width> pixels wide
    Then the <role> face is Quicksand or Nunito, loaded, and distinct from the fallback

    Examples:
      | width | role    |
      | 1440  | display |
      | 1440  | body    |
      | 390   | display |
      | 390   | body    |
