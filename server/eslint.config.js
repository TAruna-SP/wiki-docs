// Server workspace ESLint config — extends the shared root config and adds
// Jest globals for test files.
import globals from 'globals';
import root from '../eslint.config.js';

export default [
  ...root,
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
];
