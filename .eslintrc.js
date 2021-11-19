module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'airbnb-base',
    'airbnb-typescript/base',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/explicit-module-boundary-types': ['off'],
    '@typescript-eslint/no-explicit-any': ['error'],
    semi: ['error'],
    'func-names': ['off'],
    'import/no-extraneous-dependencies': ['off'],
    '@typescript-eslint/ban-types': ['off'],
    '@typescript-eslint/no-explicit-any': ['off'],
  },
};
