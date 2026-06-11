import tseslint from 'typescript-eslint'

// oxlint がコード品質ルールを担うため、ESLint は命名規則（typescript-eslint/naming-convention）の責務に限定する
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/.react-router/**',
      '**/migrations/**',
      'supabase/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        // 引用符が必要なプロパティ（'unread-digestion' 等）は検査対象外
        {
          selector: ['objectLiteralProperty', 'typeProperty'],
          format: null,
          modifiers: ['requiresQuotes'],
        },
        // 分割代入で外部の名前をそのまま束縛する変数（snake_case 等）は検査対象外
        { selector: 'variable', modifiers: ['destructured'], format: null },
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        {
          selector: 'variable',
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
        },
        { selector: 'typeLike', format: ['PascalCase'] },
        {
          selector: 'objectLiteralProperty',
          format: ['UPPER_CASE', 'camelCase', 'snake_case', 'PascalCase'],
        },
        { selector: 'typeProperty', format: ['PascalCase', 'camelCase', 'UPPER_CASE'] },
      ],
    },
  },
)
