/**
 * Cucumber configuration.
 *
 * `import` rather than `require`: everything in this repo is ESM, including
 * the tools/lib modules the steps share with the verify scripts.
 *
 * The progress formatter writes one character per step, which reads correctly
 * in a CI log with no TTY. The summary at the end names any failure.
 */

export default {
  import: ['features/support/*.mjs', 'features/step_definitions/*.mjs'],
  paths: ['features/**/*.feature'],
  format: ['progress', 'summary'],
  // A Gherkin step with no definition is a silently skipped assertion. Fail.
  strict: true,
};
