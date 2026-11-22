export default {
  import: ['features/support/*.mjs', 'features/step_definitions/*.mjs'],
  paths: ['features/**/*.feature'],
  format: ['progress', 'summary'],
  strict: true,
};
