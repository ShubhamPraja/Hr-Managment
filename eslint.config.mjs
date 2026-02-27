import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
]);
