/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended', 
    '@vue/typescript/recommended',
    'plugin:vue/vue3-recommended',
    'plugin:vue-scoped-css/base',
    '@electron-toolkit',
    '@electron-toolkit/eslint-config-ts/eslint-recommended',
    'plugin:prettier/recommended'
  ],
  env: {
    browser: true,
    node: true,
    jest: true,
    es6: true
  },
  globals: {
    defineProps: 'readonly',
    defineEmits: 'readonly'
  },
  plugins: ['vue', '@typescript-eslint', 'simple-import-sort'],
  parserOptions: {
    parser: '@typescript-eslint/parser',
    sourceType: 'module',
    allowImportExportEverywhere: true,
    ecmaFeatures: {
      jsx: true
    }
  },
  settings: {
    'import/extensions': ['.js', '.jsx', '.ts', '.tsx']
  },
  rules: {
    'vue/require-default-prop': 'off',
    'vue/multi-word-component-names': 'off',
    'no-underscore-dangle': 'off',
    'no-nested-ternary': 'off',
    'no-console': 'off',
    'no-await-in-loop': 'off',
    'no-continue': 'off',
    'no-restricted-syntax': 'off',
    'no-return-assign': 'off',
    'no-unused-expressions': 'off',
    'no-return-await': 'off',
    'no-plusplus': 'off',
    'no-param-reassign': 'off',
    'no-shadow': 'off',
    'guard-for-in': 'off',
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/prefer-default-export': 'off',
    'import/first': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'vue/first-attribute-linebreak': 0,
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],
    'no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/ban-types': 'off',
    'class-methods-use-this': 'off',
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error'
  },
  overrides: [
    {
      files: ['*.vue'],
      rules: {
        'vue/component-name-in-template-casing': [2, 'kebab-case'],
        'vue/require-default-prop': 0,
        'vue/multi-word-component-names': 0,
        'vue/no-reserved-props': 0,
        'vue/no-v-html': 0,
        'vue-scoped-css/enforce-style-type': [
          'error',
          {
            allows: ['scoped']
          }
        ],
        '@typescript-eslint/explicit-function-return-type': 'off',
        // 需要行尾分号
        'prettier/prettier': ['error', { endOfLine: 'auto' }]
      }
    },
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        'max-classes-per-file': 'off',
        'no-await-in-loop': 'off',
        'dot-notation': 'off',
        'constructor-super': 'off',
        'getter-return': 'off',
        'no-const-assign': 'off',
        'no-dupe-args': 'off',
        'no-dupe-class-members': 'off',
        'no-dupe-keys': 'off',
        'no-func-assign': 'off',
        'no-import-assign': 'off',
        'no-new-symbol': 'off',
        'no-obj-calls': 'off',
        'no-redeclare': 'off',
        'no-setter-return': 'off',
        'no-this-before-super': 'off',
        'no-undef': 'off',
        'no-unreachable': 'off',
        'no-unsafe-negation': 'off',
        'no-var': 'error',
        'prefer-const': 'error',
        'prefer-rest-params': 'error',
        'prefer-spread': 'error',
        'valid-typeof': 'off',
        'consistent-return': 'off',
        'no-promise-executor-return': 'off',
        'prefer-promise-reject-errors': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off'
      }
    }
  ]
};
