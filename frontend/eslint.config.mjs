// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
    {
        ignores: ['**/*', '!src/**'],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.{js,jsx,ts,tsx}'],
        rules: {
            'no-undef': 'off',
            'no-empty': 'warn',
            'indent': ['warn', 2],
            'quotes': ['warn', 'double'],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-unused-expressions': 'warn',
        },
    },
];
