# タスク完了時のチェックリスト

## リファクタリング時の必須実行項目
リファクタリングを行った際は、必ず以下のコマンドを実行すること:

1. **Lint実行**
   ```bash
   pnpm run lint
   ```
   - Biome CI実行
   - TypeScript型チェック（tsc --noEmit）

2. **フォーマット実行**
   ```bash
   pnpm run check:fix
   ```
   - Biomeによるコード修正（--unsafe含む）

3. **テスト実行**
   変更内容に応じて適切なテストを実行:
   
   - **ドメイン層変更時**:
     ```bash
     pnpm run test:domain
     ```
   
   - **API層変更時**:
     ```bash
     pnpm run test:api
     ```
   
   - **フロントエンド変更時**:
     ```bash
     pnpm run test:client
     ```
   
   - **Storybookコンポーネント変更時**:
     ```bash
     pnpm run test-storybook
     ```
   
   - **E2Eテストが必要な場合**:
     ```bash
     pnpm run e2e
     ```

## コミット前のチェック項目
- [ ] 全てのlintエラーが解消されている
- [ ] 全てのテストがパスしている
- [ ] 型エラーが存在しない
- [ ] コミットメッセージがConventional Commitsに準拠している
- [ ] 不要なconsole.logやデバッグコードが残っていない
- [ ] 環境変数やシークレットがコードに直接書かれていない

## プルリクエスト前のチェック項目
- [ ] ビルドが成功する (`pnpm run build`)
- [ ] 全てのテスト層でテストがパスしている
- [ ] コードレビュー用の適切な説明がある
- [ ] 破壊的変更がある場合は明示されている
- [ ] 必要に応じてドキュメントが更新されている

## データベース変更時の追加チェック
- [ ] Prismaマイグレーションファイルが正しく生成されている
- [ ] マイグレーションが適用できる (`pnpm run db:migrate`)
- [ ] シードデータが更新されている（必要な場合）
- [ ] 型生成が正しく行われている (`pnpm run supabase:db:type-gen`)
