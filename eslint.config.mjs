import nextPlugin from 'eslint-config-next';

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', '.cache/**']
  },
  ...nextPlugin,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    }
  }
];

export default config;
