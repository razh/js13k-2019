module.exports = {
  extends: [ 'eslint:recommended', 'plugin:prettier/recommended',],
  env: {
    browser: true,
    es6: true,
  },
  plugins: ['prettier', 'simple-import-sort'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    'func-style': ['error', 'expression'],
    'object-shorthand': ['error', 'always'],
    'simple-import-sort/sort': 'error',
  },
};
