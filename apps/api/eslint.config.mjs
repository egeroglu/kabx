// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    // eslint.config.mjs ve diğer .mjs dosyaları tsconfig kapsamında değil;
    // tipli lint kuralları onlara uygulanamaz.
    ignores: ['dist/**', 'node_modules/**', 'src/db/migrations/**', 'openapi.json', '**/*.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Fastify/Nest kancaları void dönen async fonksiyon bekliyor.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    // BullMQ'nun Processor sözleşmesi Promise döndürmeyi şart koşar; bir
    // işlemci henüz await kullanmıyor olsa da `async` kalmalı.
    files: ['src/queue/processors/**/*.ts'],
    rules: { '@typescript-eslint/require-await': 'off' },
  },
  {
    files: ['test/**/*.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  prettier,
);
