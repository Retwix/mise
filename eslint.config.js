import mantine from 'eslint-config-mantine';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// @ts-check
export default defineConfig(
  tseslint.configs.recommended,
  ...mantine,
  { ignores: ['**/*.{mjs,cjs,js,d.ts,d.mts}'] },
  {
    files: ['**/*.story.tsx'],
    rules: { 'no-console': 'off' },
  },
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: process.cwd(),
        project: ['./tsconfig.json'],
      },
    },
    extends: ['airbnb', 'airbnb-typescript', 'prettier'],
    rules: {
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/media-has-caption': 'off',
      'jsx-a11y/control-has-associated-label': 'off',
      'react/react-in-jsx-scope': 'off',
      'spaced-comment': ['error', 'always', { markers: ['?', '!'] }],
      'no-empty-pattern': ['error', { allowObjectPatternsAsParameters: true }],
      'no-case-declarations': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      'import/no-cycle': 'off',
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
      'linebreak-style': 'off',
      'global-require': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-syntax': 'off',
      'func-names': 'off',
      'no-continue': 'off',
      'no-param-reassign': 'off',
      'no-plusplus': 'off',
      'no-nested-ternary': 'error',
      'use-isnan': 'error',
      'react/jsx-filename-extension': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'off',
      'react/require-default-props': 'off',
      'react/prop-types': 'off',
      'react/no-array-index-key': 'off',
      'react/prefer-stateless-function': 'off',
      'react/function-component-definition': 'off',
      'react/jsx-props-no-spreading': 'off',
      '@typescript-eslint/indent': 'off',
      // Disabling this rule because it makes the hooks in react components
      // cleaner when they can all be grouped together, even if they depend on
      // helper functions defined around them
      '@typescript-eslint/no-use-before-define': 'off',
      // https://typescript-eslint.io/rules/naming-convention/#enforce-the-codebase-follows-eslints-camelcase-conventions
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variable',
          types: ['boolean'],
          format: ['PascalCase', 'UPPER_CASE'],
          prefix: [
            'IS_',
            'is',
            'are',
            'was',
            'were',
            'should',
            'has',
            'have',
            'can',
            'did',
            'will',
            'must',
            'does',
            'do',
            'with',
            'no',
            'could',
            'might',
          ],
        },
        {
          selector: ['variable', 'function'],
          format: ['strictCamelCase', 'StrictPascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        {
          selector: 'variable',
          modifiers: ['destructured'],
          format: null,
        },
      ],
      '@typescript-eslint/semi': 'off',
      'no-underscore-dangle': 'off',
      'no-constant-condition': 'warn',
      'import/extensions': [
        'error',
        'ignorePackages',
        { js: 'never', jsx: 'never', ts: 'never', tsx: 'never' },
      ],
      'import/prefer-default-export': 'off',
      'import/no-extraneous-dependencies': ['off', { packageDir: ['config/*.js'] }],
      'no-console': ['warn', { allow: ['warn', 'error', 'assert'] }],
      'prettier/prettier': [
        'error',
        {
          arrowParens: 'avoid',
          bracketSpacing: true,
          bracketSameLine: false,
          printWidth: 100,
          tabWidth: 2,
          semi: true,
          singleQuote: true,
          trailingComma: 'all',
          endOfLine: 'auto',
        },
      ],
      'react/destructuring-assignment': ['error', 'always'],
    },
  }
);
